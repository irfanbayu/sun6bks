Object.assign(process.env, {
  NODE_ENV: "test",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  CRON_SECRET: process.env.CRON_SECRET || "test-cron-secret",
  ORDER_STATUS_TOKEN_SECRET:
    process.env.ORDER_STATUS_TOKEN_SECRET || "test-order-status-secret",
  NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION: "false",
  MIDTRANS_SERVER_KEY:
    process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-test-key",
});
