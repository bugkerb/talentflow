import { AppError } from "@/server/errors";
import type { CalendarEvent, InterviewActivityEvent, InterviewRecord, InterviewRepository } from "./interview-ports";

const overlaps = (leftStart: string, leftEnd: string, rightStart: string, rightEnd: string): boolean => new Date(leftStart).getTime() < new Date(rightEnd).getTime() && new Date(rightStart).getTime() < new Date(leftEnd).getTime();
const clone = (record: InterviewRecord): InterviewRecord => ({ ...record });

export class InMemoryInterviewRepository implements InterviewRepository {
  readonly activities: InterviewActivityEvent[] = [];
  private readonly interviews = new Map<string, InterviewRecord>();
  private readonly requestHashes = new Map<string, string>();
  private lock: Promise<void> = Promise.resolve();

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.lock;
    let release: () => void = () => undefined;
    this.lock = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await operation(); } finally { release(); }
  }

  private conflict(startsAt: string, endsAt: string, interviewerId: string, ignoredId?: string): never {
    const alternatives: string[] = [];
    for (const offsetMinutes of [30, -30, 60, -60, 90, -90]) {
      const duration = new Date(endsAt).getTime() - new Date(startsAt).getTime();
      const candidateStart = new Date(new Date(startsAt).getTime() + offsetMinutes * 60_000);
      const candidateEnd = new Date(candidateStart.getTime() + duration);
      const candidateStartsAt = candidateStart.toISOString();
      const candidateEndsAt = candidateEnd.toISOString();
      const blocked = [...this.interviews.values()].some((interview) => interview.id !== ignoredId && interview.status === "scheduled" && interview.interviewerId === interviewerId && overlaps(candidateStartsAt, candidateEndsAt, interview.startsAt, interview.endsAt));
      if (!blocked) alternatives.push(candidateStartsAt);
      if (alternatives.length === 3) break;
    }
    throw new AppError("INTERVIEW_CONFLICT", "Interview time conflicts with another appointment.", 409, { alternatives });
  }

  async schedule(interview: InterviewRecord, requestHash: string): Promise<InterviewRecord> {
    return this.withLock(async () => {
      const existingHash = this.requestHashes.get(interview.idempotencyKey);
      if (existingHash && existingHash !== requestHash) throw new AppError("IDEMPOTENCY_CONFLICT", "Idempotency key was reused with a different request");
      const existing = [...this.interviews.values()].find((item) => item.idempotencyKey === interview.idempotencyKey);
      if (existing) return clone(existing);
      this.conflictIfNeeded(interview.startsAt, interview.endsAt, interview.interviewerId);
      this.requestHashes.set(interview.idempotencyKey, requestHash);
      this.interviews.set(interview.id, clone(interview));
      this.activities.push({ id: `activity-${this.activities.length + 1}`, interviewId: interview.id, action: "scheduled", actorId: interview.createdBy, startsAt: interview.startsAt, endsAt: interview.endsAt, createdAt: new Date().toISOString() });
      return clone(interview);
    });
  }

  private conflictIfNeeded(startsAt: string, endsAt: string, interviewerId: string, ignoredId?: string): void {
    const conflict = [...this.interviews.values()].some((interview) => interview.id !== ignoredId && interview.status === "scheduled" && interview.interviewerId === interviewerId && overlaps(startsAt, endsAt, interview.startsAt, interview.endsAt));
    if (conflict) this.conflict(startsAt, endsAt, interviewerId, ignoredId);
  }

  async findById(id: string): Promise<InterviewRecord | null> { const interview = this.interviews.get(id); return interview ? clone(interview) : null; }

  async reschedule(id: string, expectedVersion: number, startsAt: string, endsAt: string, actorId: string, reason?: string): Promise<InterviewRecord | null> {
    return this.withLock(async () => {
      const current = this.interviews.get(id);
      if (!current || current.version !== expectedVersion || current.status !== "scheduled") return null;
      this.conflictIfNeeded(startsAt, endsAt, current.interviewerId, id);
      const updated = { ...current, startsAt, endsAt, version: current.version + 1, updatedBy: actorId };
      this.interviews.set(id, updated);
      this.activities.push({ id: `activity-${this.activities.length + 1}`, interviewId: id, action: "rescheduled", actorId, reason, startsAt, endsAt, createdAt: new Date().toISOString() });
      return clone(updated);
    });
  }

  async cancel(id: string, expectedVersion: number, actorId: string, reason: string): Promise<InterviewRecord | null> {
    return this.withLock(async () => {
      const current = this.interviews.get(id);
      if (!current || current.version !== expectedVersion || current.status !== "scheduled") return null;
      const cancelledAt = new Date().toISOString();
      const updated = { ...current, status: "cancelled" as const, version: current.version + 1, updatedBy: actorId, cancelledBy: actorId, cancelledAt };
      this.interviews.set(id, updated);
      this.activities.push({ id: `activity-${this.activities.length + 1}`, interviewId: id, action: "cancelled", actorId, reason, createdAt: cancelledAt });
      return clone(updated);
    });
  }

  async recordProviderSuccess(id: string, event: CalendarEvent): Promise<InterviewRecord | null> {
    return this.withLock(async () => {
      const current = this.interviews.get(id);
      if (!current) return null;
      const updated = { ...current, providerStatus: "synced" as const, googleEventId: event.eventId, googleMeetUrl: event.meetUrl };
      this.interviews.set(id, updated);
      return clone(updated);
    });
  }

  async recordProviderFailure(id: string): Promise<InterviewRecord | null> {
    return this.withLock(async () => {
      const current = this.interviews.get(id);
      if (!current) return null;
      const updated = { ...current, providerStatus: "failed" as const };
      this.interviews.set(id, updated);
      return clone(updated);
    });
  }
}
