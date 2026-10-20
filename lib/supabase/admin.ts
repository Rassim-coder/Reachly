import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * Privileged Supabase client for server-side operations that must bypass RLS.
 *
 * Uses the service-role key, which is never exposed to the browser. Only
 * call this from trusted server code (Server Actions, Route Handlers, or
 * background jobs).
 */
export function createAdminClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. " +
        "Add it to .env for server-side privileged operations.",
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      // The admin client does not manage browser sessions.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
