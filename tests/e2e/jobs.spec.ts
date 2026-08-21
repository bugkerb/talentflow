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
