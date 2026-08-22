import { describe, expect, it } from "vitest";
import { InterviewService } from "@/application/interview-service";
import { InMemoryCalendarProvider } from "@/application/calendar-provider";
import { InMemoryInterviewRepository } from "@/application/interview-repository";
import { AppError } from "@/server/errors";

const input = {
  applicationId: "00000000-0000-0000-0000-000000000030",
  interviewType: "technical",
  startsAt: "2026-08-24T03:00:00.000Z",
  endsAt: "2026-08-24T03:30:00.000Z",
  timezone: "Asia/Bangkok",
  interviewerId: "00000000-0000-0000-0000-000000000001",
  description: "Prescreen questions: explain a production incident.",
  additionalQuestions: "Ask about system design ownership."
};

describe("InterviewService", () => {
  it("schedules an interview with the requested scheduling fields", async () => {
    const result = await new InterviewService(new InMemoryInterviewRepository(), new InMemoryCalendarProvider()).schedule(input, "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000080", "schedule-1");

    expect(result).toMatchObject({
      id: "00000000-0000-0000-0000-000000000080",
      applicationId: input.applicationId,
      interviewType: "technical",
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      timezone: input.timezone,
      interviewerId: input.interviewerId,
      additionalQuestions: input.additionalQuestions,
      status: "scheduled",
      version: 1,
      createdBy: "00000000-0000-0000-0000-000000000001"
    });
  });

  it("replays the same idempotency request without a second calendar side effect", async () => {
    const provider = new InMemoryCalendarProvider();
    const service = new InterviewService(new InMemoryInterviewRepository(), provider);
    const first = await service.schedule(input, "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000080", "schedule-retry");
    const replay = await service.schedule({ ...input }, "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000099", "schedule-retry");

    expect(replay).toEqual(first);
    expect(provider.calls).toHaveLength(1);
    await expect(service.schedule({ ...input, interviewType: "panel" }, "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000099", "schedule-retry")).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("allows at most one concurrent booking for an interviewer and returns safe alternatives", async () => {
    const repository = new InMemoryInterviewRepository();
    const service = new InterviewService(repository, new InMemoryCalendarProvider());
    const attempts = await Promise.allSettled([
      service.schedule(input, "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000080", "schedule-a"),
      service.schedule({ ...input }, "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000081", "schedule-b")
    ]);
    const failures = attempts.filter((attempt): attempt is PromiseRejectedResult => attempt.status === "rejected");

    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].reason).toMatchObject({ code: "INTERVIEW_CONFLICT", details: { alternatives: expect.any(Array) } });
    expect(failures[0].reason.details).not.toHaveProperty("applicationId");
  });

  it("reschedules and cancels with optimistic locking and immutable activity", async () => {
    const repository = new InMemoryInterviewRepository();
    const service = new InterviewService(repository, new InMemoryCalendarProvider());
    const scheduled = await service.schedule(input, "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000080", "schedule-audit");
    const rescheduled = await service.reschedule({ interviewId: scheduled.id, startsAt: "2026-08-24T04:00:00.000Z", endsAt: "2026-08-24T04:30:00.000Z", reason: "Interviewer requested a later slot" }, "00000000-0000-0000-0000-000000000002", 1);
    const cancelled = await service.cancel({ interviewId: scheduled.id, reason: "Candidate withdrew" }, "00000000-0000-0000-0000-000000000002", 2);

    expect(rescheduled).toMatchObject({ version: 2, updatedBy: "00000000-0000-0000-0000-000000000002" });
    expect(cancelled).toMatchObject({ status: "cancelled", version: 3, updatedBy: "00000000-0000-0000-0000-000000000002", cancelledBy: "00000000-0000-0000-0000-000000000002" });
    expect(repository.activities.map((event) => event.action)).toEqual(["scheduled", "rescheduled", "cancelled"]);
    await expect(service.reschedule({ interviewId: scheduled.id, startsAt: input.startsAt, endsAt: input.endsAt }, "00000000-0000-0000-0000-000000000002", 2)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("retries a failed calendar provider with the original idempotency key", async () => {
    let failures = 1;
    const keys: string[] = [];
    const provider = { async createEvent(_event: unknown, key: string) { keys.push(key); if (failures-- > 0) throw new Error("temporary outage"); return { eventId: "calendar-80", meetUrl: null }; }, async updateEvent() {}, async cancelEvent() {}, async listEvents() { return []; } };
    const service = new InterviewService(new InMemoryInterviewRepository(), provider);

    await expect(service.schedule(input, "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000080", "calendar-retry")).rejects.toMatchObject({ code: "CALENDAR_PROVIDER_ERROR" });
    const result = await service.retryProvider("00000000-0000-0000-0000-000000000080");

    expect(result.providerStatus).toBe("synced");
    expect(keys).toEqual(["calendar-retry", "calendar-retry"]);
  });

  it("rejects invalid time ranges and missing idempotency keys", async () => {
    const service = new InterviewService(new InMemoryInterviewRepository(), new InMemoryCalendarProvider());
    await expect(service.retryProvider("not-a-uuid")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(service.schedule(input, "not-a-uuid", "00000000-0000-0000-0000-000000000080", "schedule-invalid")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(service.schedule({ ...input, endsAt: input.startsAt }, "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000080", "schedule-invalid")).rejects.toThrow();
    await expect(service.reschedule({ interviewId: "00000000-0000-0000-0000-000000000080", startsAt: input.startsAt, endsAt: input.startsAt }, "00000000-0000-0000-0000-000000000001", 1)).rejects.toThrow();
    await expect(service.schedule(input, "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000080", " ")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("maps missing interviews and repository races to stable errors", async () => {
    const repository = new InMemoryInterviewRepository();
    const service = new InterviewService(repository, new InMemoryCalendarProvider());
    const missingId = "00000000-0000-0000-0000-000000000099";
    await expect(service.retryProvider(missingId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.reschedule({ interviewId: missingId, startsAt: input.startsAt, endsAt: input.endsAt }, "00000000-0000-0000-0000-000000000001", 1)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.cancel({ interviewId: missingId, reason: "No longer needed" }, "00000000-0000-0000-0000-000000000001", 1)).rejects.toMatchObject({ code: "NOT_FOUND" });

    const scheduled = await service.schedule(input, "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000080", "race-a");
    const rescheduleRace = new InMemoryInterviewRepository();
    await new InterviewService(rescheduleRace, new InMemoryCalendarProvider()).schedule({ ...input, startsAt: "2026-08-24T05:00:00.000Z", endsAt: "2026-08-24T05:30:00.000Z" }, "00000000-0000-0000-0000-000000000001", scheduled.id, "race-b");
    rescheduleRace.reschedule = async () => null;
    const cancelRace = new InMemoryInterviewRepository();
    await new InterviewService(cancelRace, new InMemoryCalendarProvider()).schedule({ ...input, startsAt: "2026-08-24T06:00:00.000Z", endsAt: "2026-08-24T06:30:00.000Z" }, "00000000-0000-0000-0000-000000000001", scheduled.id, "race-c");
    cancelRace.cancel = async () => null;
    await expect(new InterviewService(rescheduleRace, new InMemoryCalendarProvider()).reschedule({ interviewId: scheduled.id, startsAt: "2026-08-24T04:00:00.000Z", endsAt: "2026-08-24T04:30:00.000Z" }, "00000000-0000-0000-0000-000000000001", 1)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(new InterviewService(cancelRace, new InMemoryCalendarProvider()).cancel({ interviewId: scheduled.id, reason: "Race" }, "00000000-0000-0000-0000-000000000001", 1)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(new InterviewService(repository, new InMemoryCalendarProvider()).cancel({ interviewId: scheduled.id, reason: "Already changed" }, "00000000-0000-0000-0000-000000000001", 2)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("preserves not-found errors when provider persistence loses the interview", async () => {
    const repository = new InMemoryInterviewRepository();
    repository.recordProviderSuccess = async () => null;
    await expect(new InterviewService(repository, new InMemoryCalendarProvider()).schedule(input, "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000080", "provider-race")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("skips provider creation for an already synced interview", async () => {
    const provider = new InMemoryCalendarProvider();
    const repository = new InMemoryInterviewRepository();
    const service = new InterviewService(repository, provider);
    const scheduled = await service.schedule(input, "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000080", "synced-replay");
    const synced = { ...scheduled, providerStatus: "synced" as const };
    repository.findById = async () => synced;

    expect(await service.retryProvider(scheduled.id)).toEqual(synced);
    expect(provider.calls).toHaveLength(1);
  });

  it("updates and cancels the external calendar event when one exists", async () => {
    const calls: string[] = [];
    const provider = {
      async createEvent() { return { eventId: "calendar-81", meetUrl: "https://meet.example/81" }; },
      async updateEvent(eventId: string) { calls.push(`update:${eventId}`); },
      async cancelEvent(eventId: string) { calls.push(`cancel:${eventId}`); },
      async listEvents() { return []; }
    };
    const service = new InterviewService(new InMemoryInterviewRepository(), provider);
    const scheduled = await service.schedule(input, "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000081", "calendar-events");
    const repository = new InMemoryInterviewRepository();
    const serviceWithEvent = new InterviewService(repository, provider);
    const withEvent = await serviceWithEvent.schedule({ ...input, applicationId: scheduled.applicationId }, "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000082", "calendar-events-existing");
    const originalFindById = repository.findById.bind(repository);
    repository.findById = async (id) => {
      const current = await originalFindById(id);
      return current ? { ...current, googleEventId: "calendar-existing", providerStatus: "synced" } : null;
    };

    await serviceWithEvent.reschedule({ interviewId: withEvent.id, startsAt: "2026-08-24T04:00:00.000Z", endsAt: "2026-08-24T04:30:00.000Z", reason: "Move" }, "00000000-0000-0000-0000-000000000001", 1);
    await serviceWithEvent.cancel({ interviewId: withEvent.id, reason: "Cancelled" }, "00000000-0000-0000-0000-000000000001", 2);

    expect(calls).toEqual(["update:calendar-existing", "cancel:calendar-existing"]);
  });

  it("preserves provider not-found errors while recording the failed sync", async () => {
    const repository = new InMemoryInterviewRepository();
    const provider = {
      async createEvent() { return { eventId: "calendar-82", meetUrl: null }; },
      async updateEvent() {}, async cancelEvent() {}, async listEvents() { return []; }
    };
    repository.recordProviderSuccess = async () => { throw new AppError("NOT_FOUND", "Interview not found"); };
    const service = new InterviewService(repository, provider);

    await expect(service.schedule(input, "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000083", "provider-not-found")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
