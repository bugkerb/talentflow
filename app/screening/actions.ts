"use server";
import { randomUUID } from "node:crypto";
import { ResumeService } from "@/application/resume-service";
import { ScreeningRuntime } from "@/application/screening-runtime";
import { requireActiveHr } from "@/server/auth";
import { AppError, toSafeError } from "@/server/errors";
import { SupabaseResumeRepository } from "@/server/resume-repository";
import { createSupabaseServerClient } from "@/server/supabase-server";
import { InMemoryRateLimiter, rateLimitKey, rateLimitPolicies } from "@/server/rate-limit";
import { createConfiguredScreeningAdapter } from "@/server/screening-provider";
import { SupabaseScreeningRepository } from "@/server/screening-repository";
import { readEnv } from "@/server/env";

const uploadRateLimiter = new InMemoryRateLimiter(rateLimitPolicies.upload);

export async function uploadResume(candidateId: string, file: File) { const requestId = randomUUID(); try { const actor = await requireActiveHr(); const rate = uploadRateLimiter.check(rateLimitKey("upload", actor.id)); if (!rate.allowed) throw new AppError("RATE_LIMITED", "คำขอมากเกินไป กรุณาลองใหม่ภายหลัง", 429); const client = await createSupabaseServerClient(); return { data: await new SupabaseResumeRepository(client).insert(candidateId, actor.id, randomUUID(), await new ResumeService().validateUpload(file)) }; } catch (error) { return toSafeError(error, requestId); } }
export async function downloadResume(resumeId: string) { const requestId = randomUUID(); try { await requireActiveHr(); const client = await createSupabaseServerClient(); const file = await new SupabaseResumeRepository(client).download(resumeId); return { data: { ...file, bytes: Buffer.from(file.bytes).toString("base64") } }; } catch (error) { return toSafeError(error, requestId); } }
export async function deleteResume(resumeId: string) { const requestId = randomUUID(); try { const actor = await requireActiveHr(); const client = await createSupabaseServerClient(); await new SupabaseResumeRepository(client).delete(resumeId, actor.id); return { data: { deleted: true } }; } catch (error) { return toSafeError(error, requestId); } }

export async function runScreening(input: unknown) {
  const requestId = randomUUID();
  try {
    const actor = await requireActiveHr();
    const client = await createSupabaseServerClient();
    const env = readEnv();
    const runtime = new ScreeningRuntime(createConfiguredScreeningAdapter(env), new SupabaseScreeningRepository(client), { provider: env.AI_PROVIDER, model: env.AI_MODEL });
    return { data: await runtime.run(input, actor.id) };
  } catch (error) {
    return toSafeError(error, requestId);
  }
}
