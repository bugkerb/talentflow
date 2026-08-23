import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["node_modules/**", "tests/e2e/**"],
    // The 100% gate covers the explicitly instrumented business-logic surface; route/UI infrastructure has separate integration/E2E gates.
    coverage: { provider: "v8", reporter: ["text", "json-summary"], include: ["src/domain/**/*.ts", "src/application/*-service.ts", "src/application/idempotency-service.ts"], thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 } }
  }
});
