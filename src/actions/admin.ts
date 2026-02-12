"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  getCoreApi,
  mapMidtransStatus,
  isValidTransition,
} from "@/lib/midtrans/server";
import { generateTicketCode } from "@/lib/tickets";

const ADMIN_EMAIL = "project.irfanbayu@gmail.com";

type ActionResult = {
  success: boolean;
  message: string;
  newStatus?: string;
};

/**
 * Verify the caller is an admin. Returns admin info or throws.
 */
const requireAdmin = async () => {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const user = await currentUser();
  const email = user?.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId,
  )?.emailAddress;

  if (email !== ADMIN_EMAIL) throw new Error("Not authorized");

  return { userId, email };
};

/**
 * Re-check a transaction's status directly from Midtrans API.
 * Updates DB if status has changed.
 */
export const recheckTransaction = async (
  orderId: string,
): Promise<ActionResult> => {
  const admin = await requireAdmin();

  try {
    const coreApi = getCoreApi();
    const midtransStatus = await coreApi.transaction.status(orderId);

    const nextStatus = mapMidtransStatus(
      midtransStatus.transaction_status,
      midtransStatus.fraud_status,
    );

    // Get current transaction
    const { data: transaction, error } = await supabaseAdmin
      .from("transactions")
      .select("id, status, quantity, category_id")
      .eq("midtrans_order_id", orderId)
      .single();

    if (error || !transaction) {
      return { success: false, message: "Transaksi tidak ditemukan." };
    }

    if (transaction.status === nextStatus) {
      return {
        success: true,
        message: `Status sudah sesuai: ${nextStatus}`,
        newStatus: nextStatus,
      };
    }

    if (!isValidTransition(transaction.status, nextStatus)) {
      return {
        success: false,
        message: `Transisi tidak valid: ${transaction.status} -> ${nextStatus}`,
      };
    }

    // Update status
    const updateData: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "paid") updateData.paid_at = new Date().toISOString();
    if (nextStatus === "expired")
      updateData.expired_at = new Date().toISOString();

    await supabaseAdmin
      .from("transactions")
      .update(updateData)
      .eq("id", transaction.id);

    // If newly paid, create tickets + decrement stock
    if (nextStatus === "paid" && transaction.status !== "paid") {
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

    // Write audit log
    await supabaseAdmin.from("audit_logs").insert({
      admin_id: admin.userId,
      admin_email: admin.email,
      transaction_id: transaction.id,
      action: "re_check",
      old_status: transaction.status,
      new_status: nextStatus,
      reason: `Re-check via Midtrans API. Midtrans status: ${midtransStatus.transaction_status}`,
      metadata: midtransStatus,
    });

    return {
      success: true,
      message: `Status diperbarui: ${transaction.status} -> ${nextStatus}`,
      newStatus: nextStatus,
    };
  } catch (error) {
    console.error("[recheckTransaction] Error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal mengecek status.",
    };
  }
};

/**
 * Manual override a transaction to paid status.
 * Requires a reason for audit trail.
 */
export const manualOverride = async (
  orderId: string,
  reason: string,
): Promise<ActionResult> => {
  const admin = await requireAdmin();

  if (!reason.trim() || reason.trim().length < 10) {
    return {
      success: false,
      message: "Alasan wajib diisi (minimal 10 karakter).",
    };
  }

  try {
    const { data: transaction, error } = await supabaseAdmin
      .from("transactions")
      .select("id, status, quantity, category_id")
      .eq("midtrans_order_id", orderId)
      .single();

    if (error || !transaction) {
      return { success: false, message: "Transaksi tidak ditemukan." };
    }

    if (transaction.status === "paid") {
      return { success: false, message: "Transaksi sudah berstatus paid." };
    }

    if (!isValidTransition(transaction.status, "paid")) {
      return {
        success: false,
        message: `Tidak bisa override dari status ${transaction.status}.`,
      };
    }

    // Update to paid
    await supabaseAdmin
      .from("transactions")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    // Decrement stock + create tickets
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

    // Write audit log
    await supabaseAdmin.from("audit_logs").insert({
      admin_id: admin.userId,
      admin_email: admin.email,
      transaction_id: transaction.id,
      action: "manual_override",
      old_status: transaction.status,
      new_status: "paid",
      reason: reason.trim(),
    });

    return {
      success: true,
      message: `Transaksi ${orderId} berhasil diubah ke paid.`,
      newStatus: "paid",
    };
  } catch (error) {
    console.error("[manualOverride] Error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal melakukan override.",
    };
  }
};
