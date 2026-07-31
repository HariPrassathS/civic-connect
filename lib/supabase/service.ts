/**
 * Creates a Supabase client using the service role key.
 * This client bypasses RLS and should ONLY be used in server-side code
 * for operations that need cross-user access (e.g., AI processing pipeline,
 * auto-assignment, escalation engine).
 */

import { createClient } from "@supabase/supabase-js";

export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for service role client"
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
