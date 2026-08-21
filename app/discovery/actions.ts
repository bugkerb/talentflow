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
import { DiscoveryService } from "@/application/discovery/service";
import { createConfiguredDiscoveryAdapter } from "@/application/discovery/source-adapters";
import { SupabaseDiscoveryRunRepository } from "@/server/discovery-run-repository";
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

export async function runDiscovery(input: unknown) {
  const requestId = randomUUID();
  try {
    const actor = await requireActiveHr();
    const client = await createSupabaseServerClient();
    const repository = new SupabaseDiscoveryRunRepository(client);
    const data = await new DiscoveryService(createConfiguredDiscoveryAdapter(), repository).search(input, actor.id);
    return { data, error: undefined };
  } catch (error) {
    return { data: undefined, ...toSafeError(error, requestId) };
  }
}

export async function approveDiscoveryResult(input: unknown) {
  const requestId = randomUUID();
  try {
    const value = z.object({ runId: z.string().uuid(), externalId: z.string().min(1).max(200), jobId: z.string().uuid(), idempotencyKey: z.string().min(8).max(200) }).parse(input);
    const actor = await requireActiveHr();
    const client = await createSupabaseServerClient();
    const data = await new DiscoveryService(createConfiguredDiscoveryAdapter(), new SupabaseDiscoveryRunRepository(client)).approve(value.runId, value.externalId, value.jobId, actor.id, value.idempotencyKey);
    return { data, error: undefined };
  } catch (error) {
    return { data: undefined, ...toSafeError(error, requestId) };
  }
}
