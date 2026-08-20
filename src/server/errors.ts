export const errorCodes = ["VALIDATION_ERROR", "NOT_FOUND", "CONFLICT", "IDEMPOTENCY_CONFLICT", "UNAUTHORIZED", "FORBIDDEN", "INTERNAL_ERROR"] as const;
export type ErrorCode = (typeof errorCodes)[number];
const defaultStatusByCode: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  INTERNAL_ERROR: 500
};
export class AppError extends Error {
  constructor(public readonly code: ErrorCode, message: string, public readonly status: number = defaultStatusByCode[code], public readonly details?: Record<string, unknown>) { super(message); }
}
export const toSafeError = (error: unknown, requestId: string): { error: { code: ErrorCode; message: string; requestId: string } } => {
  if (error instanceof AppError) return { error: { code: error.code, message: error.message, requestId } };
  return { error: { code: "INTERNAL_ERROR", message: "เกิดข้อผิดพลาดภายในระบบ", requestId } };
};
