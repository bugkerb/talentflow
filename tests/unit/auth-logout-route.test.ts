import { afterEach, describe, expect, it, vi } from "vitest";

const signOut = vi.fn(async () => ({ error: null }));

vi.mock("@/server/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { signOut } }))
}));

import { POST } from "../../app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
  afterEach(() => {
    signOut.mockClear();
  });

  it("signs out the current session and redirects to login", async () => {
    const response = await POST(new Request("https://talentflow.example/api/auth/logout", {
      method: "POST",
      headers: {
        Origin: "https://talentflow.example",
        Cookie: "sb-example-auth-token=session"
      }
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { signedOut: true } });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
