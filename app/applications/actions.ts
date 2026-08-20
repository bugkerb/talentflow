"use server";
import { randomUUID } from "node:crypto";
import { ApplicationService } from "@/application/application-service";
import type { Application } from "@/application/ports";
import { requireActiveHr } from "@/server/auth";
import { toSafeError } from "@/server/errors";
import { SupabaseApplicationRepository } from "@/server/application-repository";
import { createSupabaseServerClient } from "@/server/supabase-server";
export type CreateApplicationResult = { data?: Application; error?: { code: string; message: string; requestId: string } };
export async function createApplication(candidateId: string, jobId: string): Promise<CreateApplicationResult> { const requestId = randomUUID(); try { const actor = await requireActiveHr(); const client = await createSupabaseServerClient(); return { data: await new ApplicationService(new SupabaseApplicationRepository(client)).create(candidateId, jobId, actor.id, randomUUID()) }; } catch (error) { return toSafeError(error, requestId); } }
