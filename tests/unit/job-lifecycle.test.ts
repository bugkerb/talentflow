import { describe, expect, it } from "vitest";
import { JobService, type JobRecord, type JobRepository } from "@/application/job-service";

const job = (overrides: Partial<JobRecord> = {}): JobRecord => ({
  id: "job-1",
  title: "Tech Lead",
  description: "Lead the engineering team",
  status: "draft",
  version: 1,
  updatedBy: "creator",
  ...overrides
});

const repository = (initial: JobRecord | null = job()): JobRepository => {
  let current = initial;
  return {
    async findAll() { return current ? [current] : []; },
    async findById() { return current; },
    async insert(value) { current = value; return value; },
    async update(_id, expectedVersion, patch, actorId) {
      if (!current || current.version !== expectedVersion) return null;
      current = { ...current, ...patch, version: current.version + 1, updatedBy: actorId };
      return current;
    }
  };
};

describe("JobService lifecycle", () => {
  it("creates a draft with authenticated creation and update attribution", async () => {
    const result = await new JobService(repository(null), () => new Date("2026-08-21T00:00:00.000Z")).create({ title: "Tech Lead", description: "Lead the engineering team" }, "hr-0", "job-1");

    expect(result).toMatchObject({ createdBy: "hr-0", updatedBy: "hr-0", createdAt: "2026-08-21T00:00:00.000Z", updatedAt: "2026-08-21T00:00:00.000Z" });
  });

  it("publishes a draft job with an opening audit timestamp", async () => {
    const result = await new JobService(repository(), () => new Date("2026-08-21T00:00:00.000Z")).publish("job-1", 1, "hr-1");

    expect(result).toMatchObject({
      status: "open",
      version: 2,
      updatedBy: "hr-1",
      openedAt: "2026-08-21T00:00:00.000Z"
    });
  });

  it("preserves an existing opening timestamp when a draft is published", async () => {
    const result = await new JobService(repository(job({ openedAt: "2026-08-19T00:00:00.000Z" })), () => new Date("2026-08-21T00:00:00.000Z")).publish("job-1", 1, "hr-1");

    expect(result.openedAt).toBe("2026-08-19T00:00:00.000Z");
  });

  it("pauses an open job without losing its opening audit", async () => {
    const result = await new JobService(repository(job({ status: "open", version: 2, openedAt: "2026-08-20T00:00:00.000Z" })), () => new Date("2026-08-21T00:00:00.000Z")).pause("job-1", 2, "hr-2");

    expect(result).toMatchObject({
      status: "paused",
      version: 3,
      updatedBy: "hr-2",
      openedAt: "2026-08-20T00:00:00.000Z"
    });
  });

  it("closes a paused job with required close attribution", async () => {
    const result = await new JobService(repository(job({ status: "paused", version: 3 })), () => new Date("2026-08-21T01:00:00.000Z")).close("job-1", 3, "hr-3", { reason: "Role filled", note: "Offer accepted" });

    expect(result).toMatchObject({
      status: "closed",
      version: 4,
      updatedBy: "hr-3",
      closedAt: "2026-08-21T01:00:00.000Z",
      closedBy: "hr-3",
      closeReason: "Role filled",
      closeNote: "Offer accepted"
    });
  });

  it("closes an open job without an optional note", async () => {
    const result = await new JobService(repository(job({ status: "open", version: 2 })), () => new Date("2026-08-21T01:30:00.000Z")).close("job-1", 2, "hr-3", { reason: "Hiring complete" });

    expect(result.closeNote).toBeNull();
  });

  it("edits job details while preserving lifecycle status and recording the actor", async () => {
    const result = await new JobService(repository(job({ status: "open", version: 2, openedAt: "2026-08-20T00:00:00.000Z" })), () => new Date("2026-08-21T02:00:00.000Z")).update("job-1", { title: "Principal Tech Lead", description: "Lead two teams", status: "draft" }, 2, "hr-4");

    expect(result).toMatchObject({
      title: "Principal Tech Lead",
      status: "open",
      version: 3,
      updatedBy: "hr-4",
      updatedAt: "2026-08-21T02:00:00.000Z",
      openedAt: "2026-08-20T00:00:00.000Z"
    });
  });

  it("rejects invalid lifecycle transitions and stale versions", async () => {
    const service = new JobService(repository(job({ status: "closed", version: 2 })));

    await expect(service.publish("job-1", 2, "hr-1")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(service.pause("job-1", 1, "hr-1")).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(service.pause("job-1", 2, "hr-1")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(service.close("job-1", 2, "hr-1", { reason: "Already closed" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(new JobService(repository(job({ status: "open", version: 2 }))).close("job-1", 2, "hr-1", { reason: "   " })).rejects.toMatchObject({ name: "ZodError" });
  });

  it("turns a repository compare-and-swap miss into a conflict", async () => {
    const race: JobRepository = {
      async findAll() { return [job()]; },
      async findById() { return job(); },
      async insert(value) { return value; },
      async update() { return null; }
    };

    await expect(new JobService(race).publish("job-1", 1, "hr-1")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects an invalid expected version before reading the job", async () => {
    const service = new JobService(repository());

    await expect(service.publish("job-1", 0, "hr-1")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
