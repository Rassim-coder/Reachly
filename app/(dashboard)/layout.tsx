import { redirect } from "next/navigation";

import { DashboardNav } from "@/components/layout/dashboard-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/constants";

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
 * Note: this shell is a functional placeholder. The approved dashboard design
 * has not been added to the repository yet; see PROJECT_BRIEF.md §6.
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

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-b border-zinc-200 p-4 lg:w-60 lg:border-r lg:border-b-0 dark:border-zinc-800">
        <p className="px-3 text-base font-semibold tracking-tight">
          {APP_NAME}
        </p>
        <DashboardNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
          <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
            {user.email}
          </p>
          <SignOutButton />
        </header>

        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
