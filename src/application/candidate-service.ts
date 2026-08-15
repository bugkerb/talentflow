import { candidateInputSchema } from "@/domain/schemas";
import { AppError } from "@/server/errors";
export type CandidateRecord = { id: string; fullName: string; email?: string; source: string; referrerName?: string; createdBy: string; };
export interface CandidateRepository { findByEmail(email: string): Promise<CandidateRecord | null>; insert(candidate: CandidateRecord): Promise<CandidateRecord>; }
export class CandidateService {
  constructor(private readonly repository: CandidateRepository) {}
  async create(input: unknown, actorId: string, id: string) { const value = candidateInputSchema.parse(input); if (value.email && await this.repository.findByEmail(value.email)) throw new AppError("CONFLICT", "Candidate already exists"); return this.repository.insert({ id, fullName: value.fullName, email: value.email, source: value.source, referrerName: value.referrerName, createdBy: actorId }); }
}
