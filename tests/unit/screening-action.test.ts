import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/server/errors";

vi.mock("server-only", () => ({}));

const auth = vi.hoisted(() => ({ requireActiveHr: vi.fn() }));
const repository = vi.hoisted(() => ({ insert: vi.fn(async (record: unknown) => record) }));

vi.mock("@/server/auth", () => auth);
vi.mock("@/server/supabase-server", () => ({ createSupabaseServerClient: vi.fn(async () => ({})) }));
vi.mock("@/server/screening-provider", () => ({ createConfiguredScreeningAdapter: () => ({ screen: async () => ({ score: 90, recommendation: "strong", summary: "Good fit", evidence: ["Relevant experience"], riskFlags: [], promptVersion: "ai-screening-v1" }) }) }));
vi.mock("@/server/screening-repository", () => ({ SupabaseScreeningRepository: class { insert = repository.insert; } }));
vi.mock("@/server/env", () => ({ readEnv: () => ({ AI_PROVIDER: "fixture", AI_MODEL: undefined }) }));

import { runScreening } from "../../app/screening/actions";

const request = { applicationId: "00000000-0000-0000-0000-000000000030", resumeId: "00000000-0000-0000-0000-000000000050", jobDescription: "Senior TypeScript engineer", resumeText: "Ten years of TypeScript experience" };

describe("runScreening server action", () => {
  beforeEach(() => {
    auth.requireActiveHr.mockResolvedValue({ id: "00000000-0000-0000-0000-000000000001", role: "hr" });
    repository.insert.mockClear();
  });

  it("requires the authenticated HR boundary and persists a completed result", async () => {
    const response = await runScreening(request);
    expect(auth.requireActiveHr).toHaveBeenCalledOnce();
    expect("data" in response && response.data.screening.status).toBe("completed");
    expect(repository.insert).toHaveBeenCalledOnce();
  });

  it("returns a stable unauthorized error without provider details", async () => {
    auth.requireActiveHr.mockRejectedValueOnce(new AppError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401));
    const response = await runScreening(request);
    expect("error" in response && response.error).toMatchObject({ code: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" });
    expect("error" in response && response.error?.message).not.toContain("api");
  });
});
