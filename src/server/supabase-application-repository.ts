import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApplicationStage } from "@/domain/enums";
import type { Application, ApplicationRepository, PipelineEvent } from "@/application/ports";

type ApplicationRow = { id: string; candidate_id: string; job_id: string; stage: ApplicationStage; version: number; updated_by: string | null };

const toApplication = (row: ApplicationRow): Application => ({ id: row.id, candidateId: row.candidate_id, jobId: row.job_id, stage: row.stage, version: row.version, updatedBy: row.updated_by });

export class SupabaseApplicationRepository implements ApplicationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<Application | null> {
    const result = await this.client.from("applications").select("id,candidate_id,job_id,stage,version,updated_by").eq("id", id).is("deleted_at", null).maybeSingle();
    if (result.error) throw result.error;
    return result.data ? toApplication(result.data) : null;
  }

  async findByCandidateAndJob(candidateId: string, jobId: string): Promise<Application | null> {
    const result = await this.client.from("applications").select("id,candidate_id,job_id,stage,version,updated_by").eq("candidate_id", candidateId).eq("job_id", jobId).is("deleted_at", null).maybeSingle();
    if (result.error) throw result.error;
    return result.data ? toApplication(result.data) : null;
  }

  async insert(application: Application): Promise<Application> {
    const result = await this.client.from("applications").insert({ id: application.id, candidate_id: application.candidateId, job_id: application.jobId, stage: application.stage, version: application.version, updated_by: application.updatedBy }).select("id,candidate_id,job_id,stage,version,updated_by").single();
    if (result.error) throw result.error;
    return toApplication(result.data);
  }

  async updateStage(id: string, expectedVersion: number, stage: ApplicationStage, actorId: string): Promise<Application | null> {
    const result = await this.client.from("applications").update({ stage, version: expectedVersion + 1, updated_by: actorId, stage_changed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("version", expectedVersion).is("deleted_at", null).select("id,candidate_id,job_id,stage,version,updated_by").maybeSingle();
    if (result.error) throw result.error;
    return result.data ? toApplication(result.data) : null;
  }

  async transitionStage(id: string, expectedVersion: number, stage: ApplicationStage, actorId: string, reason?: string): Promise<Application | null> {
    const result = await this.client.rpc("transition_application_stage", {
      p_application_id: id,
      p_expected_version: expectedVersion,
      p_to_stage: stage,
      p_actor_id: actorId,
      p_reason: reason ?? null,
    });
    if (result.error) throw result.error;
    return result.data ? toApplication(result.data as ApplicationRow) : null;
  }

  async addPipelineEvent(event: PipelineEvent): Promise<void> {
    const result = await this.client.from("pipeline_events").insert({ application_id: event.applicationId, from_stage: event.fromStage, to_stage: event.toStage, actor_id: event.actorId, actor_type: "user", reason: event.reason ?? null });
    if (result.error) throw result.error;
  }
}
