import { describe, expect, it } from "vitest";
import { ApplicationService } from "@/application/application-service";
import type { Application, ApplicationRepository, PipelineEvent } from "@/application/ports";
import { AppError } from "@/server/errors";

const repo = (initial: Application | null = null, forceUpdateConflict = false): ApplicationRepository & { events: PipelineEvent[] } => { let current = initial; const events: PipelineEvent[] = []; return { events, async findById() { return current; }, async findByCandidateAndJob() { return current; }, async insert(value) { current = value; return value; }, async updateStage(_id, expected, stage, actor) { if (forceUpdateConflict || !current || current.version !== expected) return null; current = { ...current, stage, version: current.version + 1, updatedBy: actor }; return current; }, async addPipelineEvent(event) { events.push(event); } }; };
describe("ApplicationService", () => {
  it("creates an application once and rejects duplicates", async () => { const r = repo(); const s = new ApplicationService(r); await s.create("c", "j", "u", "a"); await expect(s.create("c", "j", "u", "b")).rejects.toMatchObject({ code: "CONFLICT" }); });
  it("moves a stage and writes an immutable event", async () => { const r = repo({ id: "a", candidateId: "c", jobId: "j", stage: "screening", version: 1, updatedBy: null }); const result = await new ApplicationService(r).move("a", "phone_screen", 1, "u", "ผ่านเกณฑ์"); expect(result.version).toBe(2); expect(r.events[0].toStage).toBe("phone_screen"); });
  it("rejects stale and invalid transitions", async () => { const r = repo({ id: "a", candidateId: "c", jobId: "j", stage: "screening", version: 2, updatedBy: null }); const s = new ApplicationService(r); await expect(s.move("a", "phone_screen", 1, "u")).rejects.toMatchObject({ code: "CONFLICT" }); await expect(s.move("a", "hired", 2, "u")).rejects.toMatchObject({ code: "VALIDATION_ERROR" }); });
  it("returns not found", async () => { await expect(new ApplicationService(repo()).move("missing", "phone_screen", 1, "u")).rejects.toBeInstanceOf(AppError); });
  it("converts a repository race into conflict", async () => { await expect(new ApplicationService(repo({ id: "a", candidateId: "c", jobId: "j", stage: "screening", version: 1, updatedBy: null }, true)).move("a", "phone_screen", 1, "u")).rejects.toMatchObject({ code: "CONFLICT" }); });
});
