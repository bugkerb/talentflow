import { test, expect } from "@playwright/test";
import { loginAsDemoHr } from "./support/auth";

test("HR can inspect a conflict and reschedule the interview view", async ({ page }) => {
  await loginAsDemoHr(page);
  await page.goto("/interviews");
  await expect(page.getByRole("heading", { name: "พบตารางซ้อนทับกัน" })).toBeVisible();
  await page.getByRole("button", { name: "เลื่อนเวลา" }).click();
  const timeInput = page.getByRole("textbox", { name: "เวลา" });
  await expect(timeInput).toBeFocused();
  await timeInput.fill("12:00");
  await page.locator('section[aria-labelledby="appointment-details-heading"]').getByRole("button", { name: "เลื่อนนัดหมาย" }).click();
  await expect(page.getByRole("status")).toContainText("เลื่อนนัดหมายแล้ว");
  await page.getByRole("button", { name: "ดูรายละเอียด" }).click();
  await expect(page.getByRole("status")).toContainText("แสดงรายละเอียดนัดหมาย");
  await page.locator('section[aria-labelledby="appointment-details-heading"]').getByRole("button", { name: "ยกเลิก" }).click();
  await expect(page.getByRole("status")).toContainText("ยกเลิกการเปลี่ยนแปลงแล้ว");
});
