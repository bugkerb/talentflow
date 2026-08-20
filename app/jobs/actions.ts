"use server";

import { randomUUID } from "node:crypto";
import { JobService, type JobRecord } from "@/application/job-service";
import { requireActiveHr } from "@/server/auth";
import { toSafeError } from "@/server/errors";
import { SupabaseJobRepository } from "@/server/job-repository";
import { createSupabaseServerClient } from "@/server/supabase-server";

export type JobActionError = { code: string; message: string; requestId: string };
export type JobActionResult<T = JobRecord> = { data?: T; error?: JobActionError };
export type CreateJobResult = JobActionResult;

async function runJobAction<T>(operation: (service: JobService, actorId: string) => Promise<T>): Promise<JobActionResult<T>> {
  const requestId = randomUUID();
  try {
    const actor = await requireActiveHr();
    const service = new JobService(new SupabaseJobRepository(await createSupabaseServerClient()));
    return { data: await operation(service, actor.id) };
  } catch (error) {
    return toSafeError(error, requestId);
  }
}

export async function createDraftJob(input: unknown): Promise<CreateJobResult> {
  return runJobAction((service, actorId) => service.create({ ...(typeof input === "object" && input !== null ? input : {}), status: "draft" }, actorId, randomUUID()));
}

export async function updateJob(id: string, input: unknown, expectedVersion: number): Promise<JobActionResult> {
  return runJobAction((service, actorId) => service.update(id, input, expectedVersion, actorId));
}

export async function publishJob(id: string, expectedVersion: number): Promise<JobActionResult> {
  return runJobAction((service, actorId) => service.publish(id, expectedVersion, actorId));
}

export async function pauseJob(id: string, expectedVersion: number): Promise<JobActionResult> {
  return runJobAction((service, actorId) => service.pause(id, expectedVersion, actorId));
}

export async function closeJob(id: string, expectedVersion: number, input: unknown): Promise<JobActionResult> {
  return runJobAction((service, actorId) => service.close(id, expectedVersion, actorId, input));
}
