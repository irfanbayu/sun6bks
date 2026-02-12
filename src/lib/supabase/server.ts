import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton — avoids throwing during Next.js build when env vars are absent.
let _client: SupabaseClient | null = null;

const getSupabaseAdmin = (): SupabaseClient => {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }
  if (!supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  _client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
};

/**
 * Service-role Supabase client — bypasses RLS.
 * Use only in server actions / route handlers.
 *
 * Implemented as a Proxy so existing code can keep using `supabaseAdmin.from(...)` directly
 * while deferring actual initialisation to the first call (build-safe).
 */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
