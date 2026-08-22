import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { assertSameOriginRequest, assertServerActionOrigin } from "@/server/security";
import { AppError } from "@/server/errors";
import { InMemoryRateLimiter, rateLimitKey } from "@/server/rate-limit";
import { createAuthRateLimiter } from "@/server/auth-abuse";
import { requestIdFrom } from "@/server/request-context";

describe("runtime security boundaries", () => {
  it("accepts same-origin mutations and rejects cross-origin or originless mutations", () => {
    const sameOrigin = new Request("https://talentflow.example/api/mutate", {
      method: "POST",
      headers: { Origin: "https://talentflow.example" }
    });
    const crossOrigin = new Request("https://talentflow.example/api/mutate", {
      method: "POST",
      headers: { Origin: "https://attacker.example" }
    });
    const originless = new Request("https://talentflow.example/api/mutate", { method: "POST" });

    expect(() => assertSameOriginRequest(sameOrigin)).not.toThrow();
    expect(() => assertSameOriginRequest(crossOrigin)).toThrowError(AppError);
    expect(() => assertSameOriginRequest(originless)).toThrowError(AppError);
    expect(() => assertSameOriginRequest(new Request("https://talentflow.example/api/mutate"))).not.toThrow();
  });

  it("requires a same-origin Origin header for cookie-writing server actions", () => {
    const sameOrigin = new Headers({
      "Next-Action": "action-id",
      Origin: "https://talentflow.example",
      Host: "talentflow.example"
    });
    const crossOrigin = new Headers({
      "Next-Action": "action-id",
      Origin: "https://attacker.example",
      Host: "talentflow.example"
    });
    const originless = new Headers({ "Next-Action": "action-id", Host: "talentflow.example" });

    expect(() => assertServerActionOrigin(sameOrigin)).not.toThrow();
    expect(() => assertServerActionOrigin(new Headers({ "Next-Action": "action-id", Origin: "http://localhost:3000", Host: "localhost:3000" }))).not.toThrow();
    expect(() => assertServerActionOrigin(crossOrigin)).toThrowError(AppError);
    expect(() => assertServerActionOrigin(originless)).toThrowError(AppError);
    expect(() => assertServerActionOrigin(new Headers({ "Next-Action": "action-id", Origin: "http://talentflow.example", Host: "talentflow.example", "X-Forwarded-Proto": "https" }))).toThrowError(AppError);
    expect(() => assertServerActionOrigin(new Headers())).not.toThrow();
  });

  it("blocks repeated attempts within a window and expires them deterministically", () => {
    let now = 1_000;
    const limiter = new InMemoryRateLimiter({ limit: 2, windowMs: 10_000, now: () => now });
    const key = rateLimitKey("login", "  HR@Example.COM ", "203.0.113.10");

    expect(limiter.check(key).allowed).toBe(true);
    expect(limiter.check(key).allowed).toBe(true);
    expect(limiter.check(key)).toMatchObject({ allowed: false, retryAfterSeconds: 10 });
    now = 11_000;
    expect(limiter.check(key)).toMatchObject({ allowed: true, remaining: 1 });
  });

  it("applies authentication limits independently by account and client address", () => {
    let now = 1_000;
    const limiter = createAuthRateLimiter({ now: () => now, limit: 2, windowMs: 10_000 });

    expect(limiter.check("hr@example.com", "203.0.113.10").allowed).toBe(true);
    expect(limiter.check("hr@example.com", "203.0.113.11").allowed).toBe(true);
    expect(limiter.check("hr@example.com", "203.0.113.12").allowed).toBe(false);
    expect(limiter.check("other@example.com", "203.0.113.10").allowed).toBe(true);
    expect(limiter.check("other-2@example.com", "203.0.113.10").allowed).toBe(false);
    now = 11_000;
    expect(limiter.check("hr@example.com", "203.0.113.12").allowed).toBe(true);
  });

  it("keeps the application header baseline restrictive", () => {
    const config = readFileSync(new URL("../../next.config.mjs", import.meta.url), "utf8");

    expect(config).toContain("Content-Security-Policy");
    expect(config).toContain("object-src 'none'");
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain('const isDevelopment = process.env.NODE_ENV !== "production"');
    expect(config).toContain('isDevelopment ? " \'unsafe-eval\'" : ""');
    expect(config).toContain('X-Content-Type-Options", value: "nosniff"');
    expect(config).toContain('X-Frame-Options", value: "DENY"');
  });

  it("does not trust unbounded request IDs", () => {
    expect(requestIdFrom("req_123")).toBe("req_123");
    expect(requestIdFrom("x".repeat(129))).toMatch(/^[0-9a-f-]{36}$/);
    expect(requestIdFrom("bad\nheader")).toMatch(/^[0-9a-f-]{36}$/);
  });
});
