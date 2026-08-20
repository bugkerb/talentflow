import type { CalendarEvent, CalendarEventInput, CalendarProvider } from "./interview-ports";

export class InMemoryCalendarProvider implements CalendarProvider {
  readonly calls: CalendarEventInput[] = [];
  private readonly events = new Map<string, CalendarEvent>();

  async createEvent(input: CalendarEventInput, idempotencyKey: string): Promise<CalendarEvent> {
    const existing = this.events.get(idempotencyKey);
    if (existing) return { ...existing };
    this.calls.push({ ...input });
    const event = { eventId: `calendar-${input.id}`, meetUrl: `https://meet.example.test/${input.id}` };
    this.events.set(idempotencyKey, event);
    return { ...event };
  }
}
