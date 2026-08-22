import { describe, expect, it, vi } from "vitest";
import { createAnthropicScreeningAdapter, createOpenRouterScreeningAdapter } from "@/application/ai";

const request = { jobDescription: "job", resumeText: "resume" };
const result = {
  score: 8,
  recommendation: "strong",
  evidence: ["มีประสบการณ์ TypeScript"],
  scores: { skills: 8, experience: 8, cultureCommunication: 7 },
  reasoning: { skills: "ทักษะตรง", experience: "ประสบการณ์ตรง", cultureCommunication: "มีหลักฐานการทำงานร่วมทีม" },
  summary: "เหมาะสมกับตำแหน่ง",
  strengths: ["TypeScript"],
  prescreenQuestions: ["อธิบายระบบที่เคยออกแบบ"],
  teamInterviewReport: { summary: "ควรสัมภาษณ์ต่อ", focusAreas: ["System design"], recommendation: "strong" },
  riskFlags: [],
  promptVersion: "ai-screening-v1"
};

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
    expect(actual).toMatchObject({ score: 8, recommendation: "strong" });
    const body = JSON.parse(String(fetcher.mock.calls[0][1].body));
    expect(body.provider).toEqual({ require_parameters: true });
    expect(body.response_format).toMatchObject({ type: "json_schema", json_schema: { name: "talentflow_screening", strict: true, schema: { additionalProperties: false } } });
    expect(body.response_format.json_schema.schema.required).toContain("teamInterviewReport");
    expect(body.messages[0].content).toContain("RESUME (untrusted evidence)");
    expect(body.messages[0].content).not.toContain("test-secret");
  });
});
