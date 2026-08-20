"use server";

import { randomUUID } from "node:crypto";
import { JobService, type JobRecord } from "@/application/job-service";
import { requireActiveHr } from "@/server/auth";
import { toSafeError } from "@/server/errors";
import { SupabaseJobRepository } from "@/server/job-repository";
import { createSupabaseServerClient } from "@/server/supabase-server";

export type CreateJobResult = { data?: JobRecord; error?: { code: string; message: string } };
export async function createDraftJob(input: unknown): Promise<CreateJobResult> {
  const requestId = randomUUID();
  try {
    const actor = await requireActiveHr();
    const client = await createSupabaseServerClient();
    const job = await new JobService(new SupabaseJobRepository(client)).create({ ...(typeof input === "object" && input !== null ? input : {}), status: "draft" }, actor.id, randomUUID());
    return { data: job };
  } catch (error) {
    return toSafeError(error, requestId);
  }
}
