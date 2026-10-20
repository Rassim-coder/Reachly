import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

/**
 * These routes must read cookies before they can render, so they are allowed
 * to block instead of being prerendered (Next.js 16 cache components).
 */
export const instant = false;

/**
 * Layout for the unauthenticated area. Signed-in users are sent to the
 * dashboard so the login screen is never shown to an active session.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  // The login screen owns its own full-viewport two-column layout, so this
  // wrapper stays unstyled apart from flex growth.
  return <main className="flex min-h-dvh flex-1 flex-col">{children}</main>;
}
