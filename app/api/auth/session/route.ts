import { NextResponse } from "next/server";
import { requireActiveHr } from "@/server/auth";
import { toSafeError } from "@/server/errors";
import { requestIdFrom } from "@/server/request-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = requestIdFrom(request.headers.get("x-request-id"));
  const headers = { "Cache-Control": "no-store", "X-Request-ID": requestId };

  try {
    const actor = await requireActiveHr();
    return NextResponse.json({ data: { actor }, requestId }, { headers });
  } catch (error) {
    const safe = toSafeError(error, requestId);
    const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 500;
    return NextResponse.json(safe, { status, headers });
  }
}
