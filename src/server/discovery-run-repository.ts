import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiscoveryInput, DiscoveryQuery, DiscoverySourceRecord, RankedDiscoveryCandidate } from "@/application/discovery/types";
import type { DiscoveryRepository } from "@/application/discovery/service";
import { AppError } from "@/server/errors";

type DiscoveryRow = { id: string; source: string; external_id: string; profile_url: string; full_name: string; email: string | null; phone: string | null; role: string | null; company: string | null; skills: string[] | null; experience_years: number | null; profile_text: string; raw: Record<string, unknown> };
const toSource = (row: DiscoveryRow): DiscoverySourceRecord => ({ source: row.source, externalId: row.external_id, profileUrl: row.profile_url, fullName: row.full_name, ...(row.email ? { email: row.email } : {}), ...(row.phone ? { phone: row.phone } : {}), ...(row.role ? { role: row.role } : {}), ...(row.company ? { company: row.company } : {}), skills: row.skills ?? [], ...(row.experience_years === null ? {} : { experienceYears: row.experience_years }), profileText: row.profile_text, raw: row.raw ?? {} });

export class SupabaseDiscoveryRunRepository implements DiscoveryRepository {
  constructor(private readonly client: SupabaseClient) {}
  async saveRun(input: DiscoveryInput, query: DiscoveryQuery, actorId: string) {
    const { data, error } = await this.client.from("discovery_runs").insert({ job_id: input.jobId, actor_id: actorId, title: input.title, job_description: input.jobDescription, skills: input.skills, minimum_years: input.minimumYears, query_text: query.text, query_terms: query.terms, status: "running" }).select("id").single();
    if (error || !data) throw new AppError("DATABASE_ERROR", error?.message ?? "ไม่สามารถสร้างรายการค้นหาได้");
    return data.id as string;
  }
  async saveResults(runId: string, results: RankedDiscoveryCandidate[], actorId: string) {
    if (results.length) {
      const candidates = results.map((result) => ({ full_name: result.fullName, email: result.email ?? null, phone: result.phone ?? null, profile_url: result.profileUrl, source: "discovery" as const, source_detail: `${result.source}:${result.externalId}`, normalized_profile: result.normalizedProfile, data_status: "unverified", data_origin: result.source === "demo" ? "fixture" : "live", created_by: actorId, updated_by: actorId }));
      const { data: candidateRows, error: candidateError } = await this.client.from("candidates").upsert(candidates, { onConflict: "source,source_detail" }).select("id,source_detail");
      if (candidateError) throw new AppError("DATABASE_ERROR", candidateError.message);
      const candidateIds = new Map((candidateRows ?? []).map((row) => [row.source_detail as string, row.id as string]));
      const rows = results.map((result) => ({ run_id: runId, source: result.source, external_id: result.externalId, profile_url: result.profileUrl, full_name: result.fullName, email: result.email ?? null, phone: result.phone ?? null, role: result.role ?? null, company: result.company ?? null, skills: result.skills, experience_years: result.experienceYears ?? null, profile_text: result.profileText, raw: result.raw, score: result.normalizedProfile.score, evidence: result.normalizedProfile.evidence, concerns: result.normalizedProfile.concerns, normalized_profile: result.normalizedProfile, candidate_id: candidateIds.get(`${result.source}:${result.externalId}`) ?? null, review_status: "pending" }));
      const { error } = await this.client.from("discovery_results").upsert(rows, { onConflict: "run_id,external_id" });
      if (error) throw new AppError("DATABASE_ERROR", error.message);
    }
    const { error } = await this.client.from("discovery_runs").update({ status: "completed", result_count: results.length, completed_at: new Date().toISOString() }).eq("id", runId);
    if (error) throw new AppError("DATABASE_ERROR", error.message);
  }
  async listPendingResults(jobId: string) {
    const { data, error } = await this.client.from("discovery_results").select("run_id,source,external_id,profile_url,full_name,role,company,skills,experience_years,raw,normalized_profile,score,evidence,concerns,discovery_runs!inner(job_id)").eq("review_status", "pending").eq("discovery_runs.job_id", jobId).order("created_at", { ascending: false });
    if (error) throw new AppError("DATABASE_ERROR", error.message);
    return (data ?? []).map(({ discovery_runs: _run, ...result }) => result);
  }
  async saveSourceRecords(records: DiscoverySourceRecord[]) {
    if (!records.length) return;
    const { error } = await this.client.from("discovery_source_records").upsert(records.map((record) => ({ source: record.source, external_id: record.externalId, profile_url: record.profileUrl, full_name: record.fullName, email: record.email ?? null, phone: record.phone ?? null, role: record.role ?? null, company: record.company ?? null, skills: record.skills, experience_years: record.experienceYears ?? null, profile_text: record.profileText, raw: record.raw, is_active: true })), { onConflict: "source,external_id" });
    if (error) throw new AppError("DATABASE_ERROR", error.message);
  }
  async approveResult(runId: string, externalId: string, jobId: string, actorId: string, idempotencyKey: string) {
    const { data, error } = await this.client.rpc("approve_discovery_result", { p_run_id: runId, p_external_id: externalId, p_job_id: jobId, p_actor_id: actorId, p_idempotency_key: idempotencyKey });
    if (error) throw new AppError(error.code === "23505" ? "CONFLICT" : "DATABASE_ERROR", error.message);
    if (!data) throw new AppError("NOT_FOUND", "ไม่พบผลลัพธ์การค้นหา");
    return data as { candidateId: string; applicationId: string };
  }
  async searchSourceRecords(query: DiscoveryQuery) {
    const { data, error } = await this.client.from("discovery_source_records").select("id,source,external_id,profile_url,full_name,email,phone,role,company,skills,experience_years,profile_text,raw").eq("is_active", true);
    if (error) throw new AppError("DATABASE_ERROR", error.message);
    const terms = query.terms.map((term) => term.toLocaleLowerCase());
    return ((data ?? []) as DiscoveryRow[]).filter((row) => { const haystack = [row.full_name, row.role, row.company, row.profile_text, ...(row.skills ?? [])].filter(Boolean).join(" ").toLocaleLowerCase(); return terms.some((term) => haystack.includes(term)) && (row.experience_years ?? 0) >= query.minimumYears; }).map(toSource);
  }
}
