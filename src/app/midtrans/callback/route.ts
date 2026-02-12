import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  verifySignature,
  mapMidtransStatus,
  isValidTransition,
} from "@/lib/midtrans/server";
import { generateTicketCode } from "@/lib/tickets";

// Midtrans webhook notification payload type
type MidtransNotification = {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: string;
  currency: string;
  [key: string]: unknown;
};

/**
 * POST /midtrans/callback
 * Midtrans Webhook — Single Source of Truth for payment status.
 * Always returns 200 to prevent Midtrans retry storms.
 */
export const POST = async (request: Request) => {
  try {
    const body = (await request.json()) as MidtransNotification;

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = body;

    // 1. Verify signature
    const signatureValid = verifySignature(
      order_id,
      status_code,
      gross_amount,
      signature_key
    );

    // 2. Persist raw webhook payload (always, even if invalid)
    await supabaseAdmin.from("webhook_payloads").insert({
      midtrans_order_id: order_id,
      payload: body,
      signature_valid: signatureValid,
      processed: false,
    });

    if (!signatureValid) {
      console.error(
        `[Webhook] Invalid signature for order ${order_id}`
      );
      // Return 200 to avoid retry — but mark as not processed
      return NextResponse.json({ status: "invalid_signature" });
    }

    // 3. Lookup transaction
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("id, status, quantity, category_id")
      .eq("midtrans_order_id", order_id)
      .single();

    if (txError || !transaction) {
      console.warn(
        `[Webhook] Transaction not found for order ${order_id}. Stored payload for later.`
      );
      return NextResponse.json({ status: "transaction_not_found" });
    }

    // 4. Map to internal status
    const nextStatus = mapMidtransStatus(transaction_status, fraud_status);

    // 5. Check valid transition (idempotent)
    if (!isValidTransition(transaction.status, nextStatus)) {
      console.info(
        `[Webhook] Ignoring invalid transition ${transaction.status} -> ${nextStatus} for order ${order_id}`
      );
      // Mark webhook as processed
      await supabaseAdmin
        .from("webhook_payloads")
        .update({ processed: true })
        .eq("midtrans_order_id", order_id)
        .order("created_at", { ascending: false })
        .limit(1);

      return NextResponse.json({ status: "no_transition" });
    }

    // Same status = idempotent, no DB change needed
    if (transaction.status === nextStatus) {
      await supabaseAdmin
        .from("webhook_payloads")
        .update({ processed: true })
        .eq("midtrans_order_id", order_id)
        .order("created_at", { ascending: false })
        .limit(1);

      return NextResponse.json({ status: "already_processed" });
    }

    // 6. Update transaction status
    const updateData: Record<string, unknown> = {
      status: nextStatus,
    };

    if (nextStatus === "paid") {
      updateData.paid_at = new Date().toISOString();
    }
    if (nextStatus === "expired") {
      updateData.expired_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from("transactions")
      .update(updateData)
      .eq("id", transaction.id)
      .eq("status", transaction.status); // Optimistic lock

    if (updateError) {
      console.error(
        `[Webhook] Failed to update transaction ${order_id}:`,
        updateError
      );
      return NextResponse.json({ status: "update_failed" });
    }

    // 7. If paid: decrement stock + create tickets
    if (nextStatus === "paid") {
      // Decrement stock atomically
      const { error: stockError } = await supabaseAdmin.rpc(
        "decrement_stock",
        {
          p_category_id: transaction.category_id,
          p_quantity: transaction.quantity,
        }
      );

      if (stockError) {
        console.error(
          `[Webhook] Failed to decrement stock for order ${order_id}:`,
          stockError
        );
        // Transaction is already paid, stock decrement failed.
        // This will be caught by reconciliation.
      }

      // Create ticket rows
      const ticketRows = Array.from(
        { length: transaction.quantity },
        () => ({
          transaction_id: transaction.id,
          ticket_code: generateTicketCode(),
          status: "active" as const,
          activated_at: new Date().toISOString(),
        })
      );

      const { error: ticketError } = await supabaseAdmin
        .from("tickets")
        .insert(ticketRows);

      if (ticketError) {
        console.error(
          `[Webhook] Failed to create tickets for order ${order_id}:`,
          ticketError
        );
      }
    }

    // 8. Mark webhook payload as processed
    await supabaseAdmin
      .from("webhook_payloads")
      .update({ processed: true })
      .eq("midtrans_order_id", order_id)
      .order("created_at", { ascending: false })
      .limit(1);

    console.info(
      `[Webhook] Order ${order_id}: ${transaction.status} -> ${nextStatus}`
    );

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Webhook] Unhandled error:", error);
    // Always return 200 to prevent retry storm
    return NextResponse.json({ status: "error" });
  }
};
