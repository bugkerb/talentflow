import { WorkspacePage } from "../../components/workspace";
import type { ScreeningJob } from "../../components/screening-workspace";
import { requireActiveHr } from "../../src/server/auth";
import { createSupabaseServerClient } from "../../src/server/supabase-server";

export const dynamic = "force-dynamic";

type JobRow = { id: string; title: string; description: string };

export default async function ScreeningPage() {
  await requireActiveHr();
  const client = await createSupabaseServerClient();
  try {
    const jobsResult = await client.from("jobs").select("id,title,description").eq("status", "open").is("deleted_at", null).order("created_at", { ascending: false });
    if (jobsResult.error) throw jobsResult.error;
    const jobs = (jobsResult.data as JobRow[]).map((job): ScreeningJob => ({ id: job.id, title: job.title, description: job.description }));
    return <WorkspacePage page="screening" screeningData={{ targets: [], history: [], jobs, loadError: null }} />;
  } catch {
    return <WorkspacePage page="screening" screeningData={{ targets: [], history: [], jobs: [], loadError: "โหลดตำแหน่งงานสำหรับคัดกรองไม่สำเร็จ กรุณาลองใหม่" }} />;
  }
}
