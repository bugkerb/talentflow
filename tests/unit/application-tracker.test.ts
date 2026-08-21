import { describe, expect, it } from "vitest";
import {
  filterApplications,
  groupApplicationsByStage,
  parseTrackerFilters,
  serializeTrackerFilters,
  toTrackerApplication,
  type TrackerApplication,
} from "@/application/application-tracker";

const applications: TrackerApplication[] = [
  {
    id: "a1",
    candidateId: "c1",
    jobId: "j1",
    stage: "screening",
    status: "active",
    version: 1,
    appliedAt: "2026-08-20T00:00:00.000Z",
    candidate: { id: "c1", fullName: "Narin Chaiyapruk", email: "narin@example.com", source: "referral" },
    job: { id: "j1", title: "Tech Lead", status: "open" },
  },
  {
    id: "a2",
    candidateId: "c2",
    jobId: "j1",
    stage: "interview",
    status: "active",
    version: 2,
    appliedAt: "2026-08-19T00:00:00.000Z",
    candidate: { id: "c2", fullName: "Pimchanok Tester", email: "pim@example.com", source: "manual" },
    job: { id: "j1", title: "Tech Lead", status: "open" },
  },
];

describe("application tracker state", () => {
  it("normalizes a Supabase join into the public tracker record", () => {
    expect(toTrackerApplication({
      id: "a1",
      candidate_id: "c1",
      job_id: "j1",
      stage: "screening",
      status: "active",
      version: 1,
      applied_at: "2026-08-20T00:00:00.000Z",
      candidates: { id: "c1", full_name: "Narin Chaiyapruk", email: "narin@example.com", source: "referral" },
      jobs: { id: "j1", title: "Tech Lead", status: "open" },
    })).toEqual(applications[0]);
  });

  it("filters by search, job, stage, and source without mutating the loaded records", () => {
    const filters = { view: "board" as const, search: "pim", jobId: "j1", stage: "interview" as const, source: "manual" as const };
    expect(filterApplications(applications, filters).map((item) => item.id)).toEqual(["a2"]);
    expect(applications.map((item) => item.id)).toEqual(["a1", "a2"]);
  });

  it("groups filtered applications into stable stage columns", () => {
    const grouped = groupApplicationsByStage(applications);
    expect(Object.keys(grouped)).toEqual(["screening", "phone_screen", "interview", "offer", "hired", "rejected"]);
    expect(grouped.screening.map((item) => item.id)).toEqual(["a1"]);
    expect(grouped.phone_screen).toEqual([]);
  });

  it("parses and serializes only supported URL state", () => {
    const parsed = parseTrackerFilters(new URLSearchParams("view=list&search=Narin&job=j1&stage=screening&source=referral"));
    expect(parsed).toEqual({ view: "list", search: "Narin", jobId: "j1", stage: "screening", source: "referral" });
    expect(serializeTrackerFilters(parsed)).toBe("view=list&search=Narin&job=j1&stage=screening&source=referral");
    expect(parseTrackerFilters(new URLSearchParams("view=wat&stage=nope&source=nope"))).toEqual({ view: "board", search: "", jobId: "", stage: "all", source: "all" });
  });
});
