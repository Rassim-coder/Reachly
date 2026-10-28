import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { getFollowUpNotificationSummary } from "@/features/follow-ups/queries";
import { getProfileDisplayName } from "@/features/settings/queries";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * These routes must read cookies before they can render, so they are allowed
 * to block instead of being prerendered (Next.js 16 cache components).
 */
export const instant = false;

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

  const [followUpNotifications, profileDisplayName] = await Promise.all([
    getFollowUpNotificationSummary(),
    getProfileDisplayName(),
  ]);

  const displayName =
    profileDisplayName ||
    user.user_metadata.full_name?.trim() ||
    user.email?.split("@")[0] ||
    null;

  return (
    <div className="flex min-h-dvh flex-1">
      <DashboardNav userName={displayName} onSignOutSlot={<SignOutButton />} />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          userName={displayName}
          followUpNotifications={followUpNotifications}
        />

        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
