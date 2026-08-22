export const errorCodes = ["VALIDATION_ERROR", "NOT_FOUND", "CONFLICT", "INTERVIEW_CONFLICT", "IDEMPOTENCY_CONFLICT", "CALENDAR_CONFIGURATION_ERROR", "CALENDAR_PROVIDER_ERROR", "UNAUTHORIZED", "FORBIDDEN", "RATE_LIMITED", "AI_OUTPUT_INVALID", "AI_PROVIDER_RATE_LIMITED", "AI_PROVIDER_UNAVAILABLE", "DATABASE_ERROR", "INTERNAL_ERROR"] as const;
export type ErrorCode = (typeof errorCodes)[number];
const defaultStatusByCode: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERVIEW_CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  CALENDAR_CONFIGURATION_ERROR: 503,
  CALENDAR_PROVIDER_ERROR: 502,
  RATE_LIMITED: 429,
  AI_OUTPUT_INVALID: 422,
  AI_PROVIDER_RATE_LIMITED: 429,
  AI_PROVIDER_UNAVAILABLE: 503,
  DATABASE_ERROR: 500,
  INTERNAL_ERROR: 500
};
export class AppError extends Error {
  constructor(public readonly code: ErrorCode, message: string, public readonly status: number = defaultStatusByCode[code], public readonly details?: Record<string, unknown>) { super(message); }
}
export const toSafeError = (error: unknown, requestId: string): { error: { code: ErrorCode; message: string; requestId: string } } => {
  if (error instanceof AppError) return { error: { code: error.code, message: error.message, requestId } };
  if (error instanceof Error && error.name === "ZodError") return { error: { code: "VALIDATION_ERROR", message: "ข้อมูลค้นหาไม่ถูกต้อง กรุณาตรวจสอบตำแหน่งงานและเกณฑ์การค้นหา", requestId } };
  return { error: { code: "INTERNAL_ERROR", message: "เกิดข้อผิดพลาดภายในระบบ", requestId } };
};
