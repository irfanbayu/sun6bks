import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminMock } from "../mocks/supabase-admin";

let supabaseAdminMock: ReturnType<typeof createSupabaseAdminMock>;
const authMock = vi.fn();
const generateInvoicePdfMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  get supabaseAdmin() {
    return supabaseAdminMock;
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/invoice-pdf", () => ({
  generateInvoicePdf: generateInvoicePdfMock,
}));

describe("user order detail and invoice routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    generateInvoicePdfMock.mockResolvedValue(Buffer.from("PDF-TEST"));
  });

  it("rejects detail request when user is unauthorized", async () => {
    authMock.mockResolvedValue({ userId: null });
    supabaseAdminMock = createSupabaseAdminMock();

    const { GET } =
      await import("@/app/api/user/orders/[orderId]/detail/route");
    const response = await GET(
      new Request("http://localhost/api/user/orders/ORDER-1/detail"),
      { params: { orderId: "ORDER-1" } },
    );
    expect(response.status).toBe(401);
  });

  it("returns detail data and paid ticket list", async () => {
    supabaseAdminMock = createSupabaseAdminMock({
      queries: [
        (ctx) => {
          if (ctx.table === "transactions") {
            return {
              data: {
                id: 10,
                midtrans_order_id: "ORDER-1",
                status: "paid",
                amount: 200_000,
                quantity: 2,
                customer_name: "Bayu",
                customer_email: "bayu@example.com",
                paid_at: "2026-03-02T10:00:00.000Z",
                expired_at: null,
                created_at: "2026-03-02T09:00:00.000Z",
                event_id: 2,
                category_id: 5,
              },
              error: null,
            };
          }
          if (ctx.table === "events") {
            return {
              data: {
                title: "Standup",
                venue: "Bekasi",
                date: "2026-03-02",
                time_label: "19:00",
              },
              error: null,
            };
          }
          if (ctx.table === "ticket_categories") {
            return { data: { name: "Regular", price: 100_000 }, error: null };
          }
          if (ctx.table === "tickets") {
            return {
              data: [{ ticket_code: "TK-001", status: "active" }],
              error: null,
            };
          }
          return undefined as never;
        },
      ],
    });

    const { GET } =
      await import("@/app/api/user/orders/[orderId]/detail/route");
    const response = await GET(
      new Request("http://localhost/api/user/orders/ORDER-1/detail"),
      { params: { orderId: "ORDER-1" } },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orderId).toBe("ORDER-1");
    expect(body.tickets).toHaveLength(1);
  });

  it("rejects invoice for non-paid orders", async () => {
    supabaseAdminMock = createSupabaseAdminMock({
      queries: [
        (ctx) => {
          if (ctx.table === "transactions") {
            return {
              data: {
                status: "pending",
              },
              error: null,
            };
          }
          return undefined as never;
        },
      ],
    });

    const { GET } =
      await import("@/app/api/user/orders/[orderId]/invoice/route");
    const response = await GET(
      new Request("http://localhost/api/user/orders/ORDER-1/invoice"),
      { params: { orderId: "ORDER-1" } },
    );
    expect(response.status).toBe(400);
  });

  it("returns PDF invoice for paid order", async () => {
    supabaseAdminMock = createSupabaseAdminMock({
      queries: [
        (ctx) => {
          if (ctx.table === "transactions") {
            return {
              data: {
                status: "paid",
                customer_name: "Bayu",
                customer_email: "bayu@example.com",
                customer_phone: "08123456789",
                paid_at: "2026-03-02T10:00:00.000Z",
                amount: 100_000,
                quantity: 1,
                events: {
                  title: "Standup",
                  date: "2026-03-02",
                  time_label: "19:00",
                  venue: "Bekasi",
                },
                ticket_categories: { name: "Regular", price: 100_000 },
                tickets: [{ id: 1, ticket_code: "TK-001", status: "active" }],
              },
              error: null,
            };
          }
          return undefined as never;
        },
      ],
    });

    const { GET } =
      await import("@/app/api/user/orders/[orderId]/invoice/route");
    const response = await GET(
      new Request("http://localhost/api/user/orders/ORDER-1/invoice"),
      { params: { orderId: "ORDER-1" } },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(generateInvoicePdfMock).toHaveBeenCalled();
  });
});
