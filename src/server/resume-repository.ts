import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RESUME_BUCKET, type ValidatedResume } from "@/application/resume-service";
import { AppError } from "@/server/errors";

type ResumeRow = { id: string; candidate_id: string; storage_path: string; file_name: string; mime_type: string; file_size_bytes: number };
export type StoredResume = { id: string; candidateId: string; storagePath: string; fileName: string; mimeType: string; fileSizeBytes: number };
export type DownloadedResume = { fileName: string; mimeType: string; bytes: ArrayBuffer };
const columns = "id,candidate_id,storage_path,file_name,mime_type,file_size_bytes";
const toResume = (row: ResumeRow): StoredResume => ({ id: row.id, candidateId: row.candidate_id, storagePath: row.storage_path, fileName: row.file_name, mimeType: row.mime_type, fileSizeBytes: row.file_size_bytes });
const throwOnError = (error: { message: string } | null): void => { if (error) throw new Error(error.message); };

export class SupabaseResumeRepository {
  constructor(private readonly client: SupabaseClient) {}
  async insert(candidateId: string, actorId: string, resumeId: string, file: ValidatedResume): Promise<StoredResume> {
    const storagePath = `${candidateId}/${resumeId}/${file.fileName}`;
    const upload = await this.client.storage.from(RESUME_BUCKET).upload(storagePath, file.bytes, { contentType: file.mimeType, upsert: false });
    throwOnError(upload.error);
    const contentHash = createHash("sha256").update(Buffer.from(file.bytes)).digest("hex");
    const { data, error } = await this.client.from("resumes").insert({ id: resumeId, candidate_id: candidateId, storage_path: storagePath, file_name: file.fileName, mime_type: file.mimeType, file_size_bytes: file.fileSizeBytes, content_hash: contentHash, created_by: actorId, updated_by: actorId }).select(columns).single();
    if (error || !data) { await this.client.storage.from(RESUME_BUCKET).remove([storagePath]); throwOnError(error); throw new Error("Resume was not returned after insert"); }
    return toResume(data as ResumeRow);
  }
  async download(id: string): Promise<DownloadedResume> { const { data: row, error } = await this.client.from("resumes").select(columns).eq("id", id).is("deleted_at", null).maybeSingle(); throwOnError(error); if (!row) throw new AppError("NOT_FOUND", "Resume not found"); const result = await this.client.storage.from(RESUME_BUCKET).download((row as ResumeRow).storage_path); throwOnError(result.error); if (!result.data) throw new AppError("NOT_FOUND", "Resume file not found"); return { fileName: (row as ResumeRow).file_name, mimeType: (row as ResumeRow).mime_type, bytes: await result.data.arrayBuffer() }; }
  async delete(id: string, actorId: string): Promise<void> { const { data: row, error } = await this.client.from("resumes").select("storage_path").eq("id", id).is("deleted_at", null).maybeSingle(); throwOnError(error); if (!row) throw new AppError("NOT_FOUND", "Resume not found"); const storage = await this.client.storage.from(RESUME_BUCKET).remove([(row as { storage_path: string }).storage_path]); throwOnError(storage.error); const update = await this.client.from("resumes").update({ deleted_at: new Date().toISOString(), deleted_by: actorId, updated_by: actorId }).eq("id", id).is("deleted_at", null); throwOnError(update.error); }
}
