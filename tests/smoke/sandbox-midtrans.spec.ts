import { expect, test } from "@playwright/test";

test.describe("Midtrans sandbox smoke", () => {
  test.skip(
    !process.env.MIDTRANS_SMOKE_BASE_URL,
    "Set MIDTRANS_SMOKE_BASE_URL to run sandbox smoke tests.",
  );

  test("payment diagnostic endpoint responds", async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/api/test-midtrans`);

    // Endpoint is expected to be reachable for smoke verification.
    expect(response.status()).toBeLessThan(500);
  });
});
