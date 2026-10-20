import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

/**
 * Next.js 16 proxy (previously `middleware`).
 *
 * Runs on every matched request, refreshes the Supabase auth session, and
 * writes rotated cookies back to the response. Authorization is enforced in
 * the route layouts, not here.
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - Next.js internals (`_next/static`, `_next/image`)
     * - static asset files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
