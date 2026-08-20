import { describe, expect, it } from "vitest";
import { createFixtureScreeningAdapter, ScreeningError } from "@/application/ai";
import { ScreeningRuntime, type ScreeningRepository } from "@/application/screening-runtime";

const request = {
  applicationId: "00000000-0000-0000-0000-000000000030",
  resumeId: "00000000-0000-0000-0000-000000000050",
  jobDescription: "Senior TypeScript engineer",
  resumeText: "Ten years of TypeScript experience"
};

const repository = () => {
  const records: Parameters<ScreeningRepository["insert"]>[0][] = [];
  return { records, insert: async (record: Parameters<ScreeningRepository["insert"]>[0]) => { records.push(record); return record; } } satisfies ScreeningRepository & { records: typeof records };
};

describe("ScreeningRuntime", () => {
  it("runs the configured screening core and persists the validated result", async () => {
    const store = repository();
    const result = await new ScreeningRuntime(createFixtureScreeningAdapter("strong"), store, { provider: "fixture", model: "deterministic" }).run(request, "00000000-0000-0000-0000-000000000001");

    expect(result.screening.status).toBe("completed");
    expect(result.screening.applicationId).toBe(request.applicationId);
    expect(result.screening.resumeId).toBe(request.resumeId);
    expect(result.screening.rawOutput).toEqual(result.result);
    expect(result.screening.createdBy).toBe("00000000-0000-0000-0000-000000000001");
    expect(store.records).toHaveLength(1);
  });

  it("rejects invalid resource identifiers before calling the provider or repository", async () => {
    const store = repository();
    await expect(new ScreeningRuntime(createFixtureScreeningAdapter("strong"), store, { provider: "fixture" }).run({ ...request, resumeId: "not-a-uuid" }, "actor")).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
    expect(store.records).toHaveLength(0);
  });

  it("maps malformed AI output to a stable client-safe error", async () => {
    const store = repository();
    await expect(new ScreeningRuntime(createFixtureScreeningAdapter("malformed"), store, { provider: "fixture" }).run(request, "actor")).rejects.toMatchObject({ code: "AI_OUTPUT_INVALID", status: 422 });
  });

  it("maps provider failures without exposing provider details", async () => {
    const store = repository();
    const adapter = { screen: async () => { throw ScreeningError.fromProviderStatus(429); } };
    await expect(new ScreeningRuntime(adapter, store, { provider: "openrouter" }).run(request, "actor")).rejects.toMatchObject({ code: "AI_PROVIDER_RATE_LIMITED", status: 429, message: "AI provider rate limit exceeded" });
  });
});
