"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  BellIcon,
  ChevronDownIcon,
  MoonIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  buildFollowUpNotificationItems,
  hasEnabledFollowUpNotifications,
} from "@/features/follow-ups/notifications";
import type { FollowUpNotificationSummary } from "@/features/follow-ups/queries";
import { useThemePreference } from "@/hooks/use-theme-preference";

/**
 * Sticky dashboard header matching
 * `reference/Reachly Dashboard (1).html`: search, primary action, theme
 * toggle, notifications, and the account avatar.
 */
/**
 * Theme state is shared with Settings and persisted through `lib/theme.ts`.
 */
export function DashboardHeader({
  userName,
  followUpNotifications,
}: {
  userName?: string;
  followUpNotifications: FollowUpNotificationSummary;
}) {
  const router = useRouter();
  const { resolvedTheme, setPreference } = useThemePreference();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const notificationItems = followUpNotifications.counts
    ? buildFollowUpNotificationItems(
        followUpNotifications.counts,
        followUpNotifications.preferences,
      )
    : [];
  const notificationCount = notificationItems.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function refreshAtNextUtcDay() {
      const now = new Date();
      const nextUtcMidnight = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
      );

      timer = setTimeout(() => {
        router.refresh();
        refreshAtNextUtcDay();
      }, Math.max(1000, nextUtcMidnight - now.getTime() + 50));
    }

    refreshAtNextUtcDay();
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (!notificationsOpen && !accountMenuOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setAccountMenuOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [notificationsOpen, accountMenuOpen]);

  function toggleTheme() {
    setPreference(resolvedTheme === "dark" ? "light" : "dark");
  }

  return (
    <header className="sticky top-0 z-10 flex h-[50px] items-center gap-2.5 border-b border-line bg-surface px-4 lg:px-[18px]">
      <Link
        href="/my-leads"
        aria-label="Open the My Leads search"
        className="hidden h-[30px] w-[230px] items-center gap-2 rounded-full border border-line bg-field px-3 text-faint hover:border-primary/40 hover:text-muted md:flex"
      >
        <SearchIcon size={14} />
        <span className="flex-1 truncate text-[13px]">Search saved leads…</span>
      </Link>

      <div className="flex-1" />

      <Link
        href="/find-businesses"
        className="flex h-[30px] items-center gap-1.5 rounded-full bg-[linear-gradient(90deg,#6d3ff0,#0a8fe0)] px-3.5 text-[13px] font-medium text-white shadow-[0_2px_6px_rgba(109,63,240,.3)] max-sm:px-2.5"
      >
        <PlusIcon size={14} />
        <span className="max-sm:hidden">Add lead</span>
      </Link>

      <div aria-hidden="true" className="h-[22px] w-px bg-line" />

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="grid size-[30px] place-items-center rounded-full text-muted hover:bg-field"
      >
        {resolvedTheme === "dark" ? <MoonIcon size={16} /> : <SunIcon size={16} />}
      </button>

      <div className="relative">
        <button
          type="button"
          aria-label={
            followUpNotifications.error || followUpNotifications.counts === null
              ? "Notifications"
              : `Notifications, ${notificationCount} follow-ups`
          }
          aria-expanded={notificationsOpen}
          aria-controls="dashboard-notifications"
          onClick={() => {
            setAccountMenuOpen(false);
            setNotificationsOpen((open) => !open);
          }}
          className="relative grid size-[30px] place-items-center rounded-full text-muted hover:bg-field"
        >
          <BellIcon size={16} />
          {!followUpNotifications.error && notificationCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white"
            >
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          ) : null}
        </button>

        {notificationsOpen ? (
          <section
            id="dashboard-notifications"
            aria-label="Notifications"
            className="absolute top-full right-0 z-50 mt-2 w-[min(320px,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-3 shadow-card"
          >
            <h2 className="text-[12px] font-semibold">Notifications</h2>
            {followUpNotifications.error || followUpNotifications.counts === null ? (
              <p role="status" className="mt-2 text-[12px] text-muted">
                Today&apos;s follow-ups could not be loaded. Please try again later.
              </p>
            ) : !hasEnabledFollowUpNotifications(followUpNotifications.preferences) ? (
              <div className="mt-2 text-[12px] text-muted">
                <p>Follow-up notifications are turned off.</p>
                <Link
                  href="/settings"
                  onClick={() => setNotificationsOpen(false)}
                  className="mt-1 inline-block text-[11px] text-primary hover:underline"
                >
                  Manage notification settings
                </Link>
              </div>
            ) : notificationItems.length === 0 ? (
              <p role="status" className="mt-2 text-[12px] text-muted">
                No follow-up notifications right now.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {notificationItems.map((item) => (
                  <li key={item.type}>
                    <Link
                      href="/follow-ups"
                      onClick={() => setNotificationsOpen(false)}
                      className="block rounded-lg p-2 text-[12px] text-foreground transition-colors hover:bg-field"
                    >
                      <span className="block">{item.message}</span>
                      <span className="mt-1 block text-[11px] text-primary">
                        View Follow-ups →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="Open account menu"
          aria-expanded={accountMenuOpen}
          aria-controls="dashboard-account-menu"
          onClick={() => {
            setNotificationsOpen(false);
            setAccountMenuOpen((open) => !open);
          }}
          className="flex h-[30px] items-center gap-1 rounded-full text-muted hover:bg-field"
        >
          <span
            aria-hidden="true"
            className={cn(
              "grid size-[30px] shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#3b82f6,#6d3ff0)] text-[10px] font-semibold text-white",
            )}
          >
            {userName ? userName.slice(0, 2).toUpperCase() : "R"}
          </span>
          <ChevronDownIcon size={12} />
        </button>

        {accountMenuOpen ? (
          <div
            id="dashboard-account-menu"
            aria-label="Account menu"
            className="absolute top-full right-0 z-50 mt-2 w-56 rounded-xl border border-line bg-surface p-2 shadow-card"
          >
            <p className="truncate px-2 py-1 text-[11px] text-faint">
              {userName ?? "Account"}
            </p>
            <Link
              href="/settings"
              onClick={() => setAccountMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] text-muted hover:bg-field hover:text-foreground"
            >
              <SettingsIcon size={14} />
              Account settings
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}
