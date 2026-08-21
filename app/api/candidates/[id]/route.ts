import { NextResponse } from "next/server";
import { CandidateCrudService } from "@/application/candidate-service";
import { AppError, toSafeError } from "@/server/errors";
import { requireActiveHr } from "@/server/auth";
import { createSupabaseServerClient } from "@/server/supabase-server";
import { SupabaseCandidateRepository } from "@/server/candidate-repository";
import { requestIdFrom } from "@/server/request-context";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

const parseBody = async (request: Request): Promise<Record<string, unknown>> => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("VALIDATION_ERROR", "ข้อมูลผู้สมัครไม่ถูกต้อง", 400);
  return body as Record<string, unknown>;
};

export async function PATCH(request: Request, { params }: Context) {
  const requestId = requestIdFrom(request.headers.get("x-request-id"));
  try {
    const { id } = await params;
    const body = await parseBody(request);
    const expectedVersion = body.expectedVersion;
    if (typeof expectedVersion !== "number" || !Number.isInteger(expectedVersion) || expectedVersion < 1) throw new AppError("VALIDATION_ERROR", "เวอร์ชันผู้สมัครไม่ถูกต้อง", 400);
    const applicationId = typeof body.applicationId === "string" ? body.applicationId : undefined;
    const applicationVersion = body.applicationVersion;
    const appliedAt = body.appliedAt;
    if ((applicationId && (typeof applicationVersion !== "number" || typeof appliedAt !== "string")) || (!applicationId && (applicationVersion !== undefined || appliedAt !== undefined))) throw new AppError("VALIDATION_ERROR", "ข้อมูลใบสมัครไม่ครบถ้วน", 400);
    const actor = await requireActiveHr();
    const client = await createSupabaseServerClient(request);
    const data = await new CandidateCrudService(new SupabaseCandidateRepository(client)).update(id, body, expectedVersion, actor.id, applicationId ? { id: applicationId, expectedVersion: applicationVersion as number, appliedAt: appliedAt as string } : undefined);
    return NextResponse.json({ data, requestId }, { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch (error) {
    const safe = toSafeError(error, requestId);
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(safe, { status, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const requestId = requestIdFrom(request.headers.get("x-request-id"));
  try {
    const { id } = await params;
    const body = await parseBody(request);
    const expectedVersion = body.expectedVersion;
    if (typeof expectedVersion !== "number" || !Number.isInteger(expectedVersion) || expectedVersion < 1) throw new AppError("VALIDATION_ERROR", "เวอร์ชันผู้สมัครไม่ถูกต้อง", 400);
    const actor = await requireActiveHr();
    const client = await createSupabaseServerClient(request);
    const data = await new CandidateCrudService(new SupabaseCandidateRepository(client)).remove(id, expectedVersion, actor.id);
    return NextResponse.json({ data, requestId }, { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch (error) {
    const safe = toSafeError(error, requestId);
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(safe, { status, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  }
}
