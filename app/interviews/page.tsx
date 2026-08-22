import { InterviewsView } from "../../components/interviews-view";
import { requireActiveHr } from "@/server/auth";
import { createSupabaseServerClient } from "@/server/supabase-server";
import { SupabaseInterviewRepository } from "@/server/interview-repository";
import { GoogleCalendarProvider } from "@/application/calendar-provider";
import type { CalendarEventSummary } from "@/application/interview-ports";

export const dynamic = "force-dynamic";
export default async function InterviewsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await (searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>));
  const application = params.application;
  const initialScheduleApplicationId = typeof application === "string" ? application : "";
  const actor = await requireActiveHr();
  const client = await createSupabaseServerClient();
  const interviews = await new SupabaseInterviewRepository(client).list();
  let calendarEvents: CalendarEventSummary[] = [];
  let calendarError = "";
  try {
    const provider = await GoogleCalendarProvider.fromSupabase(client, actor.id);
    const rangeStart = new Date();
    rangeStart.setDate(rangeStart.getDate() - rangeStart.getDay());
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + 42);
    calendarEvents = await provider.listEvents({ timeMin: rangeStart.toISOString(), timeMax: rangeEnd.toISOString() });
  } catch (error) {
    calendarError = error instanceof Error ? error.message : "ไม่สามารถโหลดกิจกรรมจาก Google Calendar ได้";
  }
  return <InterviewsView initialInterviews={interviews} initialCalendarEvents={calendarEvents} calendarError={calendarError} initialScheduleApplicationId={initialScheduleApplicationId} />;
}
