import { createHash } from "crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";

describe("midtrans server helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.MIDTRANS_SERVER_KEY = "SB-Mid-server-unit-test-key";
    process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION = "false";
  });

  it("maps Midtrans status into internal status", async () => {
    const { mapMidtransStatus } = await import("@/lib/midtrans/server");

    expect(mapMidtransStatus("capture", "accept")).toBe("paid");
    expect(mapMidtransStatus("capture", "challenge")).toBe("pending");
    expect(mapMidtransStatus("capture", "deny")).toBe("failed");
    expect(mapMidtransStatus("settlement")).toBe("paid");
    expect(mapMidtransStatus("pending")).toBe("pending");
    expect(mapMidtransStatus("deny")).toBe("failed");
    expect(mapMidtransStatus("cancel")).toBe("failed");
    expect(mapMidtransStatus("expire")).toBe("expired");
    expect(mapMidtransStatus("refund")).toBe("refunded");
    expect(mapMidtransStatus("partial_refund")).toBe("refunded");
  });

  it("only allows valid forward transitions", async () => {
    const { isValidTransition } = await import("@/lib/midtrans/server");

    expect(isValidTransition("pending", "paid")).toBe(true);
    expect(isValidTransition("pending", "expired")).toBe(true);
    expect(isValidTransition("pending", "failed")).toBe(true);
    expect(isValidTransition("pending", "refunded")).toBe(true);
    expect(isValidTransition("paid", "refunded")).toBe(true);
    expect(isValidTransition("paid", "pending")).toBe(false);
    expect(isValidTransition("expired", "paid")).toBe(false);
  });

  it("verifies webhook signature correctly", async () => {
    const { verifySignature } = await import("@/lib/midtrans/server");

    const orderId = "SUBE-1-123456-ABCDEF";
    const statusCode = "200";
    const grossAmount = "150000";
    const rawPayload = `${orderId}${statusCode}${grossAmount}${process.env.MIDTRANS_SERVER_KEY}`;
    const signature = createHash("sha512").update(rawPayload).digest("hex");

    expect(
      verifySignature(orderId, statusCode, grossAmount, signature),
    ).toBe(true);
    expect(
      verifySignature(orderId, statusCode, grossAmount, "invalid-signature"),
    ).toBe(false);
  });

  it("formats jakarta time in Midtrans-compatible format", async () => {
    const { formatJakartaTime } = await import("@/lib/midtrans/server");
    const result = formatJakartaTime(new Date("2026-01-15T12:30:45.000Z"));

    expect(result).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \+0700$/,
    );
  });
});
