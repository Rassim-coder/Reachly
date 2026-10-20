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

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
