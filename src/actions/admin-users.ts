"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { DbUserProfile, UserRole } from "@/lib/supabase/types";

type ActionResult = {
  success: boolean;
  message: string;
};

// ────────────────────────────────────────────────────────────
// getAdminUsers — fetch all user profiles for admin listing
// ────────────────────────────────────────────────────────────

export type AdminUserItem = DbUserProfile & {
  _transactionCount: number;
};

export const getAdminUsers = async (): Promise<AdminUserItem[]> => {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAdminUsers] Error:", error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Fetch transaction counts per clerk_user_id
  const clerkIds = data.map((u) => u.clerk_user_id);
  const { data: txCounts } = await supabaseAdmin
    .from("transactions")
    .select("clerk_user_id")
    .in("clerk_user_id", clerkIds);

  const countMap: Record<string, number> = {};
  (txCounts || []).forEach((tx) => {
    const cid = tx.clerk_user_id as string;
    countMap[cid] = (countMap[cid] || 0) + 1;
  });

  return (data as DbUserProfile[]).map((u) => ({
    ...u,
    _transactionCount: countMap[u.clerk_user_id] || 0,
  }));
};

// ────────────────────────────────────────────────────────────
// updateUserRole — promote or demote a user
// ────────────────────────────────────────────────────────────

export const updateUserRole = async (
  targetClerkUserId: string,
  newRole: UserRole,
): Promise<ActionResult> => {
  const admin = await requireAdmin();

  // Prevent admin from demoting themselves
  if (targetClerkUserId === admin.userId && newRole !== "ADMIN") {
    return {
      success: false,
      message: "Tidak bisa menurunkan role diri sendiri.",
    };
  }

  // Validate role
  if (newRole !== "ADMIN" && newRole !== "USER") {
    return { success: false, message: "Role tidak valid." };
  }

  try {
    // Fetch the target user
    const { data: targetUser } = await supabaseAdmin
      .from("user_profiles")
      .select("id, role, email")
      .eq("clerk_user_id", targetClerkUserId)
      .single();

    if (!targetUser) {
      return { success: false, message: "User tidak ditemukan." };
    }

    if (targetUser.role === newRole) {
      return {
        success: true,
        message: `User sudah memiliki role ${newRole}.`,
      };
    }

    const oldRole = targetUser.role;

    // Update role
    const { error } = await supabaseAdmin
      .from("user_profiles")
      .update({ role: newRole })
      .eq("clerk_user_id", targetClerkUserId);

    if (error) {
      console.error("[updateUserRole] Error:", error);
      return { success: false, message: error.message };
    }

    // Write audit log
    await supabaseAdmin.from("audit_logs").insert({
      admin_id: admin.userId,
      admin_email: admin.email,
      transaction_id: null,
      action: "role_change",
      old_status: oldRole,
      new_status: newRole,
      reason: `Role changed from ${oldRole} to ${newRole} for user ${targetUser.email ?? targetClerkUserId}`,
    });

    return {
      success: true,
      message: `Role berhasil diubah: ${oldRole} → ${newRole}.`,
    };
  } catch (error) {
    console.error("[updateUserRole] Error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal mengubah role.",
    };
  }
};
