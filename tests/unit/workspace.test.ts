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

const actions = vi.hoisted(() => ({ uploadResume: vi.fn(), runScreening: vi.fn() }));
vi.mock("../../app/screening/actions", () => actions);
const data: ScreeningWorkspaceData = { loadError: null, history: [], targets: [{ applicationId: "00000000-0000-0000-0000-000000000030", candidateId: "00000000-0000-0000-0000-000000000020", candidateName: "ผู้สมัครจริง", jobId: "00000000-0000-0000-0000-000000000010", jobTitle: "Tech Lead", jobDescription: "นำทีม TypeScript", resumeId: "00000000-0000-0000-0000-000000000050", resumeFileName: "resume.pdf" }] };

describe("screening workspace interactions", () => {
  it("does not render a fake result before a server response", () => {
    render(createElement(ScreeningWorkspace, { data }));
    expect(screen.getByText("ผลลัพธ์จะแสดงที่นี่หลังจากวิเคราะห์และบันทึกสำเร็จ")).toBeTruthy();
    expect(screen.queryByText("85")).toBeNull();
  });

  it("shows only the persisted server result", async () => {
    actions.runScreening.mockResolvedValue({ data: { result: { score: 91, summary: "ผลจากระบบ", evidence: ["หลักฐานจากเรซูเม่"], riskFlags: [] }, screening: { status: "completed" } } });
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
});
