import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupabaseAdminMock,
  type QueryContext,
} from "../mocks/supabase-admin";

let supabaseAdminMock: ReturnType<typeof createSupabaseAdminMock>;
const verifySignatureMock = vi.fn();
const mapMidtransStatusMock = vi.fn();
const isValidTransitionMock = vi.fn();
const generateTicketCodeMock = vi.fn();
const sendInvoiceEmailMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  get supabaseAdmin() {
    return supabaseAdminMock;
  },
}));

vi.mock("@/lib/midtrans/server", () => ({
  verifySignature: verifySignatureMock,
  mapMidtransStatus: mapMidtransStatusMock,
  isValidTransition: isValidTransitionMock,
}));

vi.mock("@/lib/tickets", () => ({
  generateTicketCode: generateTicketCodeMock,
}));

vi.mock("@/lib/email", () => ({
  sendInvoiceEmail: sendInvoiceEmailMock,
}));

const buildWebhookRequest = () =>
  new Request("http://localhost/midtrans/callback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      order_id: "ORDER-123",
      status_code: "200",
      gross_amount: "100000",
      signature_key: "sig",
      transaction_status: "settlement",
      fraud_status: "accept",
    }),
  });

describe("POST /midtrans/callback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    generateTicketCodeMock.mockReturnValue("TICKET-CODE-001");
    sendInvoiceEmailMock.mockResolvedValue(undefined);
  });

  it("returns invalid signature while still storing payload", async () => {
    verifySignatureMock.mockReturnValue(false);
    supabaseAdminMock = createSupabaseAdminMock({
      queries: [
        (ctx: QueryContext) => {
          if (ctx.table === "webhook_payloads" && ctx.operation === "insert") {
            return { data: { id: 1 }, error: null };
          }
          return null as never;
        },
      ],
    });

    const { POST } = await import("@/app/midtrans/callback/route");
    const response = await POST(buildWebhookRequest());
    const body = await response.json();

    expect(body.status).toBe("invalid_signature");
    expect(
      supabaseAdminMock.__calls.some(
        (call) => call.table === "webhook_payloads",
      ),
    ).toBe(true);
  });

  it("returns transaction_not_found when order does not exist", async () => {
    verifySignatureMock.mockReturnValue(true);
    supabaseAdminMock = createSupabaseAdminMock({
      queries: [
        (ctx) => {
          if (ctx.table === "webhook_payloads" && ctx.operation === "insert") {
            return { data: { id: 1 }, error: null };
          }
          if (ctx.table === "transactions" && ctx.operation === "select") {
            return { data: null, error: { message: "not found" } };
          }
          return null as never;
        },
      ],
    });

    const { POST } = await import("@/app/midtrans/callback/route");
    const response = await POST(buildWebhookRequest());
    const body = await response.json();

    expect(body.status).toBe("transaction_not_found");
  });

  it("handles paid callback and triggers side effects once", async () => {
    verifySignatureMock.mockReturnValue(true);
    mapMidtransStatusMock.mockReturnValue("paid");
    isValidTransitionMock.mockReturnValue(true);

    supabaseAdminMock = createSupabaseAdminMock({
      queries: [
        (ctx) => {
          if (ctx.table === "webhook_payloads" && ctx.operation === "insert") {
            return { data: { id: 1 }, error: null };
          }
          if (ctx.table === "transactions" && ctx.operation === "select") {
            return {
              data: {
                id: 7,
                status: "pending",
                quantity: 2,
                category_id: 9,
              },
              error: null,
            };
          }
          if (ctx.table === "transactions" && ctx.operation === "update") {
            return { data: [{ id: 7 }], error: null };
          }
          if (ctx.table === "tickets" && ctx.operation === "insert") {
            return { data: [{ id: 1 }, { id: 2 }], error: null };
          }
          if (ctx.table === "webhook_payloads" && ctx.operation === "update") {
            return { data: [{ id: 1 }], error: null };
          }
          return null as never;
        },
      ],
      rpc: {
        decrement_stock: async () => ({ data: { ok: true }, error: null }),
      },
    });

    const { POST } = await import("@/app/midtrans/callback/route");
    const response = await POST(buildWebhookRequest());
    const body = await response.json();

    expect(body.status).toBe("ok");
    expect(sendInvoiceEmailMock).toHaveBeenCalledWith({
      orderId: "ORDER-123",
      transactionId: 7,
    });
    const ticketInsert = supabaseAdminMock.__calls.find(
      (call) => call.table === "tickets" && call.operation === "insert",
    );
    expect(ticketInsert).toBeTruthy();
  });

  it("is idempotent when same status already processed", async () => {
    verifySignatureMock.mockReturnValue(true);
    mapMidtransStatusMock.mockReturnValue("paid");
    isValidTransitionMock.mockReturnValue(true);

    supabaseAdminMock = createSupabaseAdminMock({
      queries: [
        (ctx) => {
          if (ctx.table === "webhook_payloads" && ctx.operation === "insert") {
            return { data: { id: 1 }, error: null };
          }
          if (ctx.table === "transactions" && ctx.operation === "select") {
            return {
              data: {
                id: 7,
                status: "paid",
                quantity: 2,
                category_id: 9,
              },
              error: null,
            };
          }
          if (ctx.table === "webhook_payloads" && ctx.operation === "update") {
            return { data: [{ id: 1 }], error: null };
          }
          return null as never;
        },
      ],
    });

    const { POST } = await import("@/app/midtrans/callback/route");
    const response = await POST(buildWebhookRequest());
    const body = await response.json();

    expect(body.status).toBe("already_processed");
    expect(
      supabaseAdminMock.__calls.some(
        (call) => call.table === "tickets" && call.operation === "insert",
      ),
    ).toBe(false);
  });
});
