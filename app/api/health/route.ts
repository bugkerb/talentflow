import { NextResponse } from "next/server";
import { requestIdFrom } from "@/server/request-context";
import { readEnv } from "@/server/env";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const requestId = requestIdFrom(request.headers.get("x-request-id"));
  const env = readEnv();
  const configured = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return NextResponse.json({ status: configured ? "ok" : "degraded", service: "talentflow", requestId, checks: { configuration: configured ? "ok" : "missing" } }, { status: configured ? 200 : 503, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
}
