"use server";
import { randomUUID } from "node:crypto";
import { CandidateService, type CandidateRecord } from "@/application/candidate-service";
import { requireActiveHr } from "@/server/auth";
import { toSafeError } from "@/server/errors";
import { SupabaseCandidateRepository } from "@/server/candidate-repository";
import { createSupabaseServerClient } from "@/server/supabase-server";
import { z } from "zod";
import { ApplicationService } from "@/application/application-service";
import { SupabaseApplicationRepository } from "@/server/application-repository";
export type CreateCandidateResult = { data?: CandidateRecord; error?: { code: string; message: string; requestId: string } };
export async function createCandidate(input: unknown): Promise<CreateCandidateResult> { const requestId = randomUUID(); try { const actor = await requireActiveHr(); const client = await createSupabaseServerClient(); return { data: await new CandidateService(new SupabaseCandidateRepository(client)).create(input, actor.id, randomUUID()) }; } catch (error) { return toSafeError(error, requestId); } }
export type DiscoveryDecision = "interview" | "review" | "rejected";
export async function updateDiscoveryDecision(input: unknown) {
  const requestId = randomUUID();
  try {
    const value = z.object({ applicationId: z.string().uuid(), expectedVersion: z.number().int().min(1), decision: z.enum(["interview", "review", "rejected"]) }).parse(input);
    const actor = await requireActiveHr();
    const target = value.decision === "interview" ? "interview" : value.decision === "rejected" ? "rejected" : "phone_screen";
    const client = await createSupabaseServerClient();
    const data = await new ApplicationService(new SupabaseApplicationRepository(client)).move(value.applicationId, target, value.expectedVersion, actor.id);
    return { data, error: undefined };
  } catch (error) { return { data: undefined, ...toSafeError(error, requestId) }; }
}
