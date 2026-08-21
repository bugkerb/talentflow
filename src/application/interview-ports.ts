export type InterviewStatus = "scheduled" | "cancelled" | "completed";
export type ProviderStatus = "pending" | "synced" | "failed";
export type InterviewRecord = {
  id: string;
  applicationId: string;
  interviewType: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  interviewerId: string;
  additionalQuestions: string;
  status: InterviewStatus;
  version: number;
  idempotencyKey: string;
  createdBy: string;
  updatedBy: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  providerStatus: ProviderStatus;
  googleEventId: string | null;
  googleMeetUrl: string | null;
};
export type InterviewListItem = InterviewRecord & { candidateName: string; jobTitle: string; interviewerName: string };
export type InterviewActivityEvent = {
  id: string;
  interviewId: string;
  action: "scheduled" | "rescheduled" | "cancelled";
  actorId: string;
  reason?: string;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
};
export type CalendarEventInput = Pick<InterviewRecord, "id" | "applicationId" | "interviewType" | "startsAt" | "endsAt" | "timezone" | "interviewerId" | "additionalQuestions">;
export type CalendarEvent = { eventId: string; meetUrl: string | null };

export interface CalendarProvider {
  createEvent(input: CalendarEventInput, idempotencyKey: string): Promise<CalendarEvent>;
}

export interface InterviewRepository {
  list(): Promise<InterviewListItem[]>;
  schedule(interview: InterviewRecord, requestHash: string): Promise<InterviewRecord>;
  findById(id: string): Promise<InterviewRecord | null>;
  reschedule(id: string, expectedVersion: number, startsAt: string, endsAt: string, actorId: string, reason?: string): Promise<InterviewRecord | null>;
  cancel(id: string, expectedVersion: number, actorId: string, reason: string): Promise<InterviewRecord | null>;
  recordProviderSuccess(id: string, event: CalendarEvent): Promise<InterviewRecord | null>;
  recordProviderFailure(id: string): Promise<InterviewRecord | null>;
}
