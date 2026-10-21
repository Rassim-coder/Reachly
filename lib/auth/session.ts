import { cache } from "react";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Returns the authenticated user for the current request, or `null`.
 *
 * Wrapped in React `cache` so a layout, page, and child component in the same
 * render share a single `auth.getUser()` round trip.
 *
 * `connection()` forces request-time rendering before the Supabase client
 * loads the stored session, because its auth client calls `Date.now()` for
 * token-expiry checks, which Next.js rejects while prerendering a route shell.
 */
export const getCurrentUser = cache(async () => {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
});
