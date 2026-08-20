import { test, expect } from "@playwright/test";
import { loginAsDemoHr } from "./support/auth";

test("HR can follow the dashboard action queue", async ({ page }) => {
  await loginAsDemoHr(page);
  await expect(page.getByRole("heading", { name: "ภาพรวมการสรรหา" })).toBeVisible();
  await page.getByRole("button", { name: "ตรวจสอบการเชื่อมต่อ" }).click();
  await expect(page.getByRole("status")).toHaveText("ส่งคำขอเชื่อมต่อใหม่แล้ว");
  await expect(page.getByRole("link", { name: /ตรวจเรซูเม่ที่รอการตัดสินใจ/ })).toHaveAttribute("href", "#screening");
  await expect(page.getByRole("link", { name: /เตรียมสัมภาษณ์วันนี้/ })).toHaveAttribute("href", "#interviews");
});
