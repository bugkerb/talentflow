// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";

vi.mock("next/navigation", () => ({ usePathname: () => "/applications" }));
vi.mock("../../app/auth/actions", () => ({ logoutAction: vi.fn() }));

import { ApplicationsView } from "../../components/applications-view";
import type { ApplicationTrackerData } from "../../src/application/application-tracker";

const data: ApplicationTrackerData = {
  candidates: [
    { id: "candidate-1", fullName: "วิชญะ อารีรัตน์", email: "wichaya@example.com", source: "referral" },
    { id: "candidate-2", fullName: "ณัฐกานต์ วงศ์สว่าง", email: "natakarn@example.com", source: "manual" },
  ],
  jobs: [{ id: "job-1", title: "Senior Frontend Developer", status: "open" }],
  applications: [
    { id: "application-1", candidateId: "candidate-1", jobId: "job-1", stage: "screening", status: "active", version: 1, appliedAt: "2026-08-22T08:00:00.000Z", candidate: { id: "candidate-1", fullName: "วิชญะ อารีรัตน์", email: "wichaya@example.com", source: "referral" }, job: { id: "job-1", title: "Senior Frontend Developer", status: "open" } },
    { id: "application-2", candidateId: "candidate-2", jobId: "job-1", stage: "interview", status: "active", version: 2, appliedAt: "2026-08-21T08:00:00.000Z", candidate: { id: "candidate-2", fullName: "ณัฐกานต์ วงศ์สว่าง", email: "natakarn@example.com", source: "manual" }, job: { id: "job-1", title: "Senior Frontend Developer", status: "open" } },
  ],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const installLocalStorage = (): void => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
  Object.defineProperty(window, "localStorage", { configurable: true, value: globalThis.localStorage });
};

describe("ApplicationsView board counts", () => {
  it("shows the number of candidates visible after filtering", () => {
    installLocalStorage();
    render(React.createElement(ApplicationsView, { data }));

    fireEvent.change(screen.getByRole("combobox", { name: "ขั้นตอน" }), { target: { value: "screening" } });

    expect(screen.getByText("1 ใบสมัครที่แสดง")).toBeTruthy();
    expect(screen.getByText("วิชญะ อารีรัตน์")).toBeTruthy();
    expect(screen.queryByText("ณัฐกานต์ วงศ์สว่าง")).toBeNull();
  });

  it("updates visible count when a candidate changes stage", async () => {
    installLocalStorage();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { stage: "interview", version: 3, updatedBy: "hr-1" } }) }));
    render(React.createElement(ApplicationsView, { data }));

    fireEvent.change(screen.getByRole("combobox", { name: "เปลี่ยนขั้นตอนของ วิชญะ อารีรัตน์" }), { target: { value: "interview" } });

    expect(await screen.findByText("2 ใบสมัครที่แสดง")).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith("/api/applications/application-1", expect.objectContaining({ method: "PATCH" }));
  });
});
