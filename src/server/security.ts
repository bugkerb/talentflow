import { AppError } from "./errors";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

const rejectOrigin = (): never => {
  throw new AppError("FORBIDDEN", "คำขอไม่ผ่านการตรวจสอบแหล่งที่มา", 403);
};

const originFrom = (value: string | null): string | null => {
  if (!value || value === "null") return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const assertSameOriginRequest = (request: Request): void => {
  if (safeMethods.has(request.method.toUpperCase())) return;

  const requestOrigin = originFrom(request.headers.get("origin"));
  const expectedOrigin = originFrom(request.url);
  if (!requestOrigin || !expectedOrigin || requestOrigin !== expectedOrigin) rejectOrigin();
};

const firstHeaderValue = (headers: Headers, name: string): string | null => headers.get(name)?.split(",", 1)[0]?.trim() || null;

export const assertServerActionOrigin = (headers: Headers): void => {
  if (!headers.has("next-action")) return;

  const origin = originFrom(headers.get("origin"));
  const host = firstHeaderValue(headers, "x-forwarded-host") ?? firstHeaderValue(headers, "host");
  const protocol = firstHeaderValue(headers, "x-forwarded-proto");
  if (!origin || !host) return rejectOrigin();

  const originUrl = new URL(origin);
  if (originUrl.host !== host || (protocol && originUrl.protocol !== `${protocol}:`)) rejectOrigin();
};
