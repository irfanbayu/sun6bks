import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  getCoreApi,
  mapMidtransStatus,
  isValidTransition,
} from "@/lib/midtrans/server";
import { verifyOrderStatusToken } from "@/lib/security/order-status-token";
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
      transaction.midtrans_order_id,
    );

    const nextStatus = mapMidtransStatus(
      midtransStatus.transaction_status,
      midtransStatus.fraud_status,
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
export const GET = async (request: Request, { params }: RouteContext) => {
  try {
    const { userId } = await auth();
    const { orderId } = params;
    const { searchParams } = new URL(request.url);

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
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
      clerk_user_id,
      paid_at,
      expired_at,
      created_at,
      category_id
    `,
      )
      .eq("midtrans_order_id", orderId)
      .single();

    if (error || !transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    const isOrderOwner =
      Boolean(userId) && transaction.clerk_user_id === userId;
    const hasValidStatusToken = verifyOrderStatusToken({
      orderId,
      signature: searchParams.get("sig"),
      expiresAt: searchParams.get("exp"),
    });

    if (!isOrderOwner && !hasValidStatusToken) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    const currentStatus = await syncPendingStatus({
      id: transaction.id,
      midtrans_order_id: transaction.midtrans_order_id,
      status: transaction.status,
      quantity: transaction.quantity,
      category_id: transaction.category_id,
    });

    return NextResponse.json({
      orderId: transaction.midtrans_order_id,
      status: currentStatus,
      amount: transaction.amount,
      quantity: transaction.quantity,
      paidAt:
        currentStatus === "paid"
          ? (transaction.paid_at ?? new Date().toISOString())
          : transaction.paid_at,
      expiredAt: transaction.expired_at,
      createdAt: transaction.created_at,
    });
  } catch (error) {
    console.error("[api/transactions] Request failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
};
