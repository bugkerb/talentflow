import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardReadModel = {
  updatedAt: string;
  actions: {
    pendingScreenings: number;
    interviewsToday: number;
    newApplications: number;
  };
  metrics: {
    openJobs: number;
    newCandidates: number;
    interviewing: number;
    interviewsThisWeek: number;
  };
};

type CountResult = { count: number | null; error: { message: string } | null };

function countOrThrow(result: CountResult, label: string): number {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.count ?? 0;
}

function rangeFromNow(base: Date, days: number): { start: string; end: string } {
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function readDashboard(client: SupabaseClient, now = new Date()): Promise<DashboardReadModel> {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const week = rangeFromNow(now, 7);

  const [openJobs, activeCandidates, interviewing, interviewsThisWeek, pendingScreenings, interviewsToday, newApplications] = await Promise.all([
    client.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open").is("deleted_at", null) as unknown as Promise<CountResult>,
    client.from("candidates").select("id", { count: "exact", head: true }).is("deleted_at", null).gte("created_at", week.start) as unknown as Promise<CountResult>,
    client.from("applications").select("id", { count: "exact", head: true }).eq("stage", "interview").eq("status", "active").is("deleted_at", null) as unknown as Promise<CountResult>,
    client.from("interviews").select("id", { count: "exact", head: true }).eq("status", "scheduled").gte("starts_at", week.start).lt("starts_at", week.end) as unknown as Promise<CountResult>,
    client.from("screenings").select("id", { count: "exact", head: true }).in("status", ["pending", "processing", "needs_review"]) as unknown as Promise<CountResult>,
    client.from("interviews").select("id", { count: "exact", head: true }).eq("status", "scheduled").gte("starts_at", todayStart.toISOString()).lt("starts_at", tomorrow.toISOString()) as unknown as Promise<CountResult>,
    client.from("applications").select("id", { count: "exact", head: true }).eq("status", "active").is("deleted_at", null).gte("created_at", todayStart.toISOString()) as unknown as Promise<CountResult>
  ]);

  return {
    updatedAt: new Date().toISOString(),
    actions: {
      pendingScreenings: countOrThrow(pendingScreenings, "screenings"),
      interviewsToday: countOrThrow(interviewsToday, "interviews today"),
      newApplications: countOrThrow(newApplications, "applications"),
    },
    metrics: {
      openJobs: countOrThrow(openJobs, "jobs"),
      newCandidates: countOrThrow(activeCandidates, "candidates"),
      interviewing: countOrThrow(interviewing, "applications"),
      interviewsThisWeek: countOrThrow(interviewsThisWeek, "interviews this week"),
    },
  };
}
