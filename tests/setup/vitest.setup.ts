import { afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

afterEach(() => {
  // Keep tests isolated across module-level singletons.
  delete process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-cron-secret";
});
