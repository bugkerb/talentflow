import { WorkspacePage } from "../../components/workspace";
import type { ScreeningHistory, ScreeningTarget } from "../../components/screening-workspace";
import { requireActiveHr } from "../../src/server/auth";
import { createSupabaseServerClient } from "../../src/server/supabase-server";

export const dynamic = "force-dynamic";

type ApplicationRow = { id: string; candidate_id: string; job_id: string };
type CandidateRow = { id: string; full_name: string };
type JobRow = { id: string; title: string; description: string };
type ResumeRow = { id: string; candidate_id: string; file_name: string };
type ScreeningRow = { id: string; application_id: string; resume_id: string; status: string; raw_output: { score?: number; summary?: string; evidence?: string[]; riskFlags?: string[] } | null; created_at: string };

export default async function ScreeningPage() {
  await requireActiveHr();
  const client = await createSupabaseServerClient();
  try {
    const applicationsResult = await client.from("applications").select("id,candidate_id,job_id").eq("status", "active").is("deleted_at", null);
    if (applicationsResult.error) throw applicationsResult.error;
    const applications = (applicationsResult.data ?? []) as ApplicationRow[];
    const candidateIds = [...new Set(applications.map((row) => row.candidate_id))];
    const jobIds = [...new Set(applications.map((row) => row.job_id))];
    const [candidatesResult, jobsResult, resumesResult, screeningsResult] = await Promise.all([
      candidateIds.length ? client.from("candidates").select("id,full_name").in("id", candidateIds).is("deleted_at", null) : Promise.resolve({ data: [], error: null }),
      jobIds.length ? client.from("jobs").select("id,title,description").in("id", jobIds).is("deleted_at", null) : Promise.resolve({ data: [], error: null }),
      candidateIds.length ? client.from("resumes").select("id,candidate_id,file_name").in("candidate_id", candidateIds).is("deleted_at", null).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
      client.from("screenings").select("id,application_id,resume_id,status,raw_output,created_at").order("created_at", { ascending: false }).limit(50),
    ]);
    for (const response of [candidatesResult, jobsResult, resumesResult, screeningsResult]) if (response.error) throw response.error;
    const candidates = new Map((candidatesResult.data as CandidateRow[]).map((row) => [row.id, row]));
    const jobs = new Map((jobsResult.data as JobRow[]).map((row) => [row.id, row]));
    const resumes = new Map<string, ResumeRow>();
    for (const row of resumesResult.data as ResumeRow[]) if (!resumes.has(row.candidate_id)) resumes.set(row.candidate_id, row);
    const targets: ScreeningTarget[] = applications.flatMap((application) => {
      const candidate = candidates.get(application.candidate_id);
      const job = jobs.get(application.job_id);
      if (!candidate || !job) return [];
      const resume = resumes.get(candidate.id);
      return [{ applicationId: application.id, candidateId: candidate.id, candidateName: candidate.full_name, jobId: job.id, jobTitle: job.title, jobDescription: job.description, resumeId: resume?.id ?? null, resumeFileName: resume?.file_name ?? null }];
    });
    const history: ScreeningHistory[] = (screeningsResult.data as ScreeningRow[]).map((row) => ({ id: row.id, applicationId: row.application_id, resumeId: row.resume_id, status: row.status, score: row.raw_output?.score ?? null, summary: row.raw_output?.summary ?? "", evidence: row.raw_output?.evidence ?? [], risks: row.raw_output?.riskFlags ?? [], createdAt: row.created_at }));
    return <WorkspacePage page="screening" screeningData={{ targets, history, loadError: null }} />;
  } catch {
    return <WorkspacePage page="screening" screeningData={{ targets: [], history: [], loadError: "โหลดข้อมูลคัดกรองจากระบบไม่สำเร็จ กรุณาลองใหม่" }} />;
  }
}
