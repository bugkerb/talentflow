import { requireActiveHr } from "@/server/auth";
import { createSupabaseServerClient } from "@/server/supabase-server";
import { JobService } from "@/application/job-service";
import { SupabaseJobRepository } from "@/server/job-repository";
import { DiscoveryPage } from "../../components/discovery-page";

export const dynamic = "force-dynamic";
export default async function DiscoveryRoute() {
  await requireActiveHr();
  const jobs = await new JobService(new SupabaseJobRepository(await createSupabaseServerClient())).list();
  return <DiscoveryPage jobs={jobs} />;
}
