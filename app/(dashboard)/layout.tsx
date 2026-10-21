import { Inter } from "next/font/google";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * These routes must read cookies before they can render, so they are allowed
 * to block instead of being prerendered (Next.js 16 cache components).
 */
export const instant = false;

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * Authenticated dashboard shell.
 *
 * The auth guard lives here (not in `proxy.ts`) so every dashboard route is
 * protected and the signed-in user is available to child segments.
 *
 * Layout, sidebar, and header follow `reference/Reachly Dashboard (1).html`.
 * Only the shell is implemented: individual screens read real data and show
 * empty states until their backend work lands (see AGENTS.md
 * "Status Terminology" and PROJECT_BRIEF.md §6).
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    user.user_metadata.full_name?.trim() || user.email?.split("@")[0] || null;

  return (
    <div className={`flex flex-1 ${inter.className}`}>
      <DashboardNav userName={displayName} onSignOutSlot={<SignOutButton />} />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader userName={displayName} />

        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}