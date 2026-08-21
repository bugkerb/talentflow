import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DiscoveryCandidateRecord = {
  id: string;
  applicationId: string;
  jobId: string;
  version: number;
  fullName: string;
  email?: string;
  phone?: string;
  source: "referral" | "direct" | "manual" | "discovery" | "import";
  referrerName?: string;
  role: string;
  company: string;
  score: number | null;
  skills: string[];
  evidence: string[];
  concerns: string[];
};

type Row = { id: string; full_name: string; email: string | null; phone: string | null; source: DiscoveryCandidateRecord["source"]; referrer_name: string | null; normalized_profile: Record<string, unknown> | null; applications: { id: string; job_id: string; version: number; stage: string; jobs: { title: string; department: string | null } | null }[] };
const columns = "id,full_name,email,phone,source,referrer_name,normalized_profile,applications!inner(id,job_id,version,stage,jobs(title,department))";
const list = (row: Row): DiscoveryCandidateRecord => {
  const application = row.applications[0];
  const profile = row.normalized_profile ?? {};
  const textArray = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return { id: row.id, applicationId: application.id, jobId: application.job_id, version: application.version, fullName: row.full_name, ...(row.email ? { email: row.email } : {}), ...(row.phone ? { phone: row.phone } : {}), source: row.source, ...(row.referrer_name ? { referrerName: row.referrer_name } : {}), role: typeof profile.role === "string" ? profile.role : "ไม่ระบุ", company: typeof profile.company === "string" ? profile.company : "ไม่ระบุ", score: typeof profile.score === "number" ? profile.score : null, skills: textArray(profile.skills), evidence: textArray(profile.evidence), concerns: textArray(profile.concerns) };
};
export class SupabaseDiscoveryRepository {
  constructor(private readonly client: SupabaseClient) {}
  async list(jobId?: string) {
    let query = this.client.from("candidates").select(columns).is("deleted_at", null).is("applications.deleted_at", null);
    if (jobId) query = query.eq("applications.job_id", jobId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as Row[]).filter((row) => row.applications.length > 0).map(list);
  }
}
