import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    globals: true,
    setupFiles: ["./tests/setup/env.ts", "./tests/setup/vitest.setup.ts"],
    include: ["tests/**/*.spec.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/lib/midtrans/server.ts",
        "src/app/midtrans/callback/route.ts",
        "src/app/api/transactions/[orderId]/route.ts",
        "src/app/api/cron/reconcile/route.ts",
        "src/app/api/user/orders/[orderId]/detail/route.ts",
        "src/app/api/user/orders/[orderId]/invoice/route.ts",
      ],
      exclude: ["tests/**"],
      thresholds: {
        lines: 65,
        functions: 65,
        branches: 59,
        statements: 65,
      },
    },
  },
});
