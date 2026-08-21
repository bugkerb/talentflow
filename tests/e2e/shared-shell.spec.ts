import { test, expect } from "@playwright/test";
import { loginAsDemoHr } from "./support/auth";

test("HR can use the shared shell on mobile with accessible current navigation", async ({ page }) => {
  await loginAsDemoHr(page);

  await expect(page.getByRole("navigation", { name: "เมนูหลัก" }).getByRole("link", { name: "แดชบอร์ด" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", /\/icon\.svg/);

  await page.setViewportSize({ width: 390, height: 844 });
  const menuButton = page.getByRole("button", { name: "เปิดเมนูนำทาง" });
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await menuButton.click();
  await expect(page.getByRole("button", { name: "ปิดเมนูนำทาง" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "ปิดเมนูนำทาง" }).first()).toHaveAttribute("aria-expanded", "true");

  const mobileNavigation = page.getByRole("navigation", { name: "เมนูหลักบนมือถือ" });
  await expect(mobileNavigation).toBeVisible();
  await expect(mobileNavigation.getByRole("link", { name: "แดชบอร์ด" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: /การแจ้งเตือน/ })).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(mobileNavigation).toHaveCount(0);
  await expect(page.getByRole("button", { name: "เปิดเมนูนำทาง" })).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "เปิดเมนูนำทาง" }).click();

  await mobileNavigation.getByRole("link", { name: "ตำแหน่งงาน" }).click();
  await expect(page).toHaveURL(/\/jobs$/);
});
