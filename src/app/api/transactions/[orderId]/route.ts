import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type RouteContext = {
  params: { orderId: string };
};

/**
 * GET /api/transactions/:orderId
 * Public polling endpoint for payment confirmation page.
 * Returns minimal transaction info (status, tickets if paid).
 */
export const GET = async (
  _request: Request,
  { params }: RouteContext
) => {
  const { orderId } = params;

  if (!orderId) {
    return NextResponse.json(
      { error: "Order ID is required" },
      { status: 400 }
    );
  }

  // Fetch transaction with tickets (if any)
  const { data: transaction, error } = await supabaseAdmin
    .from("transactions")
    .select(
      `
      id,
      midtrans_order_id,
      status,
      amount,
      quantity,
      customer_name,
      customer_email,
      paid_at,
      expired_at,
      created_at,
      event_id,
      category_id
    `
    )
    .eq("midtrans_order_id", orderId)
    .single();

  if (error || !transaction) {
    return NextResponse.json(
      { error: "Transaction not found" },
      { status: 404 }
    );
  }

  // If paid, also fetch tickets
  let tickets: { ticket_code: string; status: string }[] = [];
  if (transaction.status === "paid") {
    const { data: ticketData } = await supabaseAdmin
      .from("tickets")
      .select("ticket_code, status")
      .eq("transaction_id", transaction.id);

    tickets = ticketData || [];
  }

  // Fetch event title + category name for display
  const [eventResult, categoryResult] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("title, venue, date, time_label")
      .eq("id", transaction.event_id)
      .single(),
    supabaseAdmin
      .from("ticket_categories")
      .select("name, price")
      .eq("id", transaction.category_id)
      .single(),
  ]);

  return NextResponse.json({
    orderId: transaction.midtrans_order_id,
    status: transaction.status,
    amount: transaction.amount,
    quantity: transaction.quantity,
    customerName: transaction.customer_name,
    customerEmail: transaction.customer_email,
    paidAt: transaction.paid_at,
    expiredAt: transaction.expired_at,
    createdAt: transaction.created_at,
    event: eventResult.data
      ? {
          title: eventResult.data.title,
          venue: eventResult.data.venue,
          date: eventResult.data.date,
          timeLabel: eventResult.data.time_label,
        }
      : null,
    category: categoryResult.data
      ? {
          name: categoryResult.data.name,
          price: categoryResult.data.price,
        }
      : null,
    tickets,
  });
};
