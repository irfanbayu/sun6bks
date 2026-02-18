"use server";

import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import {
  getCoreApi,
  mapMidtransStatus,
  isValidTransition,
} from "@/lib/midtrans/server";
import { generateTicketCode } from "@/lib/tickets";
import type {
  DbUserProfile,
  DbTransaction,
  DbTicket,
} from "@/lib/supabase/types";

// ────────────────────────────────────────────────────────────
// ensureUserProfile
// ────────────────────────────────────────────────────────────

/**
 * Ensures a user_profiles row exists for the current Clerk user.
 * Creates one if missing. Returns the profile.
 */
export const ensureUserProfile = async (): Promise<DbUserProfile> => {
  const userId = await requireAuth();
  const user = await currentUser();

  const email =
    user?.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ?? null;

  const name = user?.fullName ?? user?.firstName ?? null;

  // Try to fetch existing profile
  const { data: existing } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (existing) {
    // Update name/email if changed in Clerk
    if (existing.name !== name || existing.email !== email) {
      await supabaseAdmin
        .from("user_profiles")
        .update({ name, email })
        .eq("clerk_user_id", userId);
    }
    return { ...existing, name, email } as DbUserProfile;
  }

  // Determine role: auto-assign ADMIN if email matches INITIAL_ADMIN_EMAIL
  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const role =
    initialAdminEmail && email === initialAdminEmail ? "ADMIN" : "USER";

  // Create new profile
  const { data: created, error } = await supabaseAdmin
    .from("user_profiles")
    .insert({
      clerk_user_id: userId,
      name,
      email,
      role,
    })
    .select("*")
    .single();

  if (error || !created) {
    console.error("[ensureUserProfile] Insert error:", error);
    throw new Error("Gagal membuat profil user.");
  }

  return created as DbUserProfile;
};

// ────────────────────────────────────────────────────────────
// getUserProfile
// ────────────────────────────────────────────────────────────

export const getUserProfile = async (): Promise<DbUserProfile | null> => {
  const userId = await requireAuth();

  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  return (data as DbUserProfile) ?? null;
};

// ────────────────────────────────────────────────────────────
// getUserOrders
// ────────────────────────────────────────────────────────────

export type UserOrderItem = DbTransaction & {
  events: { title: string; date: string; venue: string } | null;
  ticket_categories: { name: string } | null;
  tickets: Pick<DbTicket, "id" | "ticket_code" | "status">[];
};

export const getUserOrders = async (): Promise<UserOrderItem[]> => {
  const userId = await requireAuth();

  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select(
      `*,
      events:event_id ( title, date, venue ),
      ticket_categories:category_id ( name ),
      tickets ( id, ticket_code, status )`,
    )
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getUserOrders] Error:", error);
    return [];
  }

  return (data as UserOrderItem[]) ?? [];
};

// ────────────────────────────────────────────────────────────
// getUserLastOrder
// ────────────────────────────────────────────────────────────

export const getUserLastOrder = async (): Promise<UserOrderItem | null> => {
  const userId = await requireAuth();

  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select(
      `*,
      events:event_id ( title, date, venue ),
      ticket_categories:category_id ( name ),
      tickets ( id, ticket_code, status )`,
    )
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getUserLastOrder] Error:", error);
    return null;
  }

  return (data as UserOrderItem) ?? null;
};

// ────────────────────────────────────────────────────────────
// getOrderDetail (for invoice)
// ────────────────────────────────────────────────────────────

export type OrderDetailForInvoice = DbTransaction & {
  events: {
    title: string;
    date: string;
    time_label: string;
    venue: string;
    venue_address: string | null;
  } | null;
  ticket_categories: { name: string; price: number } | null;
  tickets: Pick<DbTicket, "id" | "ticket_code" | "status" | "created_at">[];
};

export const getOrderDetail = async (
  orderId: string,
): Promise<OrderDetailForInvoice | null> => {
  const userId = await requireAuth();

  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select(
      `*,
      events:event_id ( title, date, time_label, venue, venue_address ),
      ticket_categories:category_id ( name, price ),
      tickets ( id, ticket_code, status, created_at )`,
    )
    .eq("midtrans_order_id", orderId)
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getOrderDetail] Error:", error);
    return null;
  }

  return (data as OrderDetailForInvoice) ?? null;
};

// ────────────────────────────────────────────────────────────
// recheckMyOrder — manual status check by user
// ────────────────────────────────────────────────────────────

type RecheckResult = {
  success: boolean;
  message: string;
  newStatus?: string;
};

export const recheckMyOrder = async (
  orderId: string,
): Promise<RecheckResult> => {
  const userId = await requireAuth();

  try {
    const { data: transaction, error } = await supabaseAdmin
      .from("transactions")
      .select("id, status, quantity, category_id, midtrans_order_id")
      .eq("midtrans_order_id", orderId)
      .eq("clerk_user_id", userId)
      .single();

    if (error || !transaction) {
      return { success: false, message: "Transaksi tidak ditemukan." };
    }

    if (transaction.status !== "pending") {
      return {
        success: true,
        message: `Status saat ini: ${transaction.status}`,
        newStatus: transaction.status,
      };
    }

    const coreApi = getCoreApi();
    const midtransStatus = await coreApi.transaction.status(orderId);

    const nextStatus = mapMidtransStatus(
      midtransStatus.transaction_status,
      midtransStatus.fraud_status,
    );

    if (nextStatus === "pending") {
      return {
        success: true,
        message: "Pembayaran belum diterima. Silakan selesaikan pembayaran.",
        newStatus: "pending",
      };
    }

    if (!isValidTransition(transaction.status, nextStatus)) {
      return {
        success: false,
        message: "Tidak dapat memperbarui status.",
      };
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
      console.error("[recheckMyOrder] Update error:", updateError);
      return { success: false, message: "Gagal memperbarui status." };
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

    const statusLabels: Record<string, string> = {
      paid: "Pembayaran berhasil! Tiket sudah aktif.",
      expired: "Pembayaran kedaluwarsa.",
      failed: "Pembayaran gagal.",
      refunded: "Pembayaran telah di-refund.",
    };

    return {
      success: true,
      message: statusLabels[nextStatus] ?? `Status: ${nextStatus}`,
      newStatus: nextStatus,
    };
  } catch (error) {
    console.error("[recheckMyOrder] Error:", error);
    return {
      success: false,
      message: "Gagal mengecek status. Coba lagi nanti.",
    };
  }
};
