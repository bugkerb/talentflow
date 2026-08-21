import { parseTrackerFilters } from "@/application/application-tracker";
import { ApplicationsView } from "../../components/applications-view";
import { loadApplicationTracker } from "@/server/application-tracker";

export const dynamic = "force-dynamic";

type ApplicationsPageProps = { searchParams?: Record<string, string | string[] | undefined> };

export default async function ApplicationsPage({ searchParams = {} }: ApplicationsPageProps) {
  const initialFilters = parseTrackerFilters(searchParams);
  try {
    const data = await loadApplicationTracker();
    return <ApplicationsView data={data} initialFilters={initialFilters} />;
  } catch {
    return <ApplicationsView data={{ applications: [], candidates: [], jobs: [] }} initialFilters={initialFilters} loadError />;
  }
}
