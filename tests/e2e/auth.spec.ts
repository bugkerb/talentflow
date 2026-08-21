import { expect, test } from "@playwright/test";
import { expireBrowserSession, loginAsDemoHr, readBrowserSession } from "./support/auth";

test.setTimeout(60_000);

test("anonymous users are redirected to login with a safe relative return path", async ({ page }) => {
  await page.goto("/screening?stage=interview");

  await expect(page).toHaveURL(/\/login\?next=%2Fscreening%3Fstage%3Dinterview$/);
  await expect(page.locator('input[name="next"]')).toHaveValue("/screening?stage=interview");
});

test("protected session API rejects anonymous requests without caching", async ({ request }) => {
  const requestId = "e2e-anonymous-session";
  const response = await request.get("/api/auth/session", {
    headers: { "X-Request-ID": requestId }
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(response.headers()["x-request-id"]).toBe(requestId);
  await expect(response.json()).resolves.toMatchObject({
    error: { code: "UNAUTHORIZED", requestId }
  });
});

test("public responses include the restrictive security header baseline", async ({ request }) => {
  const response = await request.get("/login");
  const headers = response.headers();

  expect(response.ok()).toBe(true);
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

test("demo HR can log in, refresh the session, and log out", async ({ context, page }) => {
  await loginAsDemoHr(page);

  const sessionResponse = await page.request.get("/api/auth/session");
  expect(sessionResponse.status()).toBe(200);
  await expect(sessionResponse.json()).resolves.toMatchObject({
    data: { actor: { role: "hr" } }
  });

  const initialSession = await readBrowserSession(context);
  await expireBrowserSession(context);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "วันนี้ต้องจัดการอะไรบ้าง" })).toBeVisible();

  const refreshedSession = await readBrowserSession(context);
  expect(refreshedSession.refresh_token).not.toBe(initialSession.refresh_token);
  expect(refreshedSession.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));

  await page.getByRole("button", { name: "ออกจากระบบ" }).click({ force: true });
  await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });

  const loggedOutCookies = await context.cookies();
  expect(loggedOutCookies.some(({ name }) => /^sb-.*-auth-token(?:\.\d+)?$/.test(name))).toBe(false);

  const loggedOutResponse = await page.request.get("/api/auth/session");
  expect(loggedOutResponse.status()).toBe(401);
});
