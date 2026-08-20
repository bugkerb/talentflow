import { test, expect } from "@playwright/test";

test("HR can schedule, resolve a conflict, reschedule, and cancel an interview", async ({ page }) => {
  await page.goto("/interviews");
  await page.getByRole("button", { name: "นัดหมายสัมภาษณ์" }).click();
  await page.getByRole("button", { name: "ตรวจสอบและสร้างนัดหมาย" }).click();
  await expect(page.getByRole("status")).toContainText("INTERVIEW_CONFLICT");

  await page.getByLabel("เวลาเริ่มต้น").fill("12:00");
  await page.getByLabel("เวลาสิ้นสุด").fill("12:30");
  await page.getByRole("button", { name: "ตรวจสอบและสร้างนัดหมาย" }).click();
  await expect(page.getByRole("status")).toContainText("สร้างนัดหมายแล้ว");

  await page.locator("article").filter({ hasText: "Team Sync" }).getByRole("button", { name: "เลื่อนนัดหมาย" }).click();
  await page.getByLabel("เวลาเริ่มต้น").fill("13:00");
  await page.getByLabel("เวลาสิ้นสุด").fill("13:30");
  await page.getByRole("button", { name: "บันทึกการเลื่อนนัดหมาย" }).click();
  await expect(page.getByRole("status")).toContainText("เลื่อนนัดหมายแล้ว");

  await page.locator("article").filter({ hasText: "Product Manager - Final" }).getByRole("button", { name: "ยกเลิก" }).click();
  await page.getByLabel("เหตุผลการยกเลิก").fill("Candidate withdrew");
  await page.getByRole("button", { name: "ยืนยันการยกเลิก" }).click();
  await expect(page.getByRole("status")).toContainText("ยกเลิกนัดหมายแล้ว");
  await expect(page.locator("article").filter({ hasText: "Product Manager - Final" })).toContainText("ยกเลิกแล้ว");
});
