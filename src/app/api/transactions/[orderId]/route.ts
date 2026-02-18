import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  getCoreApi,
  mapMidtransStatus,
  isValidTransition,
} from "@/lib/midtrans/server";
import { generateTicketCode } from "@/lib/tickets";

type RouteContext = {
  params: { orderId: string };
};

/**
 * If the transaction is still pending, check Midtrans API for the real status
 * and update DB accordingly. This ensures status syncs even without webhook.
 */
const syncPendingStatus = async (transaction: {
  id: number;
  midtrans_order_id: string;
  status: string;
  quantity: number;
  category_id: number;
}): Promise<string> => {
  if (transaction.status !== "pending") return transaction.status;

  try {
    const coreApi = getCoreApi();
    const midtransStatus = await coreApi.transaction.status(
      transaction.midtrans_order_id
    );

    const nextStatus = mapMidtransStatus(
      midtransStatus.transaction_status,
      midtransStatus.fraud_status
    );

    if (
      nextStatus === transaction.status ||
      !isValidTransition(transaction.status, nextStatus)
    ) {
      return transaction.status;
    }

    const updateData: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "paid") updateData.paid_at = new Date().toISOString();
    if (nextStatus === "expired")
      updateData.expired_at = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("transactions")
      .update(updateData)
      .eq("id", transaction.id)
      .eq("status", "pending");

    if (updateError) {
      console.error("[syncPendingStatus] Update error:", updateError);
      return transaction.status;
    }

    if (nextStatus === "paid") {
      await supabaseAdmin.rpc("decrement_stock", {
        p_category_id: transaction.category_id,
        p_quantity: transaction.quantity,
      });

      const ticketRows = Array.from({ length: transaction.quantity }, () => ({
        transaction_id: transaction.id,
        ticket_code: generateTicketCode(),
        status: "active" as const,
        activated_at: new Date().toISOString(),
      }));

      await supabaseAdmin.from("tickets").insert(ticketRows);
    }

    return nextStatus;
  } catch (error) {
    console.error("[syncPendingStatus] Midtrans check failed:", error);
    return transaction.status;
  }
};

/**
 * GET /api/transactions/:orderId
 * Polling endpoint for payment confirmation page.
 * Auto-syncs pending transactions with Midtrans API.
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

  const currentStatus = await syncPendingStatus({
    id: transaction.id,
    midtrans_order_id: transaction.midtrans_order_id,
    status: transaction.status,
    quantity: transaction.quantity,
    category_id: transaction.category_id,
  });

  let tickets: { ticket_code: string; status: string }[] = [];
  if (currentStatus === "paid") {
    const { data: ticketData } = await supabaseAdmin
      .from("tickets")
      .select("ticket_code, status")
      .eq("transaction_id", transaction.id);

    tickets = ticketData || [];
  }

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
    status: currentStatus,
    amount: transaction.amount,
    quantity: transaction.quantity,
    customerName: transaction.customer_name,
    customerEmail: transaction.customer_email,
    paidAt: currentStatus === "paid" ? (transaction.paid_at ?? new Date().toISOString()) : transaction.paid_at,
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
