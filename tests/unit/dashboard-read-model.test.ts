import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readDashboard } from "@/server/dashboard-read-model";

class Query {
  constructor(private readonly count: number) {}
  select() { return this; }
  eq() { return this; }
  is() { return this; }
  gte() { return this; }
  lt() { return this; }
  in() { return this; }
  then(resolve: (value: { count: number; error: null }) => unknown) { return Promise.resolve(resolve({ count: this.count, error: null })); }
}

describe("dashboard read model", () => {
  it("maps live query counts into dashboard metrics and actions", async () => {
    let queryNumber = 0;
    const counts = [6, 3, 8, 4, 2, 1, 3];
    const client = { from: () => new Query(counts[queryNumber++] ?? 0) };
    const result = await readDashboard(client as never, new Date("2026-08-22T03:00:00.000Z"));
    expect(result.metrics).toEqual({ openJobs: 6, newCandidates: 3, interviewing: 8, interviewsThisWeek: 4 });
    expect(result.actions).toEqual({ pendingScreenings: 2, interviewsToday: 1, newApplications: 3 });
  });
});
