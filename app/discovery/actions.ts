"use server";
import { randomUUID } from "node:crypto";
import { CandidateService, type CandidateRecord } from "@/application/candidate-service";
import { requireActiveHr } from "@/server/auth";
import { toSafeError } from "@/server/errors";
import { SupabaseCandidateRepository } from "@/server/candidate-repository";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/server/supabase-server";
import { z } from "zod";
import { ApplicationService } from "@/application/application-service";
import { SupabaseApplicationRepository } from "@/server/application-repository";
import { DiscoveryService } from "@/application/discovery/service";
import { createConfiguredDiscoveryAdapter, createPersistedSourceAdapter } from "@/application/discovery/source-adapters";
import { createOpenRouterDiscoveryEnricher } from "@/application/discovery/ai-enrichment";
import { SupabaseDiscoveryRunRepository } from "@/server/discovery-run-repository";
import { demoDiscoveryResults } from "@/application/discovery/demo-data";
import { readEnv } from "@/server/env";
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
    const client = createSupabaseServiceRoleClient();
    const repository = new SupabaseDiscoveryRunRepository(client);
    const env = readEnv();
    if (!env.OPENROUTER_API_KEY) throw new Error("Discovery AI provider is not configured");
    const enricher = createOpenRouterDiscoveryEnricher({ apiKey: env.OPENROUTER_API_KEY, model: env.AI_MODEL ?? "google/gemini-2.5-flash", baseUrl: env.OPENROUTER_BASE_URL });
    const data = await new DiscoveryService(createConfiguredDiscoveryAdapter(), repository, enricher).search(input, actor.id);
    return { data, error: undefined };
  } catch (error) {
    console.error("[DISCOVERY_RUN_FAILED]", { requestId, error: error instanceof Error ? error.message : String(error) });
    return { data: undefined, ...toSafeError(error, requestId) };
  }
}

export async function runDemoDiscovery(input: unknown) {
  const requestId = randomUUID();
  try {
    const actor = await requireActiveHr();
    const client = createSupabaseServiceRoleClient();
    const source = { search: async () => demoDiscoveryResults.map((candidate) => ({ source: candidate.source, externalId: candidate.externalId, profileUrl: candidate.profileUrl, fullName: candidate.fullName, role: candidate.role, company: candidate.company, skills: candidate.skills, experienceYears: Number(candidate.experience.match(/\d+/)?.[0] ?? 0), profileText: [candidate.experience, candidate.education, candidate.expectedSalary, ...candidate.evidence].join(" "), raw: { location: candidate.location, education: candidate.education, expectedSalary: candidate.expectedSalary, experience: candidate.experience } })) };
    const env = readEnv();
    if (!env.OPENROUTER_API_KEY) throw new Error("Discovery AI provider is not configured");
    const enricher = createOpenRouterDiscoveryEnricher({ apiKey: env.OPENROUTER_API_KEY, model: env.AI_MODEL ?? "google/gemini-2.5-flash", baseUrl: env.OPENROUTER_BASE_URL });
    const data = await new DiscoveryService(source, new SupabaseDiscoveryRunRepository(client), enricher).search(input, actor.id);
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
    const client = createSupabaseServiceRoleClient();
    const data = await new DiscoveryService(createPersistedSourceAdapter(new SupabaseDiscoveryRunRepository(client)), new SupabaseDiscoveryRunRepository(client)).approve(value.runId, value.externalId, value.jobId, actor.id, value.idempotencyKey);
    return { data, error: undefined };
  } catch (error) {
    return { data: undefined, ...toSafeError(error, requestId) };
  }
}

export async function listPendingDiscovery(input: unknown) {
  const requestId = randomUUID();
  try {
    const value = z.object({ jobId: z.string().uuid() }).parse(input);
    await requireActiveHr();
    const repository = new SupabaseDiscoveryRunRepository(createSupabaseServiceRoleClient());
    return { data: await repository.listPendingResults(value.jobId), error: undefined };
  } catch (error) {
    return { data: undefined, ...toSafeError(error, requestId) };
  }
}

export async function rejectDiscoveryResult(input: unknown) {
  const requestId = randomUUID();
  try {
    const value = z.object({ runId: z.string().uuid(), externalId: z.string().min(1).max(200) }).parse(input);
    const actor = await requireActiveHr();
    const { data, error } = await createSupabaseServiceRoleClient().rpc("reject_discovery_result", { p_run_id: value.runId, p_external_id: value.externalId, p_actor_id: actor.id });
    if (error) throw error;
    return { data, error: undefined };
  } catch (error) {
    return { data: undefined, ...toSafeError(error, requestId) };
  }
}
