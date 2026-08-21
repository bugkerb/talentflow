// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";

vi.mock("next/navigation", () => ({ usePathname: () => "/applications" }));
vi.mock("../../app/auth/actions", () => ({ logoutAction: vi.fn() }));

import { ApplicationsView } from "../../components/applications-view";

afterEach(() => cleanup());

describe("ApplicationsView board counts", () => {
  it("shows the number of candidates visible after filtering", () => {
    render(React.createElement(ApplicationsView));

    fireEvent.change(screen.getByRole("combobox", { name: "ช่วงเวลา" }), { target: { value: "today" } });

    expect(screen.getByLabelText("สมัครใหม่ 1 คน")).toBeTruthy();
    expect(screen.getByLabelText("คัดกรองเบื้องต้น 0 คน")).toBeTruthy();
    expect(screen.getByLabelText("สัมภาษณ์ 0 คน")).toBeTruthy();
    expect(screen.getByLabelText("ข้อเสนอ/รับเข้าทำงาน 0 คน")).toBeTruthy();
  });

  it("updates column badges when a candidate changes stage", () => {
    render(React.createElement(ApplicationsView));

    fireEvent.click(screen.getByRole("button", { name: "เปิดรายละเอียด วิชญะ อารีรัตน์" }));
    fireEvent.change(screen.getByRole("combobox", { name: "สถานะปัจจุบัน" }), { target: { value: "สัมภาษณ์" } });

    expect(screen.getByLabelText("สมัครใหม่ 0 คน")).toBeTruthy();
    expect(screen.getByLabelText("สัมภาษณ์ 2 คน")).toBeTruthy();
  });
});
