import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
}

/**
 * Supabase client for client-side operations
 * Uses anon key with RLS policies
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

/**
 * Supabase admin client for server-side operations
 * Uses service role key to bypass RLS
 * ⚠️ Only use in server-side code (API routes, server actions)
 */
export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Get admin client or throw error if not configured
 */
export const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    throw new Error(
      "Supabase admin client not configured. Missing SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return supabaseAdmin;
};

