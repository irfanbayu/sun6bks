"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { DbUserProfile } from "@/lib/supabase/types";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export type AdminInfo = {
  userId: string;
  email: string;
  role: "ADMIN";
};

// ────────────────────────────────────────────────────────────
// requireAuth — ensures the user is logged in via Clerk
// ────────────────────────────────────────────────────────────

export const requireAuth = async (): Promise<string> => {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  return userId;
};

// ────────────────────────────────────────────────────────────
// getUserRole — fetches user role from user_profiles table
// ────────────────────────────────────────────────────────────

export const getUserRole = async (
  clerkUserId: string,
): Promise<DbUserProfile["role"] | null> => {
  const { data } = await supabaseAdmin
    .from("user_profiles")
    .select("role")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  return data?.role ?? null;
};

// ────────────────────────────────────────────────────────────
// isAdmin — check if current user has ADMIN role in DB
// ────────────────────────────────────────────────────────────

export const isAdmin = async (): Promise<boolean> => {
  const { userId } = await auth();
  if (!userId) return false;

  const role = await getUserRole(userId);
  return role === "ADMIN";
};

// ────────────────────────────────────────────────────────────
// requireAdmin — throws if the current user is not an admin
// Used in server actions & API routes
// ────────────────────────────────────────────────────────────

export const requireAdmin = async (): Promise<AdminInfo> => {
  const userId = await requireAuth();

  // Fetch profile from DB (role-based check)
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("role, email")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (!profile || profile.role !== "ADMIN") {
    throw new Error("Forbidden: Admin access required");
  }

  // Fallback email from Clerk if DB email is null
  let email = profile.email;
  if (!email) {
    const user = await currentUser();
    email =
      user?.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ?? "unknown";
  }

  return { userId, email, role: "ADMIN" };
};
