import { expect, test } from "@playwright/test";
import { loginAsDemoHr } from "./support/auth";

test("HR can confirm discovery and use keyboard-accessible candidate decisions", async ({ page }) => {
  await loginAsDemoHr(page);
  await page.goto("/discovery");

  const jobSelect = page.getByRole("combobox", { name: "เลือกตำแหน่งงาน" });
  await jobSelect.selectOption({ index: 1 });
  const selectedJobTitle = await jobSelect.locator("option:checked").textContent();

  const startSearchButton = page.getByRole("button", { name: "เริ่มค้นหา" });
  await startSearchButton.click();
  const confirmationDialog = page.getByRole("dialog", { name: "เริ่มค้นหาผู้สมัคร" });
  await expect(confirmationDialog).toContainText(selectedJobTitle ?? "");

  await page.keyboard.press("Escape");
  await expect(confirmationDialog).toBeHidden();
  await expect(startSearchButton).toBeFocused();

  await startSearchButton.click();
  await confirmationDialog.getByRole("button", { name: "ยืนยันการค้นหา" }).click();
  await expect(page.getByRole("status")).toContainText("ค้นหาสำหรับตำแหน่ง");

  const candidateCard = page.locator("article").filter({ hasText: "กิตติพงษ์ วิริยะ" }).first();
  const approveButton = candidateCard.getByRole("button", { name: "อนุมัติเพื่อสัมภาษณ์" });
  await approveButton.focus();
  await page.keyboard.press("Enter");
  await expect(approveButton).toHaveAttribute("aria-pressed", "true");
  await expect(candidateCard.getByRole("status")).toContainText("อนุมัติผู้สมัครเพื่อเข้าสู่ขั้นตอนสัมภาษณ์แล้ว");

  const reviewButton = candidateCard.getByRole("button", { name: "รอการตรวจสอบ" });
  await reviewButton.focus();
  await page.keyboard.press("Space");
  await expect(reviewButton).toHaveAttribute("aria-pressed", "true");
  await expect(candidateCard.getByRole("status")).toContainText("เก็บผู้สมัครไว้รอการตรวจสอบเพิ่มเติมแล้ว");

  const rejectButton = candidateCard.getByRole("button", { name: "ปฏิเสธ" });
  await rejectButton.focus();
  await page.keyboard.press("Enter");
  await expect(rejectButton).toHaveAttribute("aria-pressed", "true");
  await expect(candidateCard.getByRole("status")).toContainText("ปฏิเสธผู้สมัครแล้ว");
});
