import { InterviewsView } from "../../components/interviews-view";
import { requireActiveHr } from "@/server/auth";
import { createSupabaseServerClient } from "@/server/supabase-server";
import { SupabaseInterviewRepository } from "@/server/interview-repository";

export const dynamic = "force-dynamic";
export default async function InterviewsPage() {
  await requireActiveHr();
  const interviews = await new SupabaseInterviewRepository(await createSupabaseServerClient()).list();
  return <InterviewsView initialInterviews={interviews} />;
}
