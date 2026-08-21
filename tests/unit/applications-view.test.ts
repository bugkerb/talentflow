// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";

vi.mock("next/navigation", () => ({ usePathname: () => "/applications", useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../app/auth/actions", () => ({ logoutAction: vi.fn() }));

import { ApplicationsView } from "../../components/applications-view";
import type { ApplicationTrackerData } from "../../src/application/application-tracker";

const data: ApplicationTrackerData = {
  candidates: [
    { id: "candidate-1", fullName: "วิชญะ อารีรัตน์", email: "wichaya@example.com", phone: "0800000001", source: "referral", sourceDetail: "แนะนำโดยทีม", version: 1 },
    { id: "candidate-2", fullName: "ณัฐกานต์ วงศ์สว่าง", email: "natakarn@example.com", phone: "0800000002", source: "manual", sourceDetail: null, version: 1 },
  ],
  jobs: [{ id: "job-1", title: "Senior Frontend Developer", status: "open" }],
  applications: [
    { id: "application-1", candidateId: "candidate-1", jobId: "job-1", stage: "screening", status: "active", version: 1, appliedAt: "2026-08-22T08:00:00.000Z", candidate: { id: "candidate-1", fullName: "วิชญะ อารีรัตน์", email: "wichaya@example.com", phone: "0800000001", source: "referral", sourceDetail: "แนะนำโดยทีม", version: 1 }, job: { id: "job-1", title: "Senior Frontend Developer", status: "open" } },
    { id: "application-2", candidateId: "candidate-2", jobId: "job-1", stage: "interview", status: "active", version: 2, appliedAt: "2026-08-21T08:00:00.000Z", candidate: { id: "candidate-2", fullName: "ณัฐกานต์ วงศ์สว่าง", email: "natakarn@example.com", phone: "0800000002", source: "manual", sourceDetail: null, version: 1 }, job: { id: "job-1", title: "Senior Frontend Developer", status: "open" } },
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
    expect(screen.getAllByText("วิชญะ อารีรัตน์")).toHaveLength(2);
    expect(screen.getAllByText("ณัฐกานต์ วงศ์สว่าง")).toHaveLength(1);
  });

  it("updates visible count when a candidate changes stage", async () => {
    installLocalStorage();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { stage: "interview", version: 3, updatedBy: "hr-1" } }) }));
    render(React.createElement(ApplicationsView, { data }));

    fireEvent.change(screen.getByRole("combobox", { name: "เปลี่ยนขั้นตอนของ วิชญะ อารีรัตน์" }), { target: { value: "interview" } });

    expect(await screen.findByText("2 ใบสมัครที่แสดง")).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith("/api/applications/application-1", expect.objectContaining({ method: "PATCH" }));
  });

  it("opens the real candidate form and submits an idempotent create request", async () => {
    installLocalStorage();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { candidateId: "candidate-3", applicationId: "application-3" } }) }));
    vi.stubGlobal("crypto", { randomUUID: () => "candidate-idempotency-key" });
    render(React.createElement(ApplicationsView, { data }));
    fireEvent.click(screen.getByRole("button", { name: "เพิ่มผู้สมัคร" }));
    fireEvent.change(screen.getByLabelText("ชื่อผู้สมัคร"), { target: { value: "ผู้สมัครใหม่" } });
    fireEvent.change(screen.getByLabelText("อีเมล"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("เบอร์โทร"), { target: { value: "0812345678" } });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกผู้สมัคร" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith("/api/candidates", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "Idempotency-Key": "candidate-idempotency-key" }) }));
  });
});
