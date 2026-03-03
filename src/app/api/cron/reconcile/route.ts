import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  getCoreApi,
  mapMidtransStatus,
  isValidTransition,
} from "@/lib/midtrans/server";

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
  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET is not configured.");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find pending transactions older than 30 minutes
    const thirtyMinutesAgo = new Date(
      Date.now() - 30 * 60 * 1000,
    ).toISOString();

    const { data: pendingTransactions, error } = await supabaseAdmin
      .from("transactions")
      .select("id, midtrans_order_id, status, quantity, category_id")
      .eq("status", "pending")
      .lt("created_at", thirtyMinutesAgo)
      .limit(50); // Process in batches

    if (error) {
      console.error("[Cron] Failed to fetch pending transactions:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
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
          transaction.midtrans_order_id,
        );

        const nextStatus = mapMidtransStatus(
          midtransStatus.transaction_status,
          midtransStatus.fraud_status,
        );

        processed++;

        // Skip if no change
        if (transaction.status === nextStatus) continue;

        // Skip invalid transitions
        if (!isValidTransition(transaction.status, nextStatus)) continue;

        // Idempotency: paid → gunakan RPC atomic; selain itu update status saja
        if (nextStatus === "paid") {
          const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
            "complete_paid_transaction",
            {
              p_transaction_id: transaction.id,
              p_category_id: transaction.category_id,
              p_quantity: transaction.quantity,
            },
          );

          if (!rpcError) {
            const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
            if (result?.success) updated++;
          }
        } else {
          const updateData: Record<string, unknown> = { status: nextStatus };
          if (nextStatus === "expired")
            updateData.expired_at = new Date().toISOString();

          const { error: updateError } = await supabaseAdmin
            .from("transactions")
            .update(updateData)
            .eq("id", transaction.id)
            .eq("status", "pending");

          if (!updateError) updated++;
        }

        console.info(
          `[Cron] Order ${transaction.midtrans_order_id}: ${transaction.status} -> ${nextStatus}`,
        );
      } catch (err) {
        errors.push(`Order ${transaction.midtrans_order_id}: failed`);
        console.error(
          `[Cron] Error processing order ${transaction.midtrans_order_id}:`,
          err,
        );
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
      { status: 500 },
    );
  }
};
