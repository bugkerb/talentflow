import type { Application, ApplicationRepository, PipelineEvent } from "./ports";
import type { ApplicationStage } from "@/domain/enums";

export class InMemoryApplicationRepository implements ApplicationRepository {
  readonly events: PipelineEvent[] = [];
  private readonly applications = new Map<string, Application>();
  async findById(id: string) { return this.applications.get(id) ?? null; }
  async findByCandidateAndJob(candidateId: string, jobId: string) { return [...this.applications.values()].find((item) => item.candidateId === candidateId && item.jobId === jobId) ?? null; }
  async insert(application: Application) { this.applications.set(application.id, { ...application }); return { ...application }; }
  async updateStage(id: string, expectedVersion: number, stage: ApplicationStage, actorId: string) { const current = this.applications.get(id); if (!current || current.version !== expectedVersion) return null; const updated = { ...current, stage, version: current.version + 1, updatedBy: actorId }; this.applications.set(id, updated); return { ...updated }; }
  async addPipelineEvent(event: PipelineEvent) { this.events.push({ ...event }); }
}
