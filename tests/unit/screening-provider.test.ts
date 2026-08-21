import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createConfiguredScreeningAdapter } from "@/server/screening-provider";

describe("configured screening provider", () => {
  it("builds a configured OpenRouter adapter without exposing credentials in errors", () => {
    expect(createConfiguredScreeningAdapter({ AI_PROVIDER: "openrouter", OPENROUTER_API_KEY: "test-key" })).toBeDefined();
  });

  it("fails with a safe configuration error when a credential is missing", () => {
    expect(() => createConfiguredScreeningAdapter({ AI_PROVIDER: "openrouter" })).toThrow("AI screening provider is not configured");
    expect(() => createConfiguredScreeningAdapter({ AI_PROVIDER: "anthropic" })).toThrow("AI screening provider is not configured");
  });
});
