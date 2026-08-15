const sensitive = /token|secret|password|api.?key|cv.?text|prompt|signed.?url/i;
const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sensitive.test(key) ? "[REDACTED]" : redact(item)]));
  return value;
};
export const createLogger = (requestId: string) => ({ info: (message: string, fields: Record<string, unknown> = {}) => console.info(JSON.stringify(redact({ level: "info", requestId, message, ...fields }))), error: (message: string, fields: Record<string, unknown> = {}) => console.error(JSON.stringify(redact({ level: "error", requestId, message, ...fields }))) });
