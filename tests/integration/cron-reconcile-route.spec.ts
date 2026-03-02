import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminMock } from "../mocks/supabase-admin";
import { createMidtransCoreApiMock } from "../mocks/midtrans";

let supabaseAdminMock: ReturnType<typeof createSupabaseAdminMock>;
const midtransApi = createMidtransCoreApiMock();
const mapMidtransStatusMock = vi.fn();
const isValidTransitionMock = vi.fn();
const generateTicketCodeMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  get supabaseAdmin() {
    return supabaseAdminMock;
  },
}));

vi.mock("@/lib/midtrans/server", () => ({
  getCoreApi: () => midtransApi.coreApi,
  mapMidtransStatus: mapMidtransStatusMock,
  isValidTransition: isValidTransitionMock,
}));

vi.mock("@/lib/tickets", () => ({
  generateTicketCode: generateTicketCodeMock,
}));

describe("GET /api/cron/reconcile", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    mapMidtransStatusMock.mockReturnValue("paid");
    isValidTransitionMock.mockReturnValue(true);
    midtransApi.status.mockResolvedValue({
      transaction_status: "settlement",
      fraud_status: "accept",
    });
    generateTicketCodeMock.mockReturnValue("TICKET-CRON-1");
  });

  it("returns 503 when CRON_SECRET missing", async () => {
    delete process.env.CRON_SECRET;
    supabaseAdminMock = createSupabaseAdminMock();

    const { GET } = await import("@/app/api/cron/reconcile/route");
    const response = await GET(
      new Request("http://localhost/api/cron/reconcile"),
    );
    expect(response.status).toBe(503);
  });

  it("returns 401 for invalid bearer token", async () => {
    supabaseAdminMock = createSupabaseAdminMock();
    const { GET } = await import("@/app/api/cron/reconcile/route");
    const response = await GET(
      new Request("http://localhost/api/cron/reconcile", {
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns zero when no pending data", async () => {
    supabaseAdminMock = createSupabaseAdminMock({
      queries: [
        (ctx) => {
          if (ctx.table === "transactions" && ctx.operation === "select") {
            return { data: [], error: null };
          }
          return undefined as never;
        },
      ],
    });

    const { GET } = await import("@/app/api/cron/reconcile/route");
    const response = await GET(
      new Request("http://localhost/api/cron/reconcile", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );
    const body = await response.json();
    expect(body.processed).toBe(0);
  });

  it("processes pending records and updates paid ticket side effects", async () => {
    supabaseAdminMock = createSupabaseAdminMock({
      queries: [
        (ctx) => {
          if (ctx.table === "transactions" && ctx.operation === "select") {
            return {
              data: [
                {
                  id: 1,
                  midtrans_order_id: "ORDER-CRON-1",
                  status: "pending",
                  quantity: 1,
                  category_id: 55,
                },
              ],
              error: null,
            };
          }
          if (ctx.table === "transactions" && ctx.operation === "update") {
            return { data: [{ id: 1 }], error: null };
          }
          if (ctx.table === "tickets" && ctx.operation === "insert") {
            return { data: [{ id: 5 }], error: null };
          }
          return undefined as never;
        },
      ],
      rpc: {
        decrement_stock: async () => ({ data: { ok: true }, error: null }),
      },
    });

    const { GET } = await import("@/app/api/cron/reconcile/route");
    const response = await GET(
      new Request("http://localhost/api/cron/reconcile", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.processed).toBe(1);
    expect(body.updated).toBe(1);
  });
});
