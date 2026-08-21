// @vitest-environment jsdom

import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JobRecord } from "@/application/job-service";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("../../src/server/auth", () => ({ requireActiveHr: vi.fn().mockResolvedValue({ id: "00000000-0000-0000-0000-000000000001" }) }));
vi.mock("../../src/server/dashboard-read-model", () => ({ readDashboard: vi.fn().mockResolvedValue({ updatedAt: "2026-08-22T00:00:00.000Z", actions: { pendingScreenings: 0, interviewsToday: 0, newApplications: 0 }, metrics: { openJobs: 0, newCandidates: 0, interviewing: 0, interviewsThisWeek: 0 } }) }));
vi.mock("../../app/auth/actions", () => ({ logoutAction: vi.fn() }));
vi.mock("../../app/jobs/actions", () => ({
  closeJob: vi.fn(),
  createDraftJob: vi.fn(),
  pauseJob: vi.fn(),
  publishJob: vi.fn(),
  updateJob: vi.fn()
}));

import { JobsPage } from "../../components/jobs-page";
import DashboardPage from "../../app/page";

const jobs: JobRecord[] = [
  { id: "job-1", title: "นักพัฒนาซอฟต์แวร์", description: "พัฒนาเว็บด้วย React", department: "ฝ่ายวิศวกรรม", status: "open", version: 1, updatedBy: null },
  { id: "job-2", title: "นักวิจัยผู้ใช้", description: "ศึกษาความต้องการของผู้สมัคร", department: "ฝ่ายผลิตภัณฑ์", status: "draft", version: 1, updatedBy: null },
  { id: "job-3", title: "ผู้จัดการฝ่ายสรรหา", description: "ดูแลกระบวนการสรรหา", status: "closed", version: 1, updatedBy: null }
];

describe("jobs and shared shell QA regressions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("filters jobs by Thai search text and status without navigation", () => {
    render(createElement(JobsPage, { initialJobs: jobs }));

    fireEvent.change(screen.getByRole("searchbox", { name: "ค้นหาตำแหน่งงาน" }), { target: { value: "ผู้สมัคร" } });
    expect(screen.getByRole("heading", { name: "นักวิจัยผู้ใช้" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "นักพัฒนาซอฟต์แวร์" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "เปิดรับ" }));
    expect(screen.getByText("ไม่พบตำแหน่งงานที่ตรงกับตัวกรอง")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "สร้างตำแหน่งงาน" })).toBeNull();
  });

  it("uses the sidebar offset at the md breakpoint for dashboard and jobs", async () => {
    const { unmount } = render(await DashboardPage());
    expect(screen.getByRole("main").classList.contains("md:ml-[260px]")).toBe(true);
    expect(screen.getByRole("banner").classList.contains("md:ml-[260px]")).toBe(true);

    unmount();
    render(createElement(JobsPage, { initialJobs: jobs }));
    expect(screen.getByRole("main").classList.contains("md:ml-[260px]")).toBe(true);
    expect(screen.getByRole("banner").classList.contains("md:ml-[260px]")).toBe(true);
  });

  it("shows deterministic validation when creating a job with empty required fields", () => {
    render(createElement(JobsPage, { initialJobs: jobs }));

    fireEvent.submit(document.getElementById("create-job-form") as HTMLFormElement);

    expect(screen.getByRole("status").textContent).toContain("กรุณากรอกข้อมูลที่จำเป็นก่อนบันทึก");
    expect(screen.getByText("กรุณาระบุชื่อตำแหน่งงาน")).toBeTruthy();
    expect(screen.getByText("กรุณาระบุรายละเอียดงาน")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /ชื่อตำแหน่ง/ }).getAttribute("aria-invalid")).toBe("true");
  });

  it("uses Thai-only copy for the job description field", () => {
    render(createElement(JobsPage, { initialJobs: jobs }));

    expect(screen.getByText("รายละเอียดงาน", { selector: "label" })).toBeTruthy();
    expect(screen.queryByText(/Job Description/i)).toBeNull();
  });
});
