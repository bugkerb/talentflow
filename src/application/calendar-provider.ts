import type { CalendarEvent, CalendarEventInput, CalendarProvider } from "./interview-ports";
import { AppError } from "@/server/errors";

type GoogleEventResponse = { id?: string; hangoutLink?: string; conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> } };

/** Server-side Google Calendar adapter. It never fabricates an event when configuration or API response is invalid. */
export class GoogleCalendarProvider implements CalendarProvider {
  private readonly accessToken: string;
  private readonly calendarId: string;
  private readonly baseUrl = "https://www.googleapis.com/calendar/v3";

  constructor(config: { accessToken?: string; calendarId?: string } = {}) {
    this.accessToken = config.accessToken ?? process.env.GOOGLE_CALENDAR_ACCESS_TOKEN ?? "";
    this.calendarId = config.calendarId ?? process.env.GOOGLE_CALENDAR_ID ?? "";
    if (!this.accessToken || !this.calendarId) throw new AppError("CALENDAR_CONFIGURATION_ERROR", "Google Calendar is not configured. Set GOOGLE_CALENDAR_ACCESS_TOKEN and GOOGLE_CALENDAR_ID.", 503);
  }

  async createEvent(input: CalendarEventInput, idempotencyKey: string): Promise<CalendarEvent> {
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
    await this.requestEvent(eventId, "PATCH", { description: [input.description, input.additionalQuestions].filter(Boolean).join("\n\n"), start: { dateTime: input.startsAt, timeZone: input.timezone }, end: { dateTime: input.endsAt, timeZone: input.timezone } });
  }

  async cancelEvent(eventId: string): Promise<void> { await this.requestEvent(eventId, "DELETE"); }

  private async requestEvent(eventId: string, method: "PATCH" | "DELETE", body?: unknown): Promise<void> {
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
}
