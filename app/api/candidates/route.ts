import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { CandidateCrudService } from "@/application/candidate-service";
import { AppError, toSafeError } from "@/server/errors";
import { requireActiveHr } from "@/server/auth";
import { createSupabaseServerClient } from "@/server/supabase-server";
import { SupabaseCandidateRepository } from "@/server/candidate-repository";
import { requestIdFrom } from "@/server/request-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = requestIdFrom(request.headers.get("x-request-id"));
  try {
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey) throw new AppError("VALIDATION_ERROR", "ต้องระบุ idempotency key", 400);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("VALIDATION_ERROR", "ข้อมูลผู้สมัครไม่ถูกต้อง", 400);
    const actor = await requireActiveHr();
    const client = await createSupabaseServerClient(request);
    const requestHash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
    const data = await new CandidateCrudService(new SupabaseCandidateRepository(client)).createWithApplication(body, actor.id, idempotencyKey, requestHash);
    return NextResponse.json({ data, requestId }, { status: 201, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch (error) {
    const safe = toSafeError(error, requestId);
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(safe, { status, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  }
}
