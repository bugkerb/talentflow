"use server";
import { randomUUID } from "node:crypto";
import { ResumeService } from "@/application/resume-service";
import { requireActiveHr } from "@/server/auth";
import { toSafeError } from "@/server/errors";
import { SupabaseResumeRepository } from "@/server/resume-repository";
import { createSupabaseServerClient } from "@/server/supabase-server";

export async function uploadResume(candidateId: string, file: File) { const requestId = randomUUID(); try { const actor = await requireActiveHr(); const client = await createSupabaseServerClient(); return { data: await new SupabaseResumeRepository(client).insert(candidateId, actor.id, randomUUID(), await new ResumeService().validateUpload(file)) }; } catch (error) { return toSafeError(error, requestId); } }
export async function downloadResume(resumeId: string) { const requestId = randomUUID(); try { await requireActiveHr(); const client = await createSupabaseServerClient(); const file = await new SupabaseResumeRepository(client).download(resumeId); return { data: { ...file, bytes: Buffer.from(file.bytes).toString("base64") } }; } catch (error) { return toSafeError(error, requestId); } }
export async function deleteResume(resumeId: string) { const requestId = randomUUID(); try { const actor = await requireActiveHr(); const client = await createSupabaseServerClient(); await new SupabaseResumeRepository(client).delete(resumeId, actor.id); return { data: { deleted: true } }; } catch (error) { return toSafeError(error, requestId); } }
