import { JobService } from "@/application/job-service";
import { JobsPage as JobsPageView } from "../../components/jobs-page";
import { requireActiveHr } from "@/server/auth";
import { SupabaseJobRepository } from "@/server/job-repository";
import { createSupabaseServerClient } from "@/server/supabase-server";

export const dynamic = "force-dynamic";
export default async function JobsPage() {
  await requireActiveHr();
  const jobs = await new JobService(new SupabaseJobRepository(await createSupabaseServerClient())).list();
  return <JobsPageView initialJobs={jobs} />;
}
