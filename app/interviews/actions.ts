"use server";

import { randomUUID } from "node:crypto";
import { InterviewService } from "@/application/interview-service";
import { GoogleCalendarProvider, OnsiteCalendarProvider } from "@/application/calendar-provider";
import { requireActiveHr } from "@/server/auth";
import { toSafeError } from "@/server/errors";
import { SupabaseInterviewRepository } from "@/server/interview-repository";
import { createSupabaseServerClient } from "@/server/supabase-server";
import type { InterviewRecord } from "@/application/interview-ports";

const getService = async (format: "online" | "onsite" = "online") => {
  const client = await createSupabaseServerClient();
  const actor = await requireActiveHr();
  const provider = format === "onsite" ? new OnsiteCalendarProvider() : await GoogleCalendarProvider.fromSupabase(client, actor.id);
  return new InterviewService(new SupabaseInterviewRepository(client), provider);
};
export async function scheduleInterview(input: unknown) { const requestId = randomUUID(); try { const actor = await requireActiveHr(); const value = input as { id?: string; idempotencyKey?: string }; if (!value.id || !value.idempotencyKey) throw new Error("ต้องระบุรหัสคำขอสำหรับการนัดหมาย"); return { data: await (await getService()).schedule(input, actor.id, value.id, value.idempotencyKey) }; } catch (error) { return toSafeError(error, requestId); } }
export async function scheduleApplicationInterview(input: { applicationId: string; startsAt: string; endsAt: string; timezone: string; interviewType: string; interviewerName: string; format: "online" | "onsite"; description?: string; additionalQuestions?: string }): Promise<{ data?: InterviewRecord; error?: { message: string }; message?: string }> {
  const requestId = randomUUID();
  try {
    const actor = await requireActiveHr();
    const id = randomUUID();
    const interviewerDescription = `ผู้สัมภาษณ์: ${input.interviewerName.trim() || "ผู้ใช้ปัจจุบัน"}`;
    return { data: await (await getService(input.format)).schedule({ ...input, interviewerId: actor.id, description: [interviewerDescription, input.description ?? "นัดหมายจากระบบติดตามผู้สมัคร"].join("\n"), additionalQuestions: input.additionalQuestions ?? "" }, actor.id, id, randomUUID()) };
  } catch (error) { return toSafeError(error, requestId); }
}
export async function rescheduleInterview(input: unknown, expectedVersion: number) { const requestId = randomUUID(); try { const actor = await requireActiveHr(); return { data: await (await getService()).reschedule(input, actor.id, expectedVersion) }; } catch (error) { return toSafeError(error, requestId); } }
export async function cancelInterview(input: unknown, expectedVersion: number) { const requestId = randomUUID(); try { const actor = await requireActiveHr(); return { data: await (await getService()).cancel(input, actor.id, expectedVersion) }; } catch (error) { return toSafeError(error, requestId); } }
