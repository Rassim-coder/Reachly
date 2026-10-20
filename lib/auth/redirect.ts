/**
 * Only same-origin, in-app paths may be used as a post-login destination, so a
 * crafted `?next=` cannot turn the login form or auth callback into an open
 * redirect.
 *
 * This function is intentionally NOT in a `"use server"` file so it can be
 * imported by both Server Actions and Route Handlers without violating Next.js's
 * rule that every export of a server-actions file must be async.
 */
export function safeNextPath(
  value: FormDataEntryValue | string | null,
): string {
  const raw = typeof value === "string" ? value : "";

  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/login")) {
    return "/";
  }

  return raw;
}
