import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/smoke",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env.MIDTRANS_SMOKE_BASE_URL,
    trace: "on-first-retry",
  },
});
