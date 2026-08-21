import { NextResponse } from "next/server";
import { requireActiveHr } from "@/server/auth";
import { googleAuthorizationUrl, googleOAuthState } from "@/server/google-oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireActiveHr();
  const state = googleOAuthState();
  const response = NextResponse.redirect(googleAuthorizationUrl(state));
  response.cookies.set("talentflow_google_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
  return response;
}
