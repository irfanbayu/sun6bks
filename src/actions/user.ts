"use server";

import { currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import type { DbUserProfile, DbTransaction, DbTicket } from "@/lib/supabase/types";

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
      tickets ( id, ticket_code, status )`
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
      tickets ( id, ticket_code, status )`
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
  orderId: string
): Promise<OrderDetailForInvoice | null> => {
  const userId = await requireAuth();

  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select(
      `*,
      events:event_id ( title, date, time_label, venue, venue_address ),
      ticket_categories:category_id ( name, price ),
      tickets ( id, ticket_code, status, created_at )`
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
