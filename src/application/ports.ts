import type { ApplicationStage } from "@/domain/enums";
export type Application = { id: string; candidateId: string; jobId: string; stage: ApplicationStage; version: number; updatedBy: string | null };
export type PipelineEvent = { applicationId: string; fromStage: ApplicationStage | null; toStage: ApplicationStage; actorId: string; reason?: string };
export interface ApplicationRepository { findById(id: string): Promise<Application | null>; findByCandidateAndJob(candidateId: string, jobId: string): Promise<Application | null>; insert(application: Application): Promise<Application>; updateStage(id: string, expectedVersion: number, stage: ApplicationStage, actorId: string): Promise<Application | null>; addPipelineEvent(event: PipelineEvent): Promise<void>; }
