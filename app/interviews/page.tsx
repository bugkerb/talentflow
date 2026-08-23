import { InterviewsView } from "../../components/interviews-view";
import { requireActiveHr } from "@/server/auth";
import { createSupabaseServerClient } from "@/server/supabase-server";
import { SupabaseInterviewRepository } from "@/server/interview-repository";

export const dynamic = "force-dynamic";
export default async function InterviewsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await (searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>));
  const application = params.application;
  const initialScheduleApplicationId = typeof application === "string" ? application : "";
  const initialScheduleDate = typeof params.date === "string" ? params.date : "";
  const initialScheduleStart = typeof params.start === "string" ? params.start : "";
  const initialScheduleEnd = typeof params.end === "string" ? params.end : "";
  await requireActiveHr();
  const client = await createSupabaseServerClient();
  const interviews = await new SupabaseInterviewRepository(client).list();
  return <InterviewsView initialInterviews={interviews} initialScheduleApplicationId={initialScheduleApplicationId} initialScheduleDate={initialScheduleDate} initialScheduleStart={initialScheduleStart} initialScheduleEnd={initialScheduleEnd} />;
}
