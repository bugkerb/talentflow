import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireActiveHr } from "@/server/auth";
import { createSupabaseServerClient } from "@/server/supabase-server";
import { encryptGoogleToken, exchangeGoogleCode } from "@/server/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const cookieStore = await cookies();
  const expected = cookieStore.get("talentflow_google_oauth_state")?.value;
  const normalizedExpected = expected ? decodeURIComponent(expected) : "";
  if (!state || !code || !normalizedExpected || state !== normalizedExpected) return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  try {
    const actor = await requireActiveHr();
    const { refreshToken } = await exchangeGoogleCode(code);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("integration_credentials").upsert({ owner_id: actor.id, provider: "google_calendar", calendar_id: "primary", refresh_token_ciphertext: encryptGoogleToken(refreshToken) }, { onConflict: "owner_id,provider" });
    if (error) throw new Error("Failed to store Google Calendar credentials");
    const response = NextResponse.redirect(new URL("/settings?google_calendar=connected", url));
    response.cookies.delete("talentflow_google_oauth_state");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/settings?google_calendar=error", url));
  }
}
