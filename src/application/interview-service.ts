import { createHash } from "node:crypto";
import { interviewCancelSchema, interviewRescheduleSchema, interviewScheduleSchema } from "@/domain/schemas";
import { AppError } from "@/server/errors";
import type { CalendarProvider, InterviewRecord, InterviewRepository } from "./interview-ports";

const idSchema = (value: string, label: string): string => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new AppError("VALIDATION_ERROR", `${label} must be a UUID`);
  return value;
};
const hashRequest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export class InterviewService {
  private readonly provider: CalendarProvider;

  constructor(private readonly repository: InterviewRepository, provider: CalendarProvider) { this.provider = provider; }

  async schedule(input: unknown, actorId: string, id: string, idempotencyKey: string): Promise<InterviewRecord> {
    const value = interviewScheduleSchema.parse(input);
    idSchema(actorId, "actorId");
    idSchema(id, "id");
    if (!idempotencyKey.trim()) throw new AppError("VALIDATION_ERROR", "Idempotency key is required");
    const record: InterviewRecord = { ...value, id, idempotencyKey, status: "scheduled", version: 1, createdBy: actorId, updatedBy: null, cancelledBy: null, cancelledAt: null, providerStatus: "pending", googleEventId: null, googleMeetUrl: null };
    const stored = await this.repository.schedule(record, hashRequest(value));
    return this.syncProvider({ ...stored, description: record.description });
  }

  async retryProvider(interviewId: string): Promise<InterviewRecord> {
    idSchema(interviewId, "interviewId");
    const current = await this.repository.findById(interviewId);
    if (!current) throw new AppError("NOT_FOUND", "Interview not found");
    return this.syncProvider(current);
  }

  private async syncProvider(interview: InterviewRecord): Promise<InterviewRecord> {
    if (interview.providerStatus === "synced") return interview;
    try {
      const event = await this.provider.createEvent(interview, interview.idempotencyKey);
      const updated = await this.repository.recordProviderSuccess(interview.id, event);
      if (!updated) throw new AppError("NOT_FOUND", "Interview not found");
      return updated;
    } catch (error) {
      await this.repository.recordProviderFailure(interview.id);
      if (error instanceof AppError && error.code === "NOT_FOUND") throw error;
      throw new AppError("CALENDAR_PROVIDER_ERROR", "Calendar provider could not create the event; retry with the same idempotency key");
    }
  }

  async reschedule(input: unknown, actorId: string, expectedVersion: number): Promise<InterviewRecord> {
    const value = interviewRescheduleSchema.parse(input);
    idSchema(actorId, "actorId");
    const current = await this.repository.findById(value.interviewId);
    if (!current) throw new AppError("NOT_FOUND", "Interview not found");
    if (current.version !== expectedVersion || current.status !== "scheduled") throw new AppError("CONFLICT", "Interview was updated by another user");
    const updated = await this.repository.reschedule(value.interviewId, expectedVersion, value.startsAt, value.endsAt, actorId, value.reason);
    if (!updated) throw new AppError("CONFLICT", "Interview was updated by another user");
    if (current.googleEventId) await this.provider.updateEvent(current.googleEventId, { ...current, ...updated });
    return updated;
  }

  async cancel(input: unknown, actorId: string, expectedVersion: number): Promise<InterviewRecord> {
    const value = interviewCancelSchema.parse(input);
    idSchema(actorId, "actorId");
    const current = await this.repository.findById(value.interviewId);
    if (!current) throw new AppError("NOT_FOUND", "Interview not found");
    if (current.version !== expectedVersion || current.status !== "scheduled") throw new AppError("CONFLICT", "Interview was updated by another user");
    const updated = await this.repository.cancel(value.interviewId, expectedVersion, actorId, value.reason);
    if (!updated) throw new AppError("CONFLICT", "Interview was updated by another user");
    if (current.googleEventId) await this.provider.cancelEvent(current.googleEventId);
    return updated;
  }
}
