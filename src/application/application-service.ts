import { AppError } from "@/server/errors";
import { isValidStageTransition } from "@/domain/enums";
import type { ApplicationRepository } from "./ports";

export class ApplicationService {
  constructor(private readonly repository: ApplicationRepository) {}
  async create(candidateId: string, jobId: string, actorId: string, id: string): Promise<Awaited<ReturnType<ApplicationRepository["insert"]>>> {
    if (await this.repository.findByCandidateAndJob(candidateId, jobId)) throw new AppError("CONFLICT", "Candidate already applied to this job");
    return this.repository.insert({ id, candidateId, jobId, stage: "screening", version: 1, updatedBy: actorId });
  }
  async move(id: string, toStage: Parameters<ApplicationRepository["updateStage"]>[2], expectedVersion: number, actorId: string, reason?: string) {
    const current = await this.repository.findById(id);
    if (!current) throw new AppError("NOT_FOUND", "Application not found");
    if (current.version !== expectedVersion) throw new AppError("CONFLICT", "Application was updated by another user");
    if (!isValidStageTransition(current.stage, toStage)) throw new AppError("VALIDATION_ERROR", "Invalid stage transition");
    const transition = (this.repository as ApplicationRepository & {
      transitionStage?: (id: string, expectedVersion: number, stage: Parameters<ApplicationRepository["updateStage"]>[2], actorId: string, reason?: string) => Promise<Awaited<ReturnType<ApplicationRepository["updateStage"]>>>;
    }).transitionStage;
    const updated = transition
      ? await transition.call(this.repository, id, expectedVersion, toStage, actorId, reason)
      : await this.repository.updateStage(id, expectedVersion, toStage, actorId);
    if (!updated) throw new AppError("CONFLICT", "Application was updated by another user");
    if (!transition) await this.repository.addPipelineEvent({ applicationId: id, fromStage: current.stage, toStage, actorId, reason });
    return updated;
  }
}
