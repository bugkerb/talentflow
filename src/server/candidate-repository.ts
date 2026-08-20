import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CandidateRecord, CandidateRepository } from "@/application/candidate-service";
import { AppError } from "@/server/errors";

type CandidateRow = { id: string; full_name: string; email: string | null; phone: string | null; source: CandidateRecord["source"]; referred_by: string | null; referrer_name: string | null; created_by: string };
const columns = "id,full_name,email,phone,source,referred_by,referrer_name,created_by";
const toRecord = (row: CandidateRow): CandidateRecord => ({ id: row.id, fullName: row.full_name, ...(row.email ? { email: row.email } : {}), ...(row.phone ? { phone: row.phone } : {}), source: row.source, ...(row.referred_by ? { referredBy: row.referred_by } : {}), ...(row.referrer_name ? { referrerName: row.referrer_name } : {}), createdBy: row.created_by });
const throwOnError = (error: { message: string; code?: string } | null): void => { if (!error) return; if (error.code === "23505") throw new AppError("CONFLICT", "Candidate already exists"); throw new Error(error.message); };

export class SupabaseCandidateRepository implements CandidateRepository {
  constructor(private readonly client: SupabaseClient) {}
  async findByEmail(email: string) { const { data, error } = await this.client.from("candidates").select(columns).eq("email", email).is("deleted_at", null).maybeSingle(); throwOnError(error); return data ? toRecord(data as CandidateRow) : null; }
  async insert(candidate: CandidateRecord) { const { data, error } = await this.client.from("candidates").insert({ id: candidate.id, full_name: candidate.fullName, email: candidate.email ?? null, phone: candidate.phone ?? null, source: candidate.source, referred_by: candidate.referredBy ?? null, referrer_name: candidate.referrerName ?? null, created_by: candidate.createdBy }).select(columns).single(); throwOnError(error); if (!data) throw new Error("Candidate was not returned after insert"); return toRecord(data as CandidateRow); }
}
