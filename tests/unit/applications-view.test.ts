// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";

vi.mock("next/navigation", () => ({ usePathname: () => "/applications", useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../app/auth/actions", () => ({ logoutAction: vi.fn() }));
vi.mock("server-only", () => ({}));

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
    expect(screen.getAllByText("วิชญะ อารีรัตน์")).toHaveLength(1);
    expect(screen.queryAllByText("ณัฐกานต์ วงศ์สว่าง")).toHaveLength(0);
  });

  it("updates visible count when a candidate changes stage", async () => {
    installLocalStorage();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { stage: "phone_screen", version: 3, updatedBy: "hr-1" } }) }));
    render(React.createElement(ApplicationsView, { data }));

    fireEvent.change(screen.getByRole("combobox", { name: "เปลี่ยนขั้นตอนของ วิชญะ อารีรัตน์" }), { target: { value: "phone_screen" } });

    expect(await screen.findByText("2 ใบสมัครที่แสดง")).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith("/api/applications/application-1", expect.objectContaining({ method: "PATCH" }));
  });

  it("opens candidate details in a full-height drawer", async () => {
    installLocalStorage();
    render(React.createElement(ApplicationsView, { data }));
    fireEvent.click(screen.getByRole("heading", { name: "วิชญะ อารีรัตน์" }));
    expect(await screen.findByRole("dialog", { name: "รายละเอียดผู้สมัคร" })).toBeTruthy();
    expect(screen.getByText("ทักษะหลัก (Primary Skills)")).toBeTruthy();
    expect(screen.getByText("ประสบการณ์ทำงาน")).toBeTruthy();
    expect(screen.getByText("การศึกษา")).toBeTruthy();
    expect(screen.getByText("เงินเดือนที่คาดหวัง")).toBeTruthy();
  });

  it("reopens the stage dropdown with the latest selected stage", async () => {
    installLocalStorage();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { stage: "phone_screen", version: 2, updatedBy: "hr-1" } }) }));
    render(React.createElement(ApplicationsView, { data }));
    fireEvent.click(screen.getByRole("heading", { name: "วิชญะ อารีรัตน์" }));
    fireEvent.click(screen.getByRole("button", { name: /คัดกรองเบื้องต้น.*เปลี่ยนสถานะ/ }));
    const firstSelect = screen.getByRole("combobox", { name: "เปลี่ยนสถานะผู้สมัคร" }) as HTMLSelectElement;
    expect(firstSelect.value).toBe("screening");
    expect(Array.from(firstSelect.options).map((option) => option.value)).toEqual(["screening", "phone_screen", "rejected"]);
    fireEvent.change(firstSelect, { target: { value: "phone_screen" } });
    expect(await screen.findByRole("button", { name: /คัดกรองทางโทรศัพท์.*เปลี่ยนสถานะ/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /คัดกรองทางโทรศัพท์.*เปลี่ยนสถานะ/ }));
    expect((screen.getByRole("combobox", { name: "เปลี่ยนสถานะผู้สมัคร" }) as HTMLSelectElement).value).toBe("phone_screen");
  });

  it("keeps the drawer open when delete confirmation is cancelled", () => {
    installLocalStorage();
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(React.createElement(ApplicationsView, { data }));
    fireEvent.click(screen.getByRole("heading", { name: "วิชญะ อารีรัตน์" }));
    fireEvent.click(screen.getByRole("button", { name: "ลบผู้สมัคร" }));
    expect(screen.getByRole("dialog", { name: "รายละเอียดผู้สมัคร" })).toBeTruthy();
  });
});
