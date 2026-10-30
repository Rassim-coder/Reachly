import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

import type { Database } from "./database.types";

/** Routes that are reachable without a session. */
const PUBLIC_PATH_PREFIXES = ["/", "/login", "/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Builds a redirect that also carries any session cookies Supabase rotated
 * during `getUser()`. Without this, the refreshed tokens are lost.
 */
function redirectWithCookies(
  from: NextResponse,
  to: URL,
): NextResponse {
  const redirectResponse = NextResponse.redirect(to);

  for (const cookie of from.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  return redirectResponse;
}

/**
 * Refreshes the Supabase auth session for an incoming request, writes any
 * rotated cookies back to the response, and redirects unauthenticated traffic
 * to the login screen.
 *
 * This runs from `proxy.ts` on every matched request. The route layouts repeat
 * the authentication check as a second layer of defense.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: `getUser()` must be called so the token is refreshed and the
  // refreshed cookies are attached to the response. Do not remove it, and do
  // not run code between creating the client and this call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") {
      url.searchParams.set("next", `${pathname}${search}`);
    }
    return redirectWithCookies(response, url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return redirectWithCookies(response, url);
  }

  return response;
}
