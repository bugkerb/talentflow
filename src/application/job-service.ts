import { jobCloseSchema, jobInputSchema, jobVersionSchema, type JobInput } from "@/domain/schemas";
import { AppError } from "@/server/errors";

export type JobAuditFields = {
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  openedAt: string | null;
  closedAt: string | null;
  closedBy: string | null;
  closeReason: string | null;
  closeNote: string | null;
  deletedBy: string | null;
  deletedAt: string | null;
};

export type JobRecord = JobInput & {
  id: string;
  version: number;
  updatedBy: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  openedAt?: string | null;
  closedAt?: string | null;
  closedBy?: string | null;
  closeReason?: string | null;
  closeNote?: string | null;
  deletedBy?: string | null;
  deletedAt?: string | null;
};

export type JobPatch = Partial<JobInput> & Partial<JobAuditFields>;

export interface JobRepository {
  findAll(): Promise<JobRecord[]>;
  findById(id: string): Promise<JobRecord | null>;
  insert(job: JobRecord): Promise<JobRecord>;
  update(id: string, expectedVersion: number, patch: JobPatch, actorId: string): Promise<JobRecord | null>;
}

export class JobService {
  constructor(private readonly repository: JobRepository, private readonly clock: () => Date = () => new Date()) {}

  async create(input: unknown, actorId: string, id: string) {
    const value = jobInputSchema.parse(input);
    const timestamp = this.now();
    return this.repository.insert({ ...value, id, version: 1, updatedBy: actorId, createdBy: actorId, createdAt: timestamp, updatedAt: timestamp });
  }

  async list() { return this.repository.findAll(); }

  async update(id: string, input: unknown, expectedVersion: number, actorId: string) {
    const current = await this.requireCurrent(id, expectedVersion);
    const value = jobInputSchema.parse(input);
    return this.persist(id, expectedVersion, { ...value, updatedAt: this.now(), status: current.status }, actorId);
  }

  async publish(id: string, expectedVersion: number, actorId: string) {
    const current = await this.requireCurrent(id, expectedVersion);
    if (current.status !== "draft") throw new AppError("VALIDATION_ERROR", "Only draft jobs can be published");
    const timestamp = this.now();
    return this.persist(id, expectedVersion, { status: "open", openedAt: current.openedAt ?? timestamp, updatedAt: timestamp }, actorId);
  }

  async pause(id: string, expectedVersion: number, actorId: string) {
    const current = await this.requireCurrent(id, expectedVersion);
    if (current.status !== "open") throw new AppError("VALIDATION_ERROR", "Only open jobs can be paused");
    return this.persist(id, expectedVersion, { status: "paused", updatedAt: this.now() }, actorId);
  }

  async resume(id: string, expectedVersion: number, actorId: string) {
    const current = await this.requireCurrent(id, expectedVersion);
    if (current.status !== "paused") throw new AppError("VALIDATION_ERROR", "Only paused jobs can be resumed");
    return this.persist(id, expectedVersion, { status: "open", openedAt: current.openedAt ?? this.now(), updatedAt: this.now() }, actorId);
  }

  async close(id: string, expectedVersion: number, actorId: string, input: unknown) {
    const current = await this.requireCurrent(id, expectedVersion);
    if (current.status !== "open" && current.status !== "paused") throw new AppError("VALIDATION_ERROR", "Only open or paused jobs can be closed");
    const value = jobCloseSchema.parse(input);
    const timestamp = this.now();
    return this.persist(id, expectedVersion, {
      status: "closed",
      closedAt: timestamp,
      closedBy: actorId,
      closeReason: value.reason,
      closeNote: value.note ?? null,
      updatedAt: timestamp
    }, actorId);
  }

  private now() { return this.clock().toISOString(); }

  private async requireCurrent(id: string, expectedVersion: number) {
    if (!jobVersionSchema.safeParse(expectedVersion).success) throw new AppError("VALIDATION_ERROR", "Expected job version is invalid");
    const current = await this.repository.findById(id);
    if (!current) throw new AppError("NOT_FOUND", "Job not found");
    if (current.version !== expectedVersion) throw new AppError("CONFLICT", "Job was updated by another user");
    return current;
  }

  private async persist(id: string, expectedVersion: number, patch: JobPatch, actorId: string) {
    const updated = await this.repository.update(id, expectedVersion, patch, actorId);
    if (!updated) throw new AppError("CONFLICT", "Job was updated by another user");
    return updated;
  }
}
