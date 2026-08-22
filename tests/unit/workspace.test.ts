// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  usePathname: () => "/screening",
}));
vi.mock("../../app/auth/actions", () => ({ logoutAction: vi.fn() }));

import { ScreeningWorkspace, type ScreeningWorkspaceData } from "../../components/screening-workspace";

afterEach(() => cleanup());

const actions = vi.hoisted(() => ({ extractResumeText: vi.fn(), uploadResume: vi.fn(), runScreening: vi.fn() }));
const candidateActions = vi.hoisted(() => ({ createCandidate: vi.fn() }));
const applicationActions = vi.hoisted(() => ({ createApplication: vi.fn() }));
vi.mock("../../app/screening/actions", () => actions);
vi.mock("../../app/discovery/actions", () => candidateActions);
vi.mock("../../app/applications/actions", () => applicationActions);
const data: ScreeningWorkspaceData = { loadError: null, history: [], targets: [{ applicationId: "00000000-0000-0000-0000-000000000030", candidateId: "00000000-0000-0000-0000-000000000020", candidateName: "ผู้สมัครจริง", jobId: "00000000-0000-0000-0000-000000000010", jobTitle: "Tech Lead", jobDescription: "นำทีม TypeScript", resumeId: "00000000-0000-0000-0000-000000000050", resumeFileName: "resume.pdf" }] };
const result = {
  score: 9,
  summary: "เหมาะสมกับตำแหน่ง",
  evidence: ["มีประสบการณ์ React 5 ปี"],
  riskFlags: ["insufficient_evidence"],
  scores: { skills: 9, experience: 8, cultureCommunication: 7 },
  reasoning: { skills: "ทักษะตรง", experience: "ประสบการณ์เพียงพอ", cultureCommunication: "สื่อสารชัดเจน" },
  strengths: ["React", "TypeScript"],
  prescreenQuestions: ["อธิบายระบบที่เคยออกแบบ"],
  teamInterviewReport: { summary: "ควรสัมภาษณ์ต่อ", focusAreas: ["System design"], recommendation: "strong" },
  promptVersion: "ai-screening-v1",
};

describe("screening workspace interactions", () => {
  it("does not render a fake result before a server response", () => {
    render(createElement(ScreeningWorkspace, { data }));
    expect(screen.getByText("ผลลัพธ์จะแสดงที่นี่หลังจากวิเคราะห์และบันทึกสำเร็จ")).toBeTruthy();
    expect(screen.queryByText("85")).toBeNull();
  });

  it("shows only the persisted server result", async () => {
    actions.runScreening.mockResolvedValue({ data: { result: { ...result, summary: "ผลจากระบบ" }, screening: { status: "completed" } } });
    render(createElement(ScreeningWorkspace, { data }));
    fireEvent.change(screen.getByRole("textbox", { name: "ข้อความเรซูเม่" }), { target: { value: "TypeScript five years" } });
    fireEvent.click(screen.getByRole("button", { name: "เริ่มการวิเคราะห์ AI" }));
    await waitFor(() => expect(screen.getByText("ผลจากระบบ")).toBeTruthy());
    expect(actions.runScreening).toHaveBeenCalledWith(expect.objectContaining({ applicationId: data.targets[0].applicationId, resumeText: "TypeScript five years" }));
  });

  it("renders empty and error states without placeholders", () => {
    const { rerender } = render(createElement(ScreeningWorkspace, { data: { targets: [], history: [], loadError: null } }));
    expect(screen.getByText("ยังไม่มีผู้สมัครที่พร้อมคัดกรอง")).toBeTruthy();
    rerender(createElement(ScreeningWorkspace, { data: { targets: [], history: [], loadError: "โหลดข้อมูลไม่สำเร็จ" } }));
    expect(screen.getByRole("alert").textContent).toContain("โหลดข้อมูลไม่สำเร็จ");
  });

  it("does not show the legacy empty panel when resume intake jobs are available", () => {
    render(createElement(ScreeningWorkspace, { data: { targets: [], history: [], loadError: null, jobs: [{ id: "job-1", title: "Tech Lead", description: "นำทีม" }] } }));
    expect(screen.queryByText("ยังไม่มีผู้สมัครที่พร้อมคัดกรอง")).toBeNull();
    expect(screen.getByText("ข้อมูลผู้สมัคร")).toBeTruthy();
  });

  it("renders every deterministic scorecard field after the intake flow succeeds", async () => {
    candidateActions.createCandidate.mockResolvedValue({ data: { id: "00000000-0000-0000-0000-000000000020" } });
    applicationActions.createApplication.mockResolvedValue({ data: { id: "00000000-0000-0000-0000-000000000030" } });
    actions.uploadResume.mockResolvedValue({ data: { id: "00000000-0000-0000-0000-000000000050" } });
    actions.runScreening.mockResolvedValue({ data: { result, screening: { status: "completed" } } });

    render(createElement(ScreeningWorkspace, { data: { targets: [], history: [], loadError: null, jobs: [{ id: "00000000-0000-0000-0000-000000000010", title: "Tech Lead", description: "นำทีม TypeScript" }] } }));
    fireEvent.click(screen.getByRole("button", { name: "วางข้อความ" }));
    fireEvent.change(screen.getByRole("textbox", { name: "ข้อความเรซูเม่" }), { target: { value: "React TypeScript 5 years" } });
    fireEvent.change(screen.getByRole("combobox", { name: "ตำแหน่งงานที่ต้องการประเมิน" }), { target: { value: "00000000-0000-0000-0000-000000000010" } });
    fireEvent.click(screen.getByRole("button", { name: "เริ่มการวิเคราะห์ AI" }));

    await waitFor(() => expect(screen.getByText("เพิ่มผู้สมัครและวิเคราะห์เรซูเม่เรียบร้อยแล้ว")).toBeTruthy());
    expect(screen.getByRole("article", { name: "ความเหมาะสมโดยรวม 9 จาก 10" })).toBeTruthy();
    expect(screen.getByRole("article", { name: "ทักษะที่ตรงกัน (Hard Skills) 9 จาก 10" })).toBeTruthy();
    expect(screen.getByRole("article", { name: "ประสบการณ์การทำงาน 8 จาก 10" })).toBeTruthy();
    expect(screen.getByRole("article", { name: "การสื่อสารและวัฒนธรรม 7 จาก 10" })).toBeTruthy();
    for (const text of [result.summary, ...result.evidence, ...result.strengths, ...result.prescreenQuestions, result.teamInterviewReport.summary, "ทักษะ: ทักษะตรง", "ประสบการณ์: ประสบการณ์เพียงพอ", "การสื่อสาร: สื่อสารชัดเจน"]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    expect(screen.getByText("จุดที่ควรเจาะลึก: System design")).toBeTruthy();
    expect(screen.getByText("คำแนะนำ: strong")).toBeTruthy();
  });
});
