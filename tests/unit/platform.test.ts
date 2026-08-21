import { describe, expect, it } from "vitest";
import { IdempotencyService } from "@/application/idempotency-service";
import { readEnv } from "@/server/env";
import { createLogger } from "@/server/logger";

describe("platform safeguards", () => {
  it("replays same idempotency request and rejects hash mismatch", () => { const service = new IdempotencyService(); let count = 0; expect(service.execute("apply", "k", { a: 1 }, () => ++count)).toBe(1); expect(service.execute("apply", "k", { a: 1 }, () => ++count)).toBe(1); expect(() => service.execute("apply", "k", { a: 2 }, () => ++count)).toThrowError(/reused/); });
  it("allows fixture only in the test harness and requires a real provider elsewhere", () => {
    expect(readEnv({ AI_PROVIDER: "fixture" }).AI_PROVIDER).toBe("fixture");
    expect(() => readEnv({})).toThrow();
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    expect(() => readEnv({ AI_PROVIDER: "fixture" })).toThrow(/test harness/);
    process.env.NODE_ENV = original;
  });
  it("validates provider credentials at the server boundary", () => { expect(() => readEnv({ AI_PROVIDER: "openrouter" })).toThrow(); expect(() => readEnv({ AI_PROVIDER: "anthropic" })).toThrow(); });
  it("treats empty optional provider secrets as unset", () => { expect(readEnv({ AI_PROVIDER: "fixture", ANTHROPIC_API_KEY: "", OPENROUTER_API_KEY: "" }).ANTHROPIC_API_KEY).toBeUndefined(); });
  it("redacts sensitive logger fields", () => { const original = console.info; let line = ""; console.info = (value: string) => { line = value; }; createLogger("req").info("test", { apiKey: "secret", durationMs: 10 }); console.info = original; expect(line).toContain("[REDACTED]"); expect(line).not.toContain("secret"); });
});
