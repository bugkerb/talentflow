export const errorCodes = ["VALIDATION_ERROR", "NOT_FOUND", "CONFLICT", "IDEMPOTENCY_CONFLICT", "UNAUTHORIZED", "FORBIDDEN", "INTERNAL_ERROR"] as const;
export type ErrorCode = (typeof errorCodes)[number];
export class AppError extends Error {
  constructor(public readonly code: ErrorCode, message: string, public readonly status: number = code === "CONFLICT" || code === "IDEMPOTENCY_CONFLICT" ? 409 : code === "NOT_FOUND" ? 404 : code === "VALIDATION_ERROR" ? 400 : 500, public readonly details?: Record<string, unknown>) { super(message); }
}
export const toSafeError = (error: unknown, requestId: string): { error: { code: ErrorCode; message: string; requestId: string } } => {
  if (error instanceof AppError) return { error: { code: error.code, message: error.message, requestId } };
  return { error: { code: "INTERNAL_ERROR", message: "เกิดข้อผิดพลาดภายในระบบ", requestId } };
};
