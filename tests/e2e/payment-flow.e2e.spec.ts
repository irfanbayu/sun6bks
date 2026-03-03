import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminMock } from "../mocks/supabase-admin";

type TransactionRow = {
  id: number;
  midtrans_order_id: string;
  event_id: number;
  category_id: number;
  quantity: number;
  amount: number;
  status: "pending" | "paid" | "expired" | "failed" | "refunded";
  snap_token: string;
  snap_redirect_url: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  clerk_user_id?: string;
  paid_at: string | null;
  expired_at: string | null;
  created_at: string;
};

let supabaseAdminMock: ReturnType<typeof createSupabaseAdminMock>;
const authMock = vi.fn();
const verifyOrderStatusTokenMock = vi.fn();
const sendInvoiceEmailMock = vi.fn();
const generateInvoicePdfMock = vi.fn();

let orderCounter = 1;
const coreStatusByOrder = new Map<
  string,
  { transaction_status: string; fraud_status?: string }
>();

vi.mock("@/lib/supabase/server", () => ({
  get supabaseAdmin() {
    return supabaseAdminMock;
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/security/order-status-token", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/security/order-status-token")>();
  return {
    ...actual,
    verifyOrderStatusToken: verifyOrderStatusTokenMock,
  };
});

vi.mock("@/lib/email", () => ({
  sendInvoiceEmail: sendInvoiceEmailMock,
}));

vi.mock("@/lib/invoice-pdf", () => ({
  generateInvoicePdf: generateInvoicePdfMock,
}));

vi.mock("@/lib/midtrans/server", () => ({
  createSnapTransaction: vi.fn().mockResolvedValue({
    token: "snap-token-e2e",
    redirect_url: "https://sandbox.midtrans.com/mock-redirect",
  }),
  generateOrderId: vi
    .fn()
    .mockImplementation(() => `ORDER-E2E-${orderCounter++}`),
  formatJakartaTime: vi.fn().mockReturnValue("2026-03-02 10:00:00 +0700"),
  verifySignature: vi.fn().mockReturnValue(true),
  mapMidtransStatus: vi
    .fn()
    .mockImplementation((status: string, fraudStatus?: string) => {
      if (status === "settlement") return "paid";
      if (status === "expire") return "expired";
      if (status === "cancel" || status === "deny") return "failed";
      if (status === "capture")
        return fraudStatus === "accept" ? "paid" : "pending";
      return "pending";
    }),
  isValidTransition: vi
    .fn()
    .mockImplementation(
      (current: string, next: string) =>
        current === next ||
        current === "pending" ||
        (current === "paid" && next === "refunded"),
    ),
  getCoreApi: () => ({
    transaction: {
      status: vi.fn().mockImplementation(async (orderId: string) => {
        return (
          coreStatusByOrder.get(orderId) ?? { transaction_status: "pending" }
        );
      }),
    },
  }),
}));

let ticketCounter = 1;
vi.mock("@/lib/tickets", () => ({
  generateTicketCode: vi
    .fn()
    .mockImplementation(() => `TK-E2E-${ticketCounter++}`),
}));

describe("payment lifecycle e2e (internal modules)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    orderCounter = 1;
    ticketCounter = 1;
    coreStatusByOrder.clear();
    authMock.mockResolvedValue({ userId: "user-e2e-1" });
    verifyOrderStatusTokenMock.mockReturnValue(true);
    sendInvoiceEmailMock.mockResolvedValue(undefined);
    generateInvoicePdfMock.mockResolvedValue(Buffer.from("PDF-E2E"));

    const state = {
      events: [
        {
          id: 1,
          title: "Standup Bekasi",
          is_published: true,
          venue: "Bekasi Hall",
          date: "2026-03-05",
          time_label: "19:00",
        },
      ],
      categories: [
        {
          id: 2,
          name: "Regular",
          price: 100_000,
          is_active: true,
          event_id: 1,
        },
      ],
      stocks: [{ category_id: 2, remaining_stock: 10 }],
      transactions: [] as TransactionRow[],
      tickets: [] as Array<{
        transaction_id: number;
        ticket_code: string;
        status: string;
        activated_at: string;
      }>,
      webhooks: [] as Array<{
        midtrans_order_id: string;
        processed: boolean;
        signature_valid: boolean;
      }>,
    };

    const getEqValue = (
      filters: Array<{ op: string; field: string; value: unknown }>,
      field: string,
    ) =>
      filters.find((filter) => filter.op === "eq" && filter.field === field)
        ?.value;

    const nextTransactionId = () => state.transactions.length + 1;

    supabaseAdminMock = createSupabaseAdminMock({
      queries: [
        (ctx) => {
          if (ctx.table === "events" && ctx.operation === "select") {
            const id = Number(getEqValue(ctx.filters, "id"));
            return {
              data: state.events.find((event) => event.id === id) ?? null,
              error: null,
            };
          }

          if (ctx.table === "ticket_categories" && ctx.operation === "select") {
            const id = Number(getEqValue(ctx.filters, "id"));
            return {
              data:
                state.categories.find((category) => category.id === id) ?? null,
              error: null,
            };
          }

          if (ctx.table === "ticket_stocks" && ctx.operation === "select") {
            const categoryId = Number(getEqValue(ctx.filters, "category_id"));
            return {
              data:
                state.stocks.find(
                  (stock) => stock.category_id === categoryId,
                ) ?? null,
              error: null,
            };
          }

          if (ctx.table === "transactions" && ctx.operation === "insert") {
            const payload = ctx.payload as Omit<
              TransactionRow,
              "id" | "paid_at" | "expired_at" | "created_at"
            >;
            state.transactions.push({
              id: nextTransactionId(),
              ...payload,
              paid_at: null,
              expired_at: null,
              created_at: new Date().toISOString(),
            });
            return { data: [{ id: nextTransactionId() - 1 }], error: null };
          }

          if (ctx.table === "transactions" && ctx.operation === "select") {
            const orderId = String(
              getEqValue(ctx.filters, "midtrans_order_id") ?? "",
            );
            const owner = getEqValue(ctx.filters, "clerk_user_id");
            const record = state.transactions.find((transaction) => {
              if (transaction.midtrans_order_id !== orderId) return false;
              if (owner && transaction.clerk_user_id !== owner) return false;
              return true;
            });

            if (!record) return { data: null, error: { message: "not found" } };

            if (ctx.columns?.includes("events:event_id")) {
              const event =
                state.events.find((item) => item.id === record.event_id) ??
                null;
              const category =
                state.categories.find(
                  (item) => item.id === record.category_id,
                ) ?? null;
              const tickets = state.tickets
                .filter((ticket) => ticket.transaction_id === record.id)
                .map((ticket, index) => ({
                  id: index + 1,
                  ticket_code: ticket.ticket_code,
                  status: ticket.status,
                }));
              return {
                data: {
                  ...record,
                  events: event
                    ? {
                        title: event.title,
                        date: event.date,
                        time_label: event.time_label,
                        venue: event.venue,
                        venue_address: "Bekasi",
                      }
                    : null,
                  ticket_categories: category
                    ? {
                        name: category.name,
                        price: category.price,
                      }
                    : null,
                  tickets,
                },
                error: null,
              };
            }

            return { data: record, error: null };
          }

          if (ctx.table === "transactions" && ctx.operation === "update") {
            const id = Number(getEqValue(ctx.filters, "id"));
            const currentStatus = getEqValue(ctx.filters, "status");
            const record = state.transactions.find(
              (transaction) => transaction.id === id,
            );
            if (!record)
              return { data: null, error: { message: "missing transaction" } };
            if (currentStatus && record.status !== currentStatus) {
              return { data: null, error: { message: "stale status" } };
            }
            Object.assign(record, ctx.payload as Record<string, unknown>);
            return { data: [record], error: null };
          }

          if (ctx.table === "webhook_payloads" && ctx.operation === "insert") {
            const payload = ctx.payload as {
              midtrans_order_id: string;
              processed: boolean;
              signature_valid: boolean;
            };
            state.webhooks.push(payload);
            return { data: [{ id: state.webhooks.length }], error: null };
          }

          if (ctx.table === "webhook_payloads" && ctx.operation === "update") {
            const orderId = String(
              getEqValue(ctx.filters, "midtrans_order_id"),
            );
            const target = [...state.webhooks]
              .reverse()
              .find((item) => item.midtrans_order_id === orderId);
            if (target) target.processed = true;
            return { data: target ? [target] : [], error: null };
          }

          if (ctx.table === "events" && ctx.operation === "select") {
            return { data: state.events[0], error: null };
          }

          if (ctx.table === "tickets" && ctx.operation === "insert") {
            const payload =
              (ctx.payload as Array<{
                transaction_id: number;
                ticket_code: string;
                status: string;
                activated_at: string;
              }>) ?? [];
            state.tickets.push(...payload);
            return { data: payload, error: null };
          }

          if (ctx.table === "tickets" && ctx.operation === "select") {
            const transactionId = Number(
              getEqValue(ctx.filters, "transaction_id"),
            );
            const list = state.tickets
              .filter((ticket) => ticket.transaction_id === transactionId)
              .map((ticket) => ({
                ticket_code: ticket.ticket_code,
                status: ticket.status,
              }));
            return { data: list, error: null };
          }

          return undefined as never;
        },
      ],
      rpc: {
        decrement_stock: async (args) => {
          const { p_category_id: categoryId, p_quantity: quantity } = args as {
            p_category_id: number;
            p_quantity: number;
          };
          const stock = state.stocks.find(
            (item) => item.category_id === categoryId,
          );
          if (!stock)
            return { data: null, error: { message: "stock missing" } };
          stock.remaining_stock -= quantity;
          return { data: { ok: true }, error: null };
        },
        complete_paid_transaction: async (args) => {
          const {
            p_transaction_id: txId,
            p_category_id: categoryId,
            p_quantity: quantity,
          } = args as {
            p_transaction_id: number;
            p_category_id: number;
            p_quantity: number;
          };
          const tx = state.transactions.find((t) => t.id === txId);
          if (!tx || tx.status !== "pending")
            return { data: [{ success: true, message: "Already processed" }], error: null };
          const existingTickets = state.tickets.filter((t) => t.transaction_id === txId);
          if (existingTickets.length > 0)
            return { data: [{ success: true, message: "Tickets already issued" }], error: null };
          const stock = state.stocks.find((s) => s.category_id === categoryId);
          if (!stock || stock.remaining_stock < quantity)
            return { data: [{ success: false, message: "Insufficient stock" }], error: null };
          tx.status = "paid";
          tx.paid_at = new Date().toISOString();
          stock.remaining_stock -= quantity;
          for (let i = 0; i < quantity; i++) {
            state.tickets.push({
              transaction_id: txId,
              ticket_code: `TK-E2E-${ticketCounter++}`,
              status: "active",
              activated_at: new Date().toISOString(),
            });
          }
          return { data: [{ success: true, message: "OK" }], error: null };
        },
      },
    });
  });

  it("handles success callback flow from order creation to invoice", async () => {
    const { createOrderAndSnapToken } = await import("@/actions/midtrans");
    const order = await createOrderAndSnapToken({
      eventId: 1,
      categoryId: 2,
      eventTitle: "Standup Bekasi",
      quantity: 2,
      pricePerTicket: 100_000,
      customerName: "Bayu",
      customerEmail: "bayu@example.com",
      customerPhone: "08123456789",
      clerkUserId: "user-e2e-1",
    });

    expect(order.success).toBe(true);
    expect(order.orderId).toBe("ORDER-E2E-1");

    const { POST } = await import("@/app/midtrans/callback/route");
    const callbackResponse = await POST(
      new Request("http://localhost/midtrans/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          order_id: "ORDER-E2E-1",
          status_code: "200",
          gross_amount: "200000",
          signature_key: "valid",
          transaction_status: "settlement",
          fraud_status: "accept",
        }),
      }),
    );
    expect((await callbackResponse.json()).status).toBe("ok");

    const { GET: getTransaction } =
      await import("@/app/api/transactions/[orderId]/route");
    const txResponse = await getTransaction(
      new Request("http://localhost/api/transactions/ORDER-E2E-1"),
      { params: { orderId: "ORDER-E2E-1" } },
    );
    const txData = await txResponse.json();
    expect(txData.status).toBe("paid");

    const { GET: getDetail } =
      await import("@/app/api/user/orders/[orderId]/detail/route");
    const detailResponse = await getDetail(
      new Request("http://localhost/api/user/orders/ORDER-E2E-1/detail"),
      { params: { orderId: "ORDER-E2E-1" } },
    );
    const detailData = await detailResponse.json();
    expect(detailData.tickets.length).toBeGreaterThan(0);

    const { GET: getInvoice } =
      await import("@/app/api/user/orders/[orderId]/invoice/route");
    const invoiceResponse = await getInvoice(
      new Request("http://localhost/api/user/orders/ORDER-E2E-1/invoice"),
      { params: { orderId: "ORDER-E2E-1" } },
    );
    expect(invoiceResponse.status).toBe(200);
    expect(invoiceResponse.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("handles failure flow with expired status", async () => {
    const { createOrderAndSnapToken } = await import("@/actions/midtrans");
    await createOrderAndSnapToken({
      eventId: 1,
      categoryId: 2,
      eventTitle: "Standup Bekasi",
      quantity: 1,
      pricePerTicket: 100_000,
      customerName: "Bayu",
      customerEmail: "bayu@example.com",
      customerPhone: "08123456789",
      clerkUserId: "user-e2e-1",
    });

    const { POST } = await import("@/app/midtrans/callback/route");
    await POST(
      new Request("http://localhost/midtrans/callback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          order_id: "ORDER-E2E-1",
          status_code: "200",
          gross_amount: "100000",
          signature_key: "valid",
          transaction_status: "expire",
        }),
      }),
    );

    const { GET } = await import("@/app/api/transactions/[orderId]/route");
    const response = await GET(
      new Request("http://localhost/api/transactions/ORDER-E2E-1"),
      { params: { orderId: "ORDER-E2E-1" } },
    );
    const data = await response.json();
    expect(data.status).toBe("expired");
  });

  it("handles retry flow by polling sync when callback is missing", async () => {
    const { createOrderAndSnapToken } = await import("@/actions/midtrans");
    await createOrderAndSnapToken({
      eventId: 1,
      categoryId: 2,
      eventTitle: "Standup Bekasi",
      quantity: 1,
      pricePerTicket: 100_000,
      customerName: "Bayu",
      customerEmail: "bayu@example.com",
      customerPhone: "08123456789",
      clerkUserId: "user-e2e-1",
    });

    coreStatusByOrder.set("ORDER-E2E-1", {
      transaction_status: "settlement",
      fraud_status: "accept",
    });

    const { GET } = await import("@/app/api/transactions/[orderId]/route");
    const response = await GET(
      new Request("http://localhost/api/transactions/ORDER-E2E-1"),
      { params: { orderId: "ORDER-E2E-1" } },
    );
    const data = await response.json();
    expect(data.status).toBe("paid");
  });
});
