"use server";
import { randomUUID } from "node:crypto";
import { CandidateService, type CandidateRecord } from "@/application/candidate-service";
import { requireActiveHr } from "@/server/auth";
import { toSafeError } from "@/server/errors";
import { SupabaseCandidateRepository } from "@/server/candidate-repository";
import { createSupabaseServerClient } from "@/server/supabase-server";
export type CreateCandidateResult = { data?: CandidateRecord; error?: { code: string; message: string; requestId: string } };
export async function createCandidate(input: unknown): Promise<CreateCandidateResult> { const requestId = randomUUID(); try { const actor = await requireActiveHr(); const client = await createSupabaseServerClient(); return { data: await new CandidateService(new SupabaseCandidateRepository(client)).create(input, actor.id, randomUUID()) }; } catch (error) { return toSafeError(error, requestId); } }
