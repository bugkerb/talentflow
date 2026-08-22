import type { CalendarEvent, CalendarEventInput, CalendarEventSummary, CalendarProvider } from "./interview-ports";
import { AppError } from "@/server/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptGoogleToken } from "@/server/google-oauth";

type GoogleEventResponse = { id?: string; summary?: string; status?: string; htmlLink?: string; start?: { dateTime?: string; date?: string; timeZone?: string }; end?: { dateTime?: string; date?: string; timeZone?: string }; hangoutLink?: string; conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> } };

/** Server-side Google Calendar adapter. It never fabricates an event when configuration or API response is invalid. */
export class GoogleCalendarProvider implements CalendarProvider {
  private accessToken: string;
  private readonly refreshToken: string;
  private readonly calendarId: string;
  private readonly baseUrl = "https://www.googleapis.com/calendar/v3";

  constructor(config: { accessToken?: string; refreshToken?: string; calendarId?: string } = {}) {
    this.accessToken = config.accessToken ?? process.env.GOOGLE_CALENDAR_ACCESS_TOKEN ?? "";
    this.refreshToken = config.refreshToken ?? "";
    this.calendarId = config.calendarId ?? process.env.GOOGLE_CALENDAR_ID ?? "";
    if (!this.accessToken || !this.calendarId) throw new AppError("CALENDAR_CONFIGURATION_ERROR", "Google Calendar is not configured. Set GOOGLE_CALENDAR_ACCESS_TOKEN and GOOGLE_CALENDAR_ID.", 503);
  }

  static async fromSupabase(client: SupabaseClient, ownerId: string): Promise<GoogleCalendarProvider> {
    const { data, error } = await client.from("integration_credentials").select("calendar_id,refresh_token_ciphertext").eq("owner_id", ownerId).eq("provider", "google_calendar").maybeSingle();
    if (error || !data) throw new AppError("CALENDAR_CONFIGURATION_ERROR", "Google Calendar is not connected.", 503);
    return new GoogleCalendarProvider({ calendarId: data.calendar_id, refreshToken: decryptGoogleToken(data.refresh_token_ciphertext) });
  }

  async createEvent(input: CalendarEventInput, idempotencyKey: string): Promise<CalendarEvent> {
    await this.ensureAccessToken();
    const response = await fetch(`${this.baseUrl}/calendars/${encodeURIComponent(this.calendarId)}/events?conferenceDataVersion=1`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        summary: input.interviewType,
        description: [input.description, input.additionalQuestions].filter(Boolean).join("\n\n"),
        start: { dateTime: input.startsAt, timeZone: input.timezone },
        end: { dateTime: input.endsAt, timeZone: input.timezone },
        conferenceData: { createRequest: { requestId: idempotencyKey, conferenceSolutionKey: { type: "hangoutsMeet" } } }
      })
    });
    if (!response.ok) throw new AppError("CALENDAR_PROVIDER_ERROR", `Google Calendar rejected the event (${response.status})`, 502);
    const data = await response.json() as GoogleEventResponse;
    const meetUrl = data.hangoutLink ?? data.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri ?? null;
    if (!data.id) throw new AppError("CALENDAR_PROVIDER_ERROR", "Google Calendar returned no event id", 502);
    return { eventId: data.id, meetUrl };
  }

  async updateEvent(eventId: string, input: CalendarEventInput): Promise<void> {
    await this.ensureAccessToken();
    await this.requestEvent(eventId, "PATCH", { description: [input.description, input.additionalQuestions].filter(Boolean).join("\n\n"), start: { dateTime: input.startsAt, timeZone: input.timezone }, end: { dateTime: input.endsAt, timeZone: input.timezone } });
  }

  async cancelEvent(eventId: string): Promise<void> { await this.requestEvent(eventId, "DELETE"); }

  async listEvents(range: { timeMin: string; timeMax: string }): Promise<CalendarEventSummary[]> {
    await this.ensureAccessToken();
    const params = new URLSearchParams({ timeMin: range.timeMin, timeMax: range.timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "250" });
    const response = await fetch(`${this.baseUrl}/calendars/${encodeURIComponent(this.calendarId)}/events?${params.toString()}`, { headers: { authorization: `Bearer ${this.accessToken}` }, cache: "no-store" });
    if (!response.ok) throw new AppError("CALENDAR_PROVIDER_ERROR", `Google Calendar rejected event listing (${response.status})`, 502);
    const payload = await response.json() as { items?: GoogleEventResponse[] };
    return (payload.items ?? []).filter((event) => event.id && event.start && event.end).map((event) => ({ eventId: event.id!, title: event.summary?.trim() || "ไม่มีชื่อกิจกรรม", startsAt: event.start!.dateTime ?? `${event.start!.date}T00:00:00.000Z`, endsAt: event.end!.dateTime ?? `${event.end!.date}T00:00:00.000Z`, timezone: event.start!.timeZone ?? "UTC", status: event.status ?? "confirmed", htmlUrl: event.htmlLink ?? null }));
  }

  private async ensureAccessToken(): Promise<void> {
    if (this.accessToken && !this.refreshToken) return;
    const env = process.env;
    if (!this.refreshToken || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new AppError("CALENDAR_CONFIGURATION_ERROR", "Google Calendar OAuth is not configured.", 503);
    const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: this.refreshToken, grant_type: "refresh_token" }), cache: "no-store" });
    if (!response.ok) throw new AppError("CALENDAR_PROVIDER_ERROR", "Google Calendar token refresh failed.", 502);
    const data = await response.json() as { access_token?: string };
    if (!data.access_token) throw new AppError("CALENDAR_PROVIDER_ERROR", "Google Calendar returned no access token.", 502);
    this.accessToken = data.access_token;
  }

  private async requestEvent(eventId: string, method: "PATCH" | "DELETE", body?: unknown): Promise<void> {
    await this.ensureAccessToken();
    const response = await fetch(`${this.baseUrl}/calendars/${encodeURIComponent(this.calendarId)}/events/${encodeURIComponent(eventId)}`, { method, headers: { authorization: `Bearer ${this.accessToken}`, ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok && response.status !== 404) throw new AppError("CALENDAR_PROVIDER_ERROR", `Google Calendar rejected the ${method.toLowerCase()} (${response.status})`, 502);
  }
}

export class InMemoryCalendarProvider implements CalendarProvider {
  readonly calls: CalendarEventInput[] = [];
  private readonly events = new Map<string, CalendarEvent>();

  async createEvent(input: CalendarEventInput, idempotencyKey: string): Promise<CalendarEvent> {
    const existing = this.events.get(idempotencyKey);
    if (existing) return { ...existing };
    this.calls.push({ ...input });
    const event = { eventId: `test-calendar-${input.id}`, meetUrl: null };
    this.events.set(idempotencyKey, event);
    return { ...event };
  }
  async updateEvent(): Promise<void> {}
  async cancelEvent(): Promise<void> {}
  async listEvents(): Promise<CalendarEventSummary[]> { return []; }
}
