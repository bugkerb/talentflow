import { NextResponse } from "next/server";
import { transitionSchema } from "@/domain/schemas";
import { ApplicationService } from "@/application/application-service";
import { AppError, toSafeError } from "@/server/errors";
import { requestIdFrom } from "@/server/request-context";
import { createSupabaseServerClient } from "@/server/supabase-server";
import { SupabaseApplicationRepository } from "@/server/supabase-application-repository";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = requestIdFrom(request.headers.get("x-request-id"));
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const input = transitionSchema.safeParse({ ...(body && typeof body === "object" ? body : {}), applicationId: id });
    if (!input.success) throw new AppError("VALIDATION_ERROR", "ข้อมูลการเปลี่ยนขั้นตอนไม่ถูกต้อง", 400);

    const supabase = await createSupabaseServerClient();
    const user = await supabase.auth.getUser();
    if (user.error || !user.data.user) throw new AppError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบก่อนเปลี่ยนขั้นตอน", 401);

    const application = await new ApplicationService(new SupabaseApplicationRepository(supabase)).move(input.data.applicationId, input.data.toStage, input.data.expectedVersion, user.data.user.id, input.data.reason);
    return NextResponse.json({ data: application, requestId }, { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch (error) {
    const safe = toSafeError(error, requestId);
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(safe, { status, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  }
}
