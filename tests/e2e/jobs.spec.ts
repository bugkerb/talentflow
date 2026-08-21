import { expect, test } from "@playwright/test";
import { loginAsDemoHr } from "./support/auth";

test("HR can scan and filter the jobs management workspace", async ({ page }) => {
  await loginAsDemoHr(page);
  await page.goto("/jobs");

  await expect(page.getByRole("heading", { name: "จัดการตำแหน่งงาน" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "สร้างตำแหน่งงานใหม่" })).toBeVisible();

  const search = page.getByRole("searchbox", { name: "ค้นหาตำแหน่งงาน" });
  await search.fill("ไม่มีตำแหน่งนี้");
  await expect(page.getByText(/แสดง 0 จาก/)).toBeVisible();

  await page.getByRole("button", { name: /ทั้งหมด/ }).click();
  await search.fill("");
  await expect(page.getByText(/แสดง [1-9]/)).toBeVisible();
  await expect(page.getByRole("group", { name: "กรองตำแหน่งงานตามสถานะ" })).toBeVisible();
});

test("empty job submission shows actionable Thai validation", async ({ page }) => {
  await loginAsDemoHr(page);
  await page.goto("/jobs");

  await page.getByRole("button", { name: "บันทึกข้อมูล" }).click();

  await expect(page.getByRole("status")).toContainText("กรุณากรอกข้อมูลที่จำเป็นก่อนบันทึก");
  await expect(page.getByText("กรุณาระบุชื่อตำแหน่งงาน")).toBeVisible();
  await expect(page.getByText("กรุณาระบุรายละเอียดงาน")).toBeVisible();
  await expect(page.getByRole("textbox", { name: /ชื่อตำแหน่ง/ })).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("label").filter({ hasText: "รายละเอียดงาน" })).toBeVisible();
  await expect(page.getByText(/Job Description/i)).toHaveCount(0);
});
