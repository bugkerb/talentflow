import { NextResponse } from "next/server";
import { requestIdFrom } from "@/server/request-context";
import { readEnv } from "@/server/env";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const requestId = requestIdFrom(request.headers.get("x-request-id"));
  const env = readEnv();
  const headers = { "Cache-Control": "no-store", "X-Request-ID": requestId };
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ status: "degraded", service: "talentflow", requestId, checks: { configuration: "missing", supabase: "not_checked" } }, { status: 503, headers });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY }, signal: controller.signal, cache: "no-store" });
    const healthy = response.ok;
    return NextResponse.json({ status: healthy ? "ok" : "degraded", service: "talentflow", requestId, checks: { configuration: "ok", supabase: healthy ? "ok" : "unhealthy" } }, { status: healthy ? 200 : 503, headers });
  } catch {
    return NextResponse.json({ status: "degraded", service: "talentflow", requestId, checks: { configuration: "ok", supabase: "unreachable" } }, { status: 503, headers });
  } finally {
    clearTimeout(timeout);
  }
}
