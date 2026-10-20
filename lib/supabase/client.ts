import { createBrowserClient } from "@supabase/ssr";

import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * Supabase client for Client Components and browser code.
 *
 * Uses the publishable key only — never a service-role key. Row Level Security
 * is the access boundary for everything this client can reach.
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
