// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  usePathname: () => "/screening",
}));
vi.mock("../../app/auth/actions", () => ({ logoutAction: vi.fn() }));

import { WorkspacePage } from "../../components/workspace";

afterEach(() => cleanup());

function renderScreeningPage() {
  return render(createElement(WorkspacePage, { page: "screening" }));
}

describe("screening workspace interactions", () => {
  it("provides deterministic feedback when AI analysis starts", () => {
    renderScreeningPage();

    fireEvent.click(screen.getByRole("button", { name: "เริ่มการวิเคราะห์ AI" }));

    expect(screen.getByRole("status").textContent).toContain("วิเคราะห์เสร็จแล้ว ผลลัพธ์พร้อมให้ HR ตรวจสอบ");
  });

  it("validates and confirms saving an HR override message", () => {
    renderScreeningPage();

    fireEvent.click(screen.getByRole("button", { name: "บันทึกข้อความ" }));
    expect(screen.getByRole("status").textContent).toContain("กรุณาระบุเหตุผลก่อนบันทึกข้อความ");

    fireEvent.change(screen.getByRole("textbox", { name: "เหตุผลสำหรับการปรับแก้ผลการประเมิน" }), {
      target: { value: "ตรวจสอบประสบการณ์ผู้นำทีมเพิ่มเติม" },
    });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกข้อความ" }));

    expect(screen.getByRole("status").textContent).toContain("บันทึกข้อความพร้อม audit log แล้ว");
  });

  it("keeps the resume input tabs working", () => {
    renderScreeningPage();

    fireEvent.click(screen.getByRole("tab", { name: "วางข้อความ" }));
    expect(screen.getByRole("textbox", { name: "ข้อความเรซูเม่" })).toBeTruthy();
    expect(document.getElementById("screening-file-help")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "อัปโหลดไฟล์" }));
    expect(document.getElementById("screening-file-help")).toBeTruthy();
    expect(document.getElementById("screening-resume-file")).toBeTruthy();
  });
});
