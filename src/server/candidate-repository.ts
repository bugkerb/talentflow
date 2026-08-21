import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CandidateCrudRepository, CandidateRecord, CandidateApplicationLink } from "@/application/candidate-service";
import { AppError } from "@/server/errors";

type CandidateRow = { id: string; full_name: string; email: string | null; phone: string | null; source: CandidateRecord["source"]; source_detail: string | null; referred_by: string | null; referrer_name: string | null; created_by: string; version: number };
const columns = "id,full_name,email,phone,source,source_detail,referred_by,referrer_name,created_by,version";
const toRecord = (row: CandidateRow): CandidateRecord => ({ id: row.id, fullName: row.full_name, ...(row.email ? { email: row.email } : {}), ...(row.phone ? { phone: row.phone } : {}), source: row.source, ...(row.source_detail ? { sourceDetail: row.source_detail } : {}), ...(row.referred_by ? { referredBy: row.referred_by } : {}), ...(row.referrer_name ? { referrerName: row.referrer_name } : {}), createdBy: row.created_by, version: row.version });
const throwOnError = (error: { message: string; code?: string } | null): void => { if (!error) return; if (error.code === "23505" || /candidate already exists|duplicate application/i.test(error.message)) throw new AppError("CONFLICT", "ผู้สมัครหรือใบสมัครนี้มีอยู่แล้ว"); if (/job not found/i.test(error.message)) throw new AppError("NOT_FOUND", "ไม่พบตำแหน่งงาน"); throw new Error(error.message); };

export class SupabaseCandidateRepository implements CandidateCrudRepository {
  constructor(private readonly client: SupabaseClient) {}
  async findByEmail(email: string) { const { data, error } = await this.client.from("candidates").select(columns).eq("email", email).is("deleted_at", null).maybeSingle(); throwOnError(error); return data ? toRecord(data as CandidateRow) : null; }
  async findById(id: string) { const { data, error } = await this.client.from("candidates").select(columns).eq("id", id).is("deleted_at", null).maybeSingle(); throwOnError(error); return data ? toRecord(data as CandidateRow) : null; }
  async insert(candidate: CandidateRecord) { const { data, error } = await this.client.from("candidates").insert({ id: candidate.id, full_name: candidate.fullName, email: candidate.email ?? null, phone: candidate.phone ?? null, source: candidate.source, source_detail: candidate.sourceDetail ?? null, referred_by: candidate.referredBy ?? null, referrer_name: candidate.referrerName ?? null, created_by: candidate.createdBy, version: candidate.version }).select(columns).single(); throwOnError(error); if (!data) throw new Error("Candidate was not returned after insert"); return toRecord(data as CandidateRow); }

  async createWithApplication(input: { fullName: string; email?: string; phone?: string; source: CandidateRecord["source"]; sourceDetail?: string; referredBy?: string; referrerName?: string; jobId: string; appliedAt?: string }, actorId: string, idempotencyKey: string, requestHash: string): Promise<CandidateApplicationLink> {
    const { data, error } = await this.client.rpc("create_candidate_with_application", {
      p_full_name: input.fullName,
      p_email: input.email ?? null,
      p_phone: input.phone ?? null,
      p_source: input.source,
      p_source_detail: input.sourceDetail ?? null,
      p_referred_by: input.referredBy ?? null,
      p_referrer_name: input.referrerName ?? null,
      p_job_id: input.jobId,
      p_applied_at: input.appliedAt ?? new Date().toISOString(),
      p_idempotency_key: idempotencyKey,
      p_request_hash: requestHash,
      p_actor_id: actorId
    });
    throwOnError(error);
    const result = data as { candidateId?: string; applicationId?: string; applicationVersion?: number } | null;
    if (!result?.candidateId || !result.applicationId || typeof result.applicationVersion !== "number") throw new Error("Candidate application was not returned");
    const candidate = await this.findById(result.candidateId);
    if (!candidate) throw new Error("Candidate was not returned after create");
    return { candidateId: result.candidateId, applicationId: result.applicationId, candidate, applicationVersion: result.applicationVersion };
  }

  async update(id: string, expectedVersion: number, input: { fullName?: string; email?: string; phone?: string; source?: CandidateRecord["source"]; sourceDetail?: string; referredBy?: string; referrerName?: string }, actorId: string, application?: { id: string; expectedVersion: number; appliedAt: string }): Promise<CandidateApplicationLink | null> {
    if (application) {
      const { data, error } = await this.client.rpc("update_candidate_with_application", {
        p_candidate_id: id,
        p_expected_candidate_version: expectedVersion,
        p_full_name: input.fullName ?? null,
        p_email: input.email ?? null,
        p_phone: input.phone ?? null,
        p_source: input.source ?? null,
        p_source_detail: input.sourceDetail ?? null,
        p_referred_by: input.referredBy ?? null,
        p_referrer_name: input.referrerName ?? null,
        p_application_id: application.id,
        p_expected_application_version: application.expectedVersion,
        p_applied_at: application.appliedAt,
        p_actor_id: actorId
      });
      throwOnError(error);
      const result = data as { candidateId?: string; applicationId?: string; applicationVersion?: number } | null;
      if (!result) return null;
      const candidate = await this.findById(id);
      if (!candidate || !result.applicationId || typeof result.applicationVersion !== "number") return null;
      return { candidateId: id, applicationId: result.applicationId, candidate, applicationVersion: result.applicationVersion };
    }
    const patch: Record<string, unknown> = { updated_by: actorId, version: expectedVersion + 1 };
    if (input.fullName !== undefined) patch.full_name = input.fullName;
    if (input.email !== undefined) patch.email = input.email || null;
    if (input.phone !== undefined) patch.phone = input.phone || null;
    if (input.source !== undefined) patch.source = input.source;
    if (input.sourceDetail !== undefined) patch.source_detail = input.sourceDetail || null;
    if (input.referredBy !== undefined) patch.referred_by = input.referredBy || null;
    if (input.referrerName !== undefined) patch.referrer_name = input.referrerName || null;
    const { data, error } = await this.client.from("candidates").update(patch).eq("id", id).eq("version", expectedVersion).is("deleted_at", null).select(columns).maybeSingle();
    throwOnError(error);
    if (!data) return null;
    const candidate = toRecord(data as CandidateRow);
    return { candidateId: id, applicationId: "", candidate, applicationVersion: 0 };
  }

  async softDelete(id: string, expectedVersion: number, actorId: string) {
    const { data, error } = await this.client.from("candidates").update({ deleted_at: new Date().toISOString(), deleted_by: actorId, version: expectedVersion + 1, updated_by: actorId }).eq("id", id).eq("version", expectedVersion).is("deleted_at", null).select(columns).maybeSingle();
    throwOnError(error);
    return data ? toRecord(data as CandidateRow) : null;
  }
}
