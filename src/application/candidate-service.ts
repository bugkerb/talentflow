import { candidateCreateWithApplicationSchema, candidateInputSchema, candidatePatchSchema } from "@/domain/schemas";
import type { CandidateSource } from "@/domain/enums";
import { AppError } from "@/server/errors";
export type CandidateRecord = { id: string; fullName: string; email?: string; phone?: string; source: CandidateSource; sourceDetail?: string; referredBy?: string; referrerName?: string; createdBy: string; version: number; };
export interface CandidateRepository { findByEmail(email: string): Promise<CandidateRecord | null>; insert(candidate: CandidateRecord): Promise<CandidateRecord>; }
export class CandidateService {
  constructor(private readonly repository: CandidateRepository) {}
  async create(input: unknown, actorId: string, id: string) { const value = candidateInputSchema.parse(input); if (value.email && await this.repository.findByEmail(value.email)) throw new AppError("CONFLICT", "Candidate already exists"); return this.repository.insert({ id, fullName: value.fullName, email: value.email, phone: value.phone, source: value.source, sourceDetail: value.sourceDetail, referredBy: value.referredBy, referrerName: value.referrerName, createdBy: actorId, version: 1 }); }
}

export type CandidateApplicationLink = { candidateId: string; applicationId: string; candidate: CandidateRecord; applicationVersion: number };
export type CandidateCrudRepository = CandidateRepository & {
  createWithApplication(input: { fullName: string; email?: string; phone?: string; source: CandidateSource; sourceDetail?: string; referredBy?: string; referrerName?: string; jobId: string; appliedAt?: string }, actorId: string, idempotencyKey: string, requestHash: string): Promise<CandidateApplicationLink>;
  findById(id: string): Promise<CandidateRecord | null>;
  update(id: string, expectedVersion: number, input: unknown, actorId: string, application?: { id: string; expectedVersion: number; appliedAt: string }): Promise<CandidateApplicationLink | null>;
  softDelete(id: string, expectedVersion: number, actorId: string): Promise<CandidateRecord | null>;
};

export class CandidateCrudService {
  constructor(private readonly repository: CandidateCrudRepository) {}

  async createWithApplication(input: unknown, actorId: string, idempotencyKey: string, requestHash: string): Promise<CandidateApplicationLink> {
    const value = candidateCreateWithApplicationSchema.parse(input);
    if (!idempotencyKey.trim()) throw new AppError("VALIDATION_ERROR", "ต้องระบุ idempotency key");
    return this.repository.createWithApplication(value, actorId, idempotencyKey.trim(), requestHash);
  }

  async update(id: string, input: unknown, expectedVersion: number, actorId: string, application?: { id: string; expectedVersion: number; appliedAt: string }) {
    const value = candidatePatchSchema.parse(input);
    const current = await this.repository.findById(id);
    if (!current) throw new AppError("NOT_FOUND", "ไม่พบผู้สมัคร");
    if (current.version !== expectedVersion) throw new AppError("CONFLICT", "ข้อมูลผู้สมัครถูกแก้ไขโดยผู้ใช้อื่น");
    const merged = {
      fullName: value.fullName ?? current.fullName,
      email: value.email ?? current.email,
      phone: value.phone ?? current.phone,
      source: value.source ?? current.source,
      sourceDetail: value.sourceDetail ?? current.sourceDetail,
      referredBy: value.referredBy ?? current.referredBy,
      referrerName: value.referrerName ?? current.referrerName,
    };
    const valid = candidateInputSchema.safeParse(merged);
    if (!valid.success) throw new AppError("VALIDATION_ERROR", "ข้อมูลผู้สมัครไม่ถูกต้อง");
    const updated = await this.repository.update(id, expectedVersion, merged, actorId, application);
    if (!updated) throw new AppError("CONFLICT", "ข้อมูลผู้สมัครถูกแก้ไขโดยผู้ใช้อื่น");
    return updated;
  }

  async remove(id: string, expectedVersion: number, actorId: string) {
    const current = await this.repository.findById(id);
    if (!current) throw new AppError("NOT_FOUND", "ไม่พบผู้สมัคร");
    if (current.version !== expectedVersion) throw new AppError("CONFLICT", "ข้อมูลผู้สมัครถูกแก้ไขโดยผู้ใช้อื่น");
    const deleted = await this.repository.softDelete(id, expectedVersion, actorId);
    if (!deleted) throw new AppError("CONFLICT", "ข้อมูลผู้สมัครถูกแก้ไขโดยผู้ใช้อื่น");
    return deleted;
  }
}
