import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobPatch, JobRepository, JobRecord } from "@/application/job-service";

type JobRow = {
  id: string;
  title: string;
  description: string;
  department: string | null;
  status: JobRecord["status"];
  version: number;
  created_by: string | null;
  created_at: string | null;
  updated_by: string | null;
  updated_at: string | null;
  opened_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
  close_reason: string | null;
  close_note: string | null;
  deleted_by: string | null;
  deleted_at: string | null;
};
const columns = "id,title,description,department,status,version,created_by,created_at,updated_by,updated_at,opened_at,closed_at,closed_by,close_reason,close_note,deleted_by,deleted_at";
const toRecord = (row: JobRow): JobRecord => ({
  id: row.id,
  title: row.title,
  description: row.description,
  ...(row.department === null ? {} : { department: row.department }),
  status: row.status,
  version: row.version,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedBy: row.updated_by,
  updatedAt: row.updated_at,
  openedAt: row.opened_at,
  closedAt: row.closed_at,
  closedBy: row.closed_by,
  closeReason: row.close_reason,
  closeNote: row.close_note,
  deletedBy: row.deleted_by,
  deletedAt: row.deleted_at
});
const throwOnError = (error: { message: string } | null): void => { if (error) throw new Error(error.message); };

const toDatabasePatch = (patch: JobPatch, actorId: string): Record<string, unknown> => {
  const databasePatch: Record<string, unknown> = { updated_by: actorId };
  if (patch.title !== undefined) databasePatch.title = patch.title;
  if (patch.description !== undefined) databasePatch.description = patch.description;
  if (patch.department !== undefined) databasePatch.department = patch.department ?? null;
  if (patch.status !== undefined) databasePatch.status = patch.status;
  if (patch.createdAt !== undefined) databasePatch.created_at = patch.createdAt;
  if (patch.updatedAt !== undefined) databasePatch.updated_at = patch.updatedAt;
  if (patch.openedAt !== undefined) databasePatch.opened_at = patch.openedAt;
  if (patch.closedAt !== undefined) databasePatch.closed_at = patch.closedAt;
  if (patch.closedBy !== undefined) databasePatch.closed_by = patch.closedBy;
  if (patch.closeReason !== undefined) databasePatch.close_reason = patch.closeReason;
  if (patch.closeNote !== undefined) databasePatch.close_note = patch.closeNote;
  return databasePatch;
};

export class SupabaseJobRepository implements JobRepository {
  constructor(private readonly client: SupabaseClient) {}
  async findAll() { const { data, error } = await this.client.from("jobs").select(columns).is("deleted_at", null).order("updated_at", { ascending: false }); throwOnError(error); return (data ?? []).map(toRecord); }
  async findById(id: string) { const { data, error } = await this.client.from("jobs").select(columns).eq("id", id).maybeSingle(); throwOnError(error); return data ? toRecord(data) : null; }
  async insert(job: JobRecord) {
    const { data, error } = await this.client.from("jobs").insert({
      id: job.id,
      title: job.title,
      description: job.description,
      department: job.department ?? null,
      status: job.status,
      version: job.version,
      created_by: job.createdBy ?? job.updatedBy,
      updated_by: job.updatedBy,
      created_at: job.createdAt ?? undefined,
      updated_at: job.updatedAt ?? undefined
    }).select(columns).single();
    throwOnError(error);
    if (!data) throw new Error("Job was not returned after insert");
    return toRecord(data);
  }

  async update(id: string, expectedVersion: number, patch: JobPatch, actorId: string) {
    const { data, error } = await this.client.from("jobs").update({ ...toDatabasePatch(patch, actorId), version: expectedVersion + 1 }).eq("id", id).eq("version", expectedVersion).select(columns).maybeSingle();
    throwOnError(error);
    return data ? toRecord(data) : null;
  }
}
