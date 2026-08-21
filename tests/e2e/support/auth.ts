import { expect, type BrowserContext, type Cookie, type Page } from "@playwright/test";

export const DEMO_HR = {
  email: process.env.E2E_HR_EMAIL ?? "demo.hr@talentflow.local",
  password: process.env.E2E_HR_PASSWORD ?? ""
} as const;

type StoredSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

const authCookieBaseName = (cookies: Cookie[]): string => {
  const authCookie = cookies.find(({ name }) => /^sb-.*-auth-token(?:\.\d+)?$/.test(name));
  if (!authCookie) throw new Error("Supabase auth cookie was not set after login");
  return authCookie.name.replace(/\.\d+$/, "");
};

const decodeSession = (encoded: string): StoredSession => {
  if (!encoded.startsWith("base64-")) throw new Error("Unexpected Supabase auth cookie encoding");
  return JSON.parse(Buffer.from(encoded.slice("base64-".length), "base64url").toString("utf8")) as StoredSession;
};

const encodeSession = (session: StoredSession): string =>
  `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`;

const sessionCookieValue = (cookies: Cookie[], baseName: string): string => {
  const singleCookie = cookies.find(({ name }) => name === baseName);
  if (singleCookie) return singleCookie.value;

  const chunks = cookies
    .filter(({ name }) => name.startsWith(`${baseName}.`))
    .sort((left, right) => Number(left.name.split(".").at(-1)) - Number(right.name.split(".").at(-1)));
  if (chunks.length === 0) throw new Error("Supabase auth cookie chunks were not found");
  return chunks.map(({ value }) => value).join("");
};

export async function loginAsDemoHr(page: Page): Promise<void> {
  if (!DEMO_HR.password) throw new Error("E2E_HR_PASSWORD is required for authenticated E2E.");
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(DEMO_HR.email);
  await page.getByLabel("รหัสผ่าน").fill(DEMO_HR.password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "วันนี้ต้องจัดการอะไรบ้าง" })).toBeVisible({ timeout: 30_000 });
}

export async function readBrowserSession(context: BrowserContext): Promise<StoredSession> {
  const cookies = await context.cookies();
  const baseName = authCookieBaseName(cookies);
  return decodeSession(sessionCookieValue(cookies, baseName));
}

export async function expireBrowserSession(context: BrowserContext): Promise<void> {
  const cookies = await context.cookies();
  const baseName = authCookieBaseName(cookies);
  const session = decodeSession(sessionCookieValue(cookies, baseName));
  const encoded = encodeSession({ ...session, expires_at: Math.floor(Date.now() / 1000) - 60 });
  const chunks = encoded.match(/.{1,3180}/g) ?? [];
  const authCookies = cookies.filter(({ name }) => name === baseName || name.startsWith(`${baseName}.`));
  const template = authCookies[0];

  await context.clearCookies();
  await context.addCookies([
    ...cookies.filter(({ name }) => name !== baseName && !name.startsWith(`${baseName}.`)),
    ...chunks.map((value, index) => ({
      ...template,
      name: chunks.length === 1 ? baseName : `${baseName}.${index}`,
      value
    }))
  ]);
}
