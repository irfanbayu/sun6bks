import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  getCoreApi,
  mapMidtransStatus,
  isValidTransition,
} from "@/lib/midtrans/server";
import { generateTicketCode } from "@/lib/tickets";

// Opt out of pre-render so this route is only evaluated at runtime
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/reconcile
 * Cron job: reconcile pending transactions older than 30 minutes.
 * Protected by CRON_SECRET (Vercel cron sends this in Authorization header).
 */
export const GET = async (request: Request) => {
  // Verify CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Find pending transactions older than 30 minutes
    const thirtyMinutesAgo = new Date(
      Date.now() - 30 * 60 * 1000
    ).toISOString();

    const { data: pendingTransactions, error } = await supabaseAdmin
      .from("transactions")
      .select("id, midtrans_order_id, status, quantity, category_id")
      .eq("status", "pending")
      .lt("created_at", thirtyMinutesAgo)
      .limit(50); // Process in batches

    if (error) {
      console.error("[Cron] Failed to fetch pending transactions:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    if (!pendingTransactions || pendingTransactions.length === 0) {
      return NextResponse.json({
        status: "ok",
        message: "No pending transactions to reconcile.",
        processed: 0,
      });
    }

    const coreApi = getCoreApi();
    let processed = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const transaction of pendingTransactions) {
      try {
        const midtransStatus = await coreApi.transaction.status(
          transaction.midtrans_order_id
        );

        const nextStatus = mapMidtransStatus(
          midtransStatus.transaction_status,
          midtransStatus.fraud_status
        );

        processed++;

        // Skip if no change
        if (transaction.status === nextStatus) continue;

        // Skip invalid transitions
        if (!isValidTransition(transaction.status, nextStatus)) continue;

        // Update transaction
        const updateData: Record<string, unknown> = { status: nextStatus };
        if (nextStatus === "paid")
          updateData.paid_at = new Date().toISOString();
        if (nextStatus === "expired")
          updateData.expired_at = new Date().toISOString();

        await supabaseAdmin
          .from("transactions")
          .update(updateData)
          .eq("id", transaction.id)
          .eq("status", "pending"); // Optimistic lock

        // If paid: create tickets + decrement stock
        if (nextStatus === "paid") {
          await supabaseAdmin.rpc("decrement_stock", {
            p_category_id: transaction.category_id,
            p_quantity: transaction.quantity,
          });

          const ticketRows = Array.from(
            { length: transaction.quantity },
            () => ({
              transaction_id: transaction.id,
              ticket_code: generateTicketCode(),
              status: "active" as const,
              activated_at: new Date().toISOString(),
            })
          );

          await supabaseAdmin.from("tickets").insert(ticketRows);
        }

        updated++;

        console.info(
          `[Cron] Order ${transaction.midtrans_order_id}: ${transaction.status} -> ${nextStatus}`
        );
      } catch (err) {
        const errorMsg = `Order ${transaction.midtrans_order_id}: ${
          err instanceof Error ? err.message : String(err)
        }`;
        errors.push(errorMsg);
        console.error(`[Cron] Error processing ${errorMsg}`);
      }
    }

    return NextResponse.json({
      status: "ok",
      processed,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[Cron] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
