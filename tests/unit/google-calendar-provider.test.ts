import { describe, expect, it, vi } from "vitest";
import { GoogleCalendarProvider } from "@/application/calendar-provider";

describe("GoogleCalendarProvider", () => {
  it("fails explicitly when production credentials are absent", () => {
    expect(() => new GoogleCalendarProvider({ accessToken: "", calendarId: "" })).toThrow(/GOOGLE_CALENDAR_ACCESS_TOKEN/);
  });

  it("accepts an OAuth refresh token without an access token", () => {
    expect(() => new GoogleCalendarProvider({ refreshToken: "encrypted-refresh-token", calendarId: "primary" })).not.toThrow();
  });

  it("creates a real Google event with combined screening context and idempotency request id", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "google-event-1", hangoutLink: "https://meet.google.com/abc-defg-hij" }), { status: 200 }));
    const provider = new GoogleCalendarProvider({ accessToken: "token", calendarId: "primary" });
    const result = await provider.createEvent({ id: "i-1", applicationId: "a-1", interviewType: "technical", startsAt: "2026-08-24T03:00:00.000Z", endsAt: "2026-08-24T03:30:00.000Z", timezone: "Asia/Bangkok", interviewerId: "p-1", description: "Prescreen: explain an outage.", additionalQuestions: "Ask about system design." }, "idem-1");
    expect(result).toEqual({ eventId: "google-event-1", meetUrl: "https://meet.google.com/abc-defg-hij" });
    const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(request.description).toContain("Prescreen");
    expect(request.description).toContain("system design");
    expect(request.conferenceData.createRequest.requestId).toBe("idem-1");
    fetchMock.mockRestore();
  });

  it("lists real calendar events within the requested range", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ items: [{ id: "event-1", summary: "ทีมสัมภาษณ์", status: "confirmed", htmlLink: "https://calendar.google.com/event-1", start: { dateTime: "2026-08-24T03:00:00.000Z", timeZone: "Asia/Bangkok" }, end: { dateTime: "2026-08-24T03:30:00.000Z", timeZone: "Asia/Bangkok" } }] }), { status: 200 }));
    const provider = new GoogleCalendarProvider({ accessToken: "token", calendarId: "primary" });
    await expect(provider.listEvents({ timeMin: "2026-08-24T00:00:00.000Z", timeMax: "2026-08-25T00:00:00.000Z" })).resolves.toEqual([{ eventId: "event-1", title: "ทีมสัมภาษณ์", startsAt: "2026-08-24T03:00:00.000Z", endsAt: "2026-08-24T03:30:00.000Z", timezone: "Asia/Bangkok", status: "confirmed", htmlUrl: "https://calendar.google.com/event-1" }]);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("singleEvents=true");
    fetchMock.mockRestore();
  });
});
