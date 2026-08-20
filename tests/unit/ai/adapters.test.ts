import { describe, expect, it, vi } from "vitest";
import { createAnthropicScreeningAdapter, createOpenRouterScreeningAdapter } from "@/application/ai";

const request = { jobDescription: "job", resumeText: "resume" };
const result = { score: 88, recommendation: "strong", summary: "Good fit", evidence: ["Relevant experience"], riskFlags: [], promptVersion: "ai-screening-v1" };

describe("network adapter contracts", () => {
  it("builds an Anthropic request without exposing credentials in the prompt", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(result) }] }), { status: 200 }));
    await createAnthropicScreeningAdapter({ apiKey: "test-secret", fetcher }).screen(request);
    expect(fetcher).toHaveBeenCalledWith("https://api.anthropic.com/v1/messages", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "x-api-key": "test-secret" }) }));
    expect(String(fetcher.mock.calls[0][1].body)).not.toContain("test-secret");
  });

  it("parses an OpenRouter response through the shared adapter interface", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(result) } }] }), { status: 200 }));
    const actual = await createOpenRouterScreeningAdapter({ apiKey: "test-secret", fetcher }).screen(request);
    expect(actual).toMatchObject({ score: 88, recommendation: "strong" });
  });
});
