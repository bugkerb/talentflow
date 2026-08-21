import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/supabase-server";

export async function POST(_request: Request) {
  // Logout only invalidates the caller's own session; the endpoint remains POST-only
  // and does not perform a privileged state mutation, so form/fetch clients without
  // an Origin header can still sign out safely.
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });

  return NextResponse.json({ data: { signedOut: true } }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
