import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  actor: vi.fn().mockResolvedValue({ id: "00000000-0000-0000-0000-000000000001" }),
  client: vi.fn().mockResolvedValue({}),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ requireActiveHr: mocks.actor }));
vi.mock("@/server/supabase-server", () => ({ createSupabaseServerClient: mocks.client }));
vi.mock("@/server/candidate-repository", () => ({ SupabaseCandidateRepository: class { constructor(_client: unknown) {} } }));
vi.mock("@/application/candidate-service", () => ({ CandidateCrudService: class {
  createWithApplication = mocks.create;
  update = mocks.update;
  remove = mocks.remove;
} }));

import { POST } from "../../app/api/candidates/route";
import { DELETE, PATCH } from "../../app/api/candidates/[id]/route";

const body = { fullName: "Narin", email: "narin@example.com", phone: "0800000000", source: "manual", jobId: "00000000-0000-0000-0000-000000000010", appliedAt: "2026-08-22T00:00:00.000Z" };

describe("candidate CRUD API boundary", () => {
  it("requires idempotency for candidate creation", async () => {
    const response = await POST(new Request("https://talentflow.test/api/candidates", { method: "POST", body: JSON.stringify(body) }));
    expect(response.status).toBe(400);
    expect(mocks.actor).not.toHaveBeenCalled();
  });

  it("creates through the authenticated service with the idempotency header", async () => {
    mocks.create.mockResolvedValueOnce({ candidateId: "c", applicationId: "a", applicationVersion: 1 });
    const response = await POST(new Request("https://talentflow.test/api/candidates", { method: "POST", headers: { "idempotency-key": "candidate-1", origin: "https://talentflow.test" }, body: JSON.stringify(body) }));
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(body, "00000000-0000-0000-0000-000000000001", "candidate-1", expect.any(String));
  });

  it("rejects stale mutation versions before touching the repository", async () => {
    const response = await PATCH(new Request("https://talentflow.test/api/candidates/c", { method: "PATCH", body: JSON.stringify({ fullName: "Updated" }) }), { params: Promise.resolve({ id: "c" }) });
    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("routes authenticated update and soft-delete mutations", async () => {
    mocks.update.mockResolvedValueOnce({ candidateId: "c" });
    mocks.remove.mockResolvedValueOnce({ id: "c", version: 2 });
    const patchResponse = await PATCH(new Request("https://talentflow.test/api/candidates/c", { method: "PATCH", body: JSON.stringify({ fullName: "Updated", expectedVersion: 1 }) }), { params: Promise.resolve({ id: "c" }) });
    const deleteResponse = await DELETE(new Request("https://talentflow.test/api/candidates/c", { method: "DELETE", body: JSON.stringify({ expectedVersion: 1 }) }), { params: Promise.resolve({ id: "c" }) });
    expect(patchResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith("c", expect.objectContaining({ fullName: "Updated" }), 1, "00000000-0000-0000-0000-000000000001", undefined);
    expect(mocks.remove).toHaveBeenCalledWith("c", 1, "00000000-0000-0000-0000-000000000001");
  });
});
