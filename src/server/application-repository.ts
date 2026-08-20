import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Application, ApplicationRepository, PipelineEvent } from "@/application/ports";
import { AppError } from "@/server/errors";

type ApplicationRow = { id: string; candidate_id: string; job_id: string; stage: Application["stage"]; version: number; updated_by: string | null };
const columns = "id,candidate_id,job_id,stage,version,updated_by";
const toRecord = (row: ApplicationRow): Application => ({ id: row.id, candidateId: row.candidate_id, jobId: row.job_id, stage: row.stage, version: row.version, updatedBy: row.updated_by });
const throwOnError = (error: { message: string; code?: string } | null): void => { if (!error) return; if (error.code === "23505") throw new AppError("CONFLICT", "Candidate already applied to this job"); throw new Error(error.message); };

export class SupabaseApplicationRepository implements ApplicationRepository {
  constructor(private readonly client: SupabaseClient) {}
  async findById(id: string) { const { data, error } = await this.client.from("applications").select(columns).eq("id", id).is("deleted_at", null).maybeSingle(); throwOnError(error); return data ? toRecord(data as ApplicationRow) : null; }
  async findByCandidateAndJob(candidateId: string, jobId: string) { const { data, error } = await this.client.from("applications").select(columns).eq("candidate_id", candidateId).eq("job_id", jobId).is("deleted_at", null).maybeSingle(); throwOnError(error); return data ? toRecord(data as ApplicationRow) : null; }
  async insert(application: Application) { const { data, error } = await this.client.from("applications").insert({ id: application.id, candidate_id: application.candidateId, job_id: application.jobId, stage: application.stage, version: application.version, created_by: application.updatedBy, updated_by: application.updatedBy }).select(columns).single(); throwOnError(error); if (!data) throw new Error("Application was not returned after insert"); return toRecord(data as ApplicationRow); }
  async transitionStage(id: string, expectedVersion: number, stage: Application["stage"], actorId: string, reason?: string) {
    const { data, error } = await this.client.rpc("transition_application_stage", {
      p_application_id: id,
      p_expected_version: expectedVersion,
      p_to_stage: stage,
      p_actor_id: actorId,
      p_reason: reason ?? null
    });
    throwOnError(error);
    return data ? toRecord(data as ApplicationRow) : null;
  }
  async updateStage(id: string, expectedVersion: number, stage: Application["stage"], actorId: string) { return this.transitionStage(id, expectedVersion, stage, actorId); }
  async addPipelineEvent(event: PipelineEvent) { const { error } = await this.client.from("pipeline_events").insert({ application_id: event.applicationId, from_stage: event.fromStage, to_stage: event.toStage, actor_id: event.actorId, actor_type: "user", reason: event.reason ?? null }); throwOnError(error); }
}
