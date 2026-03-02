import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminMock } from "../mocks/supabase-admin";
import { createMidtransCoreApiMock } from "../mocks/midtrans";

let supabaseAdminMock: ReturnType<typeof createSupabaseAdminMock>;
const authMock = vi.fn();
const verifyOrderStatusTokenMock = vi.fn();
const midtransApi = createMidtransCoreApiMock();
const mapMidtransStatusMock = vi.fn();
const isValidTransitionMock = vi.fn();
const generateTicketCodeMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  get supabaseAdmin() {
    return supabaseAdminMock;
  },
}));

vi.mock("@/lib/security/order-status-token", () => ({
  verifyOrderStatusToken: verifyOrderStatusTokenMock,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/midtrans/server", () => ({
  getCoreApi: () => midtransApi.coreApi,
  mapMidtransStatus: mapMidtransStatusMock,
  isValidTransition: isValidTransitionMock,
}));

vi.mock("@/lib/tickets", () => ({
  generateTicketCode: generateTicketCodeMock,
}));

describe("GET /api/transactions/[orderId]", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: null });
    verifyOrderStatusTokenMock.mockReturnValue(false);
    mapMidtransStatusMock.mockReturnValue("paid");
    isValidTransitionMock.mockReturnValue(true);
    midtransApi.status.mockResolvedValue({
      transaction_status: "settlement",
      fraud_status: "accept",
    });
    generateTicketCodeMock.mockReturnValue("TICKET-ACTIVE-001");
  });

  it("returns 404 for unauthorized access", async () => {
    supabaseAdminMock = createSupabaseAdminMock({
      queries: [
        (ctx) => {
          if (ctx.table === "transactions") {
            return {
              data: {
                id: 1,
                midtrans_order_id: "ORDER-1",
                status: "pending",
                amount: 100_000,
                quantity: 1,
                clerk_user_id: "user-owner",
                paid_at: null,
                expired_at: null,
                created_at: "2026-03-02T00:00:00.000Z",
                category_id: 5,
              },
              error: null,
            };
          }
          return undefined as never;
        },
      ],
    });

    const { GET } = await import("@/app/api/transactions/[orderId]/route");
    const response = await GET(
      new Request("http://localhost/api/transactions/ORDER-1"),
      { params: { orderId: "ORDER-1" } },
    );

    expect(response.status).toBe(404);
  });

  it("allows owner and syncs pending to paid", async () => {
    authMock.mockResolvedValue({ userId: "user-owner" });
    supabaseAdminMock = createSupabaseAdminMock({
      queries: [
        (ctx) => {
          if (ctx.table === "transactions" && ctx.operation === "select") {
            return {
              data: {
                id: 1,
                midtrans_order_id: "ORDER-1",
                status: "pending",
                amount: 100_000,
                quantity: 2,
                clerk_user_id: "user-owner",
                paid_at: null,
                expired_at: null,
                created_at: "2026-03-02T00:00:00.000Z",
                category_id: 5,
              },
              error: null,
            };
          }
          if (ctx.table === "transactions" && ctx.operation === "update") {
            return { data: [{ id: 1 }], error: null };
          }
          if (ctx.table === "tickets" && ctx.operation === "insert") {
            return { data: [{ id: 11 }, { id: 12 }], error: null };
          }
          return undefined as never;
        },
      ],
      rpc: {
        decrement_stock: async () => ({ data: { ok: true }, error: null }),
      },
    });

    const { GET } = await import("@/app/api/transactions/[orderId]/route");
    const response = await GET(
      new Request("http://localhost/api/transactions/ORDER-1"),
      { params: { orderId: "ORDER-1" } },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("paid");
    expect(
      supabaseAdminMock.__calls.some(
        (call) => call.table === "tickets" && call.operation === "insert",
      ),
    ).toBe(true);
  });

  it("allows public signed-token access", async () => {
    verifyOrderStatusTokenMock.mockReturnValue(true);
    supabaseAdminMock = createSupabaseAdminMock({
      queries: [
        (ctx) => {
          if (ctx.table === "transactions") {
            return {
              data: {
                id: 1,
                midtrans_order_id: "ORDER-1",
                status: "failed",
                amount: 100_000,
                quantity: 1,
                clerk_user_id: "user-owner",
                paid_at: null,
                expired_at: null,
                created_at: "2026-03-02T00:00:00.000Z",
                category_id: 5,
              },
              error: null,
            };
          }
          return undefined as never;
        },
      ],
    });

    const { GET } = await import("@/app/api/transactions/[orderId]/route");
    const response = await GET(
      new Request(
        "http://localhost/api/transactions/ORDER-1?sig=abc&exp=9999999999",
      ),
      { params: { orderId: "ORDER-1" } },
    );

    expect(response.status).toBe(200);
  });

  it("keeps pending when Midtrans status check fails", async () => {
    authMock.mockResolvedValue({ userId: "user-owner" });
    midtransApi.status.mockRejectedValue(new Error("midtrans unavailable"));
    supabaseAdminMock = createSupabaseAdminMock({
      queries: [
        (ctx) => {
          if (ctx.table === "transactions") {
            return {
              data: {
                id: 1,
                midtrans_order_id: "ORDER-1",
                status: "pending",
                amount: 100_000,
                quantity: 1,
                clerk_user_id: "user-owner",
                paid_at: null,
                expired_at: null,
                created_at: "2026-03-02T00:00:00.000Z",
                category_id: 5,
              },
              error: null,
            };
          }
          return undefined as never;
        },
      ],
    });

    const { GET } = await import("@/app/api/transactions/[orderId]/route");
    const response = await GET(
      new Request("http://localhost/api/transactions/ORDER-1"),
      { params: { orderId: "ORDER-1" } },
    );
    const body = await response.json();

    expect(body.status).toBe("pending");
  });
});
