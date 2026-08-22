import { WorkspacePage } from "../../components/workspace";
import { requireActiveHr } from "@/server/auth";
import { createSupabaseServerClient } from "@/server/supabase-server";

export default async function SettingsPage() {
  const actor = await requireActiveHr();
  const client = await createSupabaseServerClient();
  const { data } = await client.from("integration_credentials").select("id").eq("owner_id", actor.id).eq("provider", "google_calendar").maybeSingle();
  return <WorkspacePage page="settings" googleCalendarConnected={Boolean(data)} />;
}
