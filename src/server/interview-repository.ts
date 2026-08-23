import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "./errors";
import type { CalendarEvent, InterviewListItem, InterviewRecord, InterviewRepository } from "@/application/interview-ports";

type InterviewRow = {
  id: string; application_id: string; interview_type: string; starts_at: string; ends_at: string; timezone: string; interviewer_id?: string;
  description: string; additional_questions: string; format?: "online" | "onsite"; status: InterviewRecord["status"]; version: number; idempotency_key: string; created_by: string; updated_by: string | null;
  cancelled_by: string | null; cancelled_at: string | null; provider_status: InterviewRecord["providerStatus"]; google_event_id: string | null; google_meet_url: string | null;
};
const columns = "id,application_id,interview_type,starts_at,ends_at,timezone,description,additional_questions,format,status,version,idempotency_key,created_by,updated_by,cancelled_by,cancelled_at,provider_status,google_event_id,google_meet_url";
const toRecord = (row: InterviewRow): InterviewRecord => ({ id: row.id, applicationId: row.application_id, interviewType: row.interview_type, startsAt: row.starts_at, endsAt: row.ends_at, timezone: row.timezone, interviewerId: row.interviewer_id ?? "", format: row.format ?? "online", description: row.description, additionalQuestions: row.additional_questions, status: row.status, version: row.version, idempotencyKey: row.idempotency_key, createdBy: row.created_by, updatedBy: row.updated_by, cancelledBy: row.cancelled_by, cancelledAt: row.cancelled_at, providerStatus: row.provider_status, googleEventId: row.google_event_id, googleMeetUrl: row.google_meet_url });
const throwDatabaseError = (error: { message: string; code?: string; details?: string | null } | null): void => {
  if (!error) return;
  if (error.message.includes("idempotency key")) throw new AppError("IDEMPOTENCY_CONFLICT", "Idempotency key was reused with a different request");
  if (error.message.includes("interview time conflict")) {
    let alternatives: unknown[] = [];
    try { alternatives = JSON.parse(error.details ?? "[]") as unknown[]; } catch { alternatives = []; }
    throw new AppError("INTERVIEW_CONFLICT", "Interview time conflicts with another appointment.", 409, { alternatives });
  }
  throw new Error(error.message);
};

export class SupabaseInterviewRepository implements InterviewRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<InterviewListItem[]> {
    const { data, error } = await this.client.from("interviews").select(`${columns},interview_participants!inner(profile_id,profiles!inner(full_name)),applications!inner(candidate:candidates!inner(full_name),job:jobs!inner(title))`).order("starts_at", { ascending: true });
    throwDatabaseError(error);
    return ((data ?? []) as unknown as Array<InterviewRow & { interview_participants: unknown; applications: unknown }>).map((row) => {
      const participants = Array.isArray(row.interview_participants) ? row.interview_participants : row.interview_participants ? [row.interview_participants] : [];
      const applications = Array.isArray(row.applications) ? row.applications : row.applications ? [row.applications] : [];
      const participant = participants[0] as { profile_id?: string; profiles?: unknown } | undefined;
      const application = applications[0] as { candidate?: unknown; job?: unknown } | undefined;
      const candidate = (Array.isArray(application?.candidate) ? application?.candidate[0] : application?.candidate) as { full_name?: string } | undefined;
      const job = (Array.isArray(application?.job) ? application?.job[0] : application?.job) as { title?: string } | undefined;
      const profiles = Array.isArray(participant?.profiles) ? participant?.profiles[0] : participant?.profiles;
      const profile = profiles as { full_name?: string } | undefined;
      return { ...toRecord({ ...row, interviewer_id: participant?.profile_id }), candidateName: candidate?.full_name ?? "ไม่ระบุผู้สมัคร", jobTitle: job?.title ?? "ไม่ระบุตำแหน่ง", interviewerName: profile?.full_name ?? "ไม่ระบุผู้สัมภาษณ์" };
    });
  }

  async schedule(interview: InterviewRecord, requestHash: string): Promise<InterviewRecord> {
    const persistedQuestions = [`รูปแบบ: ${interview.format ?? "online"}`, interview.additionalQuestions].filter(Boolean).join("\n");
    const { data, error } = await this.client.rpc("schedule_interview", { p_interview_id: interview.id, p_application_id: interview.applicationId, p_interview_type: interview.interviewType, p_starts_at: interview.startsAt, p_ends_at: interview.endsAt, p_timezone: interview.timezone, p_interviewer_id: interview.interviewerId, p_additional_questions: persistedQuestions, p_idempotency_key: interview.idempotencyKey, p_request_hash: requestHash, p_actor_id: interview.createdBy });
    throwDatabaseError(error);
    if (!data) throw new Error("Interview was not returned after schedule");
    const persisted = await this.findById(interview.id);
    if (!persisted) throw new Error("Interview was not returned after schedule");
    return persisted;
  }

  async findById(id: string): Promise<InterviewRecord | null> {
    const { data, error } = await this.client.from("interviews").select(`${columns},interview_participants!inner(profile_id)`).eq("id", id).maybeSingle();
    throwDatabaseError(error);
    if (!data) return null;
    const row = data as InterviewRow & { interview_participants: { profile_id: string }[] };
    return toRecord({ ...row, interviewer_id: row.interview_participants[0]?.profile_id });
  }

  async reschedule(id: string, expectedVersion: number, startsAt: string, endsAt: string, actorId: string, reason?: string): Promise<InterviewRecord | null> {
    const { data, error } = await this.client.rpc("reschedule_interview", { p_interview_id: id, p_expected_version: expectedVersion, p_starts_at: startsAt, p_ends_at: endsAt, p_reason: reason ?? null, p_actor_id: actorId });
    throwDatabaseError(error);
    return data ? this.findById(id) : null;
  }

  async cancel(id: string, expectedVersion: number, actorId: string, reason: string): Promise<InterviewRecord | null> {
    const { data, error } = await this.client.rpc("cancel_interview", { p_interview_id: id, p_expected_version: expectedVersion, p_reason: reason, p_actor_id: actorId });
    throwDatabaseError(error);
    return data ? this.findById(id) : null;
  }

  async recordProviderSuccess(id: string, event: CalendarEvent): Promise<InterviewRecord | null> {
    const { data, error } = await this.client.from("interviews").update({ provider_status: "synced", google_event_id: event.eventId, google_meet_url: event.meetUrl }).eq("id", id).select(`${columns},interview_participants!inner(profile_id)`).maybeSingle();
    throwDatabaseError(error);
    if (!data) return null;
    const row = data as InterviewRow & { interview_participants: { profile_id: string }[] };
    return toRecord({ ...row, interviewer_id: row.interview_participants[0]?.profile_id });
  }

  async recordProviderFailure(id: string): Promise<InterviewRecord | null> {
    const { data, error } = await this.client.from("interviews").update({ provider_status: "failed" }).eq("id", id).select(`${columns},interview_participants!inner(profile_id)`).maybeSingle();
    throwDatabaseError(error);
    if (!data) return null;
    const row = data as InterviewRow & { interview_participants: { profile_id: string }[] };
    return toRecord({ ...row, interviewer_id: row.interview_participants[0]?.profile_id });
  }
}
