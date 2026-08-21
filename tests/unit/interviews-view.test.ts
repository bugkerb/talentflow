/** @vitest-environment jsdom */

import { createElement, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InterviewListItem } from "@/application/interview-ports";
import { InterviewsView } from "../../components/interviews-view";

const { cancelInterview } = vi.hoisted(() => ({
  cancelInterview: vi.fn(),
}));

vi.mock("../../app/interviews/actions", () => ({
  cancelInterview,
  rescheduleInterview: vi.fn(),
  scheduleInterview: vi.fn(),
}));

vi.mock("../../components/talentflow", () => ({
  AppShell: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  Header: () => createElement("header"),
  Sidebar: () => createElement("aside"),
}));

const interview: InterviewListItem = {
  id: "product-manager",
  applicationId: "00000000-0000-0000-0000-000000000030",
  interviewType: "technical",
  startsAt: new Date().toISOString(),
  endsAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  timezone: "Asia/Bangkok",
  interviewerId: "00000000-0000-0000-0000-000000000001",
  additionalQuestions: "",
  status: "scheduled",
  version: 1,
  idempotencyKey: "schedule-1",
  createdBy: "00000000-0000-0000-0000-000000000001",
  updatedBy: null,
  cancelledBy: null,
  cancelledAt: null,
  providerStatus: "synced",
  googleEventId: null,
  googleMeetUrl: null,
  candidateName: "ผู้สมัคร",
  jobTitle: "Product Manager",
  interviewerName: "ผู้สัมภาษณ์",
};

describe("InterviewsView cancellation", () => {
  beforeEach(() => {
    cancelInterview.mockResolvedValue({
      data: { ...interview, status: "cancelled", version: 2 },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("calls cancelInterview for the selected interview", async () => {
    render(createElement(InterviewsView, { initialInterviews: [interview] }));

    fireEvent.click(screen.getAllByRole("button", { name: "ยกเลิก" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "ยืนยันการยกเลิก" }));

    await waitFor(() => {
      expect(cancelInterview).toHaveBeenCalledWith(
        { interviewId: "product-manager", reason: "ยกเลิกโดย HR" },
        1,
      );
    });
    expect((await screen.findByRole("status")).textContent).toContain("ยกเลิกนัดหมายแล้ว");
  });
});
