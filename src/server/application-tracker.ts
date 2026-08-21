import "server-only";

import { toTrackerApplication, type ApplicationTrackerData } from "@/application/application-tracker";
import { createSupabaseServerClient } from "./supabase-server";

const throwSupabaseError = (operation: string, error: { message: string } | null): void => {
  if (error) throw new Error(`Supabase ${operation} failed: ${error.message}`);
};

export const loadApplicationTracker = async (): Promise<ApplicationTrackerData> => {
  const supabase = await createSupabaseServerClient();
  const [applicationsResult, candidatesResult, jobsResult] = await Promise.all([
    supabase.from("applications").select("id,candidate_id,job_id,stage,status,version,applied_at,candidates!inner(id,full_name,email,phone,source,source_detail,version),jobs!inner(id,title,status)").eq("status", "active").is("deleted_at", null).is("candidates.deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("candidates").select("id,full_name,email,phone,source,source_detail,version").is("deleted_at", null).order("full_name"),
    supabase.from("jobs").select("id,title,status").is("deleted_at", null).order("title"),
  ]);

  throwSupabaseError("application load", applicationsResult.error);
  throwSupabaseError("candidate load", candidatesResult.error);
  throwSupabaseError("job load", jobsResult.error);

  const applications = (applicationsResult.data ?? []).map((row) => toTrackerApplication(row));
  const candidates = (candidatesResult.data ?? []).map((row) => ({ id: row.id, fullName: row.full_name, email: row.email, phone: row.phone, source: row.source, sourceDetail: row.source_detail, version: row.version }));
  const jobs = (jobsResult.data ?? []).map((row) => ({ id: row.id, title: row.title, status: row.status }));
  return { applications, candidates, jobs };
};
