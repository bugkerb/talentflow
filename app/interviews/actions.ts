"use server";

import { randomUUID } from "node:crypto";
import { InterviewService } from "@/application/interview-service";
import { GoogleCalendarProvider } from "@/application/calendar-provider";
import { requireActiveHr } from "@/server/auth";
import { toSafeError } from "@/server/errors";
import { SupabaseInterviewRepository } from "@/server/interview-repository";
import { createSupabaseServerClient } from "@/server/supabase-server";

const getService = async () => {
  const client = await createSupabaseServerClient();
  const actor = await requireActiveHr();
  return new InterviewService(new SupabaseInterviewRepository(client), await GoogleCalendarProvider.fromSupabase(client, actor.id));
};
export async function scheduleInterview(input: unknown) { const requestId = randomUUID(); try { const actor = await requireActiveHr(); const value = input as { id?: string; idempotencyKey?: string }; if (!value.id || !value.idempotencyKey) throw new Error("ต้องระบุรหัสคำขอสำหรับการนัดหมาย"); return { data: await (await getService()).schedule(input, actor.id, value.id, value.idempotencyKey) }; } catch (error) { return toSafeError(error, requestId); } }
export async function rescheduleInterview(input: unknown, expectedVersion: number) { const requestId = randomUUID(); try { const actor = await requireActiveHr(); return { data: await (await getService()).reschedule(input, actor.id, expectedVersion) }; } catch (error) { return toSafeError(error, requestId); } }
export async function cancelInterview(input: unknown, expectedVersion: number) { const requestId = randomUUID(); try { const actor = await requireActiveHr(); return { data: await (await getService()).cancel(input, actor.id, expectedVersion) }; } catch (error) { return toSafeError(error, requestId); } }
