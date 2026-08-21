import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { readEnv } from "@/server/env";
import { SupabaseDiscoveryRunRepository } from "@/server/discovery-run-repository";

export const dynamic = "force-dynamic";
const record = z.object({ source: z.string().min(1).max(80), externalId: z.string().min(1).max(200), profileUrl: z.string().url().max(2000), fullName: z.string().min(1).max(200), email: z.string().email().max(320).optional(), phone: z.string().max(50).optional(), role: z.string().max(200).optional(), company: z.string().max(200).optional(), skills: z.array(z.string().max(80)).max(40), experienceYears: z.number().int().min(0).max(80).optional(), profileText: z.string().min(1).max(20000), raw: z.record(z.unknown()).default({}) });
const body = z.object({ records: z.array(record).max(200) });

export async function POST(request: Request) {
  const env = readEnv();
  const expected = env.DISCOVERY_SOURCE_API_KEY;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Discovery sink is not configured" }, { status: 503 });
  try {
    const payload = body.parse(await request.json());
    const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    await new SupabaseDiscoveryRunRepository(client).saveSourceRecords(payload.records);
    return NextResponse.json({ data: { accepted: payload.records.length } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid discovery payload" }, { status: 400 });
  }
}
