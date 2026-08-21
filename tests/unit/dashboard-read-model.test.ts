import { describe, expect, it, vi } from "vitest";
import { readDashboard } from "@/server/dashboard-read-model";

vi.mock("server-only", () => ({}));

function clientWithCounts(counts: Array<number | null>) {
  let index = 0;
  const query = () => {
    const value = {
      eq: () => value,
      is: () => value,
      in: () => value,
      gte: () => value,
      lt: () => value,
      then: (resolve: (result: { count: number | null; error: null }) => void) => resolve({ count: counts[index++], error: null }),
    };
    return value;
  };
  return { from: () => ({ select: () => query() }) } as never;
}

describe("dashboard read model", () => {
  it("maps live count queries into metrics and actions", async () => {
    const model = await readDashboard(clientWithCounts([6, 3, 8, 4, 8, 2, 3]), new Date("2026-08-22T03:00:00.000Z"));
    expect(model.metrics).toEqual({ openJobs: 6, newCandidates: 3, interviewing: 8, interviewsThisWeek: 4 });
    expect(model.actions).toEqual({ pendingScreenings: 8, interviewsToday: 2, newApplications: 3 });
  });

  it("returns zero for empty tables without placeholder records", async () => {
    const model = await readDashboard(clientWithCounts([null, null, null, null, null, null, null]), new Date("2026-08-22T03:00:00.000Z"));
    expect(model.metrics).toEqual({ openJobs: 0, newCandidates: 0, interviewing: 0, interviewsThisWeek: 0 });
    expect(model.actions).toEqual({ pendingScreenings: 0, interviewsToday: 0, newApplications: 0 });
  });
});
