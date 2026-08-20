import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScreeningRecord, ScreeningRepository } from "@/application/screening-runtime";
import { AppError } from "@/server/errors";

type ScreeningRow = { id: string; application_id: string; resume_id: string; status: "completed"; skills_score: number | null; experience_score: number | null; culture_score: number | null; reasoning: ScreeningRecord["reasoning"]; strengths: string[]; interview_questions: string[]; model: string | null; prompt_version: string; schema_version: string; raw_output: ScreeningRecord["rawOutput"]; error_code: null; created_by: string; created_at: string; completed_at: string };

const columns = "id,application_id,resume_id,status,skills_score,experience_score,culture_score,reasoning,strengths,interview_questions,model,prompt_version,schema_version,raw_output,error_code,created_by,created_at,completed_at";
const toRecord = (row: ScreeningRow): ScreeningRecord => ({ id: row.id, applicationId: row.application_id, resumeId: row.resume_id, status: row.status, skillsScore: row.skills_score, experienceScore: row.experience_score, cultureScore: row.culture_score, reasoning: row.reasoning, strengths: row.strengths, interviewQuestions: row.interview_questions, model: row.model, promptVersion: row.prompt_version, schemaVersion: row.schema_version, rawOutput: row.raw_output, errorCode: row.error_code, createdBy: row.created_by, createdAt: row.created_at, completedAt: row.completed_at });

export class SupabaseScreeningRepository implements ScreeningRepository {
  constructor(private readonly client: SupabaseClient) {}

  async insert(record: ScreeningRecord): Promise<ScreeningRecord> {
    const { data, error } = await this.client.from("screenings").insert({ id: record.id, application_id: record.applicationId, resume_id: record.resumeId, status: record.status, skills_score: record.skillsScore, experience_score: record.experienceScore, culture_score: record.cultureScore, reasoning: record.reasoning, strengths: record.strengths, interview_questions: record.interviewQuestions, model: record.model, prompt_version: record.promptVersion, schema_version: record.schemaVersion, raw_output: record.rawOutput, error_code: record.errorCode, created_by: record.createdBy, created_at: record.createdAt, completed_at: record.completedAt }).select(columns).single();
    if (error) throw new AppError("DATABASE_ERROR", "Unable to persist screening result");
    if (!data) throw new AppError("DATABASE_ERROR", "Screening result was not returned after insert");
    return toRecord(data as ScreeningRow);
  }
}
