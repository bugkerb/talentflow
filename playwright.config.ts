import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const webServerUrl = new URL(baseURL);
if (webServerUrl.protocol !== "http:" || webServerUrl.hostname !== "127.0.0.1" || !/^\d+$/.test(webServerUrl.port)) {
  throw new Error("PLAYWRIGHT_BASE_URL must be an explicit http://127.0.0.1:<port> URL.");
}
const localSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const localSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!localSupabaseUrl || !localSupabaseAnonKey) {
  throw new Error("Supabase credentials are required. Run E2E through `npm run test:e2e`.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  outputDir: "test-results",
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"]
  },
  webServer: {
    command: `node_modules/.bin/next dev --webpack --hostname 127.0.0.1 --port ${webServerUrl.port}`,
    url: baseURL,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1",
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: localSupabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: localSupabaseAnonKey
    }
  }
});
