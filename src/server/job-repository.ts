import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobRepository, JobRecord } from "@/application/job-service";

type JobRow = { id: string; title: string; description: string; department: string | null; status: JobRecord["status"]; version: number; updated_by: string | null };
const columns = "id,title,description,department,status,version,updated_by";
const toRecord = (row: JobRow): JobRecord => ({ id: row.id, title: row.title, description: row.description, ...(row.department === null ? {} : { department: row.department }), status: row.status, version: row.version, updatedBy: row.updated_by });
const throwOnError = (error: { message: string } | null): void => { if (error) throw new Error(error.message); };

export class SupabaseJobRepository implements JobRepository {
  constructor(private readonly client: SupabaseClient) {}
  async findAll() { const { data, error } = await this.client.from("jobs").select(columns).order("updated_at", { ascending: false }); throwOnError(error); return (data ?? []).map(toRecord); }
  async findById(id: string) { const { data, error } = await this.client.from("jobs").select(columns).eq("id", id).maybeSingle(); throwOnError(error); return data ? toRecord(data) : null; }
  async insert(job: JobRecord) { const { data, error } = await this.client.from("jobs").insert({ id: job.id, title: job.title, description: job.description, department: job.department ?? null, status: job.status, version: job.version, created_by: job.updatedBy }).select(columns).single(); throwOnError(error); if (!data) throw new Error("Job was not returned after insert"); return toRecord(data); }
  async update(): Promise<JobRecord | null> { throw new Error("Job updates are outside this bounded slice"); }
}
