import { test, expect } from "@playwright/test";

test("HR can create referral candidate and move application stage", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ภาพรวมการสรรหา" })).toBeVisible();
  await page.getByRole("button", { name: "สร้างผู้สมัครและใบสมัคร" }).click();
  await expect(page.getByRole("status")).toHaveText("บันทึกผู้สมัครและสร้างใบสมัครแล้ว");
  await page.getByLabel("ย้าย Narin Chaiyapruk").selectOption({ label: "โทรคุยเบื้องต้น" });
  await expect(page.getByRole("status")).toHaveText("ย้ายผู้สมัครไปขั้นตอนโทรคุยเบื้องต้นแล้ว");
  await page.getByRole("button", { name: "ตาราง" }).click();
  await expect(page.getByRole("cell", { name: "โทรคุยเบื้องต้น" })).toBeVisible();
  await page.getByRole("button", { name: "จำลองข้อมูลชนกัน" }).click();
  await expect(page.getByRole("status")).toContainText("ข้อขัดแย้ง");
});
