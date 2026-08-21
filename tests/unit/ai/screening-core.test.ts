import { describe, expect, it } from "vitest";
import {
  AI_SCREENING_PROMPT_VERSION,
  ScreeningError,
  createFixtureScreeningAdapter,
  createScreeningService,
  screeningResultSchema,
} from "@/application/ai";

describe("provider-agnostic AI screening core", () => {
  it("returns a strictly validated, versioned result from the strong fixture", async () => {
    const service = createScreeningService(createFixtureScreeningAdapter("strong"));
    const result = await service.screen({ jobDescription: "Senior TypeScript engineer", resumeText: "10 years TypeScript" });
    expect(screeningResultSchema.parse(result)).toEqual(result);
    expect(result.recommendation).toBe("strong");
    expect(result.promptVersion).toBe(AI_SCREENING_PROMPT_VERSION);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(10);
  });

  it.each(["weak", "missing", "prompt-injection"] as const)("handles the %s fixture deterministically", async (fixture) => {
    const service = createScreeningService(createFixtureScreeningAdapter(fixture));
    const result = await service.screen({ jobDescription: "Senior TypeScript engineer", resumeText: "candidate text" });
    expect(result.fixture).toBe(fixture);
    expect(result.recommendation).toBe("weak");
    expect(result.riskFlags).toEqual(fixture === "prompt-injection" ? ["prompt_injection"] : fixture === "missing" ? ["insufficient_evidence"] : []);
  });

  it("maps malformed provider output to a stable error", async () => {
    const service = createScreeningService({ screen: async () => ({ score: "not-a-number" }) });
    await expect(service.screen({ jobDescription: "job", resumeText: "resume" })).rejects.toMatchObject({ code: "MALFORMED_OUTPUT" });
  });

  it("rejects blank screening inputs before the adapter is called", async () => {
    const service = createScreeningService(createFixtureScreeningAdapter("strong"));
    await expect(service.screen({ jobDescription: " ", resumeText: "resume" })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("exposes stable provider error mapping", () => {
    expect(ScreeningError.fromProviderStatus(401).code).toBe("PROVIDER_AUTH");
    expect(ScreeningError.fromProviderStatus(429).code).toBe("PROVIDER_RATE_LIMIT");
    expect(ScreeningError.fromProviderStatus(503).code).toBe("PROVIDER_UNAVAILABLE");
  });
});
