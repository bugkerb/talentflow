import { jobInputSchema, type JobInput } from "@/domain/schemas";
import { AppError } from "@/server/errors";
export type JobRecord = JobInput & { id: string; version: number; updatedBy: string | null };
export interface JobRepository { findAll(): Promise<JobRecord[]>; findById(id: string): Promise<JobRecord | null>; insert(job: JobRecord): Promise<JobRecord>; update(id: string, expectedVersion: number, patch: JobInput, actorId: string): Promise<JobRecord | null>; }
export class JobService {
  constructor(private readonly repository: JobRepository) {}
  async create(input: unknown, actorId: string, id: string) { const value = jobInputSchema.parse(input); return this.repository.insert({ ...value, id, version: 1, updatedBy: actorId }); }
  async list() { return this.repository.findAll(); }
  async update(id: string, input: unknown, expectedVersion: number, actorId: string) { const current = await this.repository.findById(id); if (!current) throw new AppError("NOT_FOUND", "Job not found"); if (current.version !== expectedVersion) throw new AppError("CONFLICT", "Job was updated by another user"); const value = jobInputSchema.parse(input); const updated = await this.repository.update(id, expectedVersion, value, actorId); if (!updated) throw new AppError("CONFLICT", "Job was updated by another user"); return updated; }
}
