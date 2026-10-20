import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * Returns the authenticated user for the current request, or `null`.
 *
 * Wrapped in React `cache` so a layout, page, and child component in the same
 * render share a single `auth.getUser()` round trip.
 */
export const getCurrentUser = cache(async () => {
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
