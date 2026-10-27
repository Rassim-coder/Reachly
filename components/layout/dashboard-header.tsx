"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  BellIcon,
  MoonIcon,
  PaletteIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
} from "@/components/ui/icons";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { getFollowUpsDueTodayMessage } from "@/features/follow-ups/notifications";

/**
 * Sticky dashboard header matching
 * `reference/Reachly Dashboard (1).html`: search, primary action, theme
 * toggle, notifications, and the account avatar.
 */
/**
 * Reads the effective theme: the value stored by a previous visit, otherwise
 * the OS preference. Returns `"dark"` during SSR so the first paint matches
 * the dashboard's dark default.
 */
function readInitialTheme(): "dark" | "light" {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function DashboardHeader({
  userName,
  followUpsDueToday,
}: {
  userName?: string;
  followUpsDueToday: number | null;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">(readInitialTheme);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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
    if (!notificationsOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setNotificationsOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [notificationsOpen]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  return (
    <header className="sticky top-0 z-10 flex h-[50px] items-center gap-2.5 border-b border-line bg-surface px-4 lg:px-[18px]">
      <div className="hidden h-[30px] w-[230px] items-center gap-2 rounded-full border border-line bg-field px-3 text-faint md:flex">
        <SearchIcon size={14} />
        <span className="flex-1 truncate text-[13px]">Search leads and businesses…</span>
        <kbd className="rounded-[5px] border border-line bg-surface px-[5px] font-sans text-[10px] font-medium">
          ⌘K
        </kbd>
      </div>

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
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="grid size-[30px] place-items-center rounded-full text-muted hover:bg-field"
      >
        {theme === "dark" ? <MoonIcon size={16} /> : <SunIcon size={16} />}
      </button>

      <button
        type="button"
        aria-label="Theme colors"
        className="hidden size-[30px] place-items-center rounded-full text-muted hover:bg-field sm:grid"
      >
        <PaletteIcon size={16} />
      </button>

      <div className="relative">
        <button
          type="button"
          aria-label={
            followUpsDueToday === null
              ? "Notifications"
              : `Notifications, ${followUpsDueToday} follow-ups due today`
          }
          aria-expanded={notificationsOpen}
          aria-controls="dashboard-notifications"
          onClick={() => setNotificationsOpen((open) => !open)}
          className="relative grid size-[30px] place-items-center rounded-full text-muted hover:bg-field"
        >
          <BellIcon size={16} />
          {followUpsDueToday !== null && followUpsDueToday > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white"
            >
              {followUpsDueToday > 99 ? "99+" : followUpsDueToday}
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
            {followUpsDueToday === null ? (
              <p role="status" className="mt-2 text-[12px] text-muted">
                Today&apos;s follow-ups could not be loaded. Please try again later.
              </p>
            ) : followUpsDueToday === 0 ? (
              <p role="status" className="mt-2 text-[12px] text-muted">
                {getFollowUpsDueTodayMessage(0)}
              </p>
            ) : (
              <Link
                href="/follow-ups"
                onClick={() => setNotificationsOpen(false)}
                className="mt-2 block rounded-lg p-2 text-[12px] text-foreground transition-colors hover:bg-field"
              >
                <span className="block">
                  {getFollowUpsDueTodayMessage(followUpsDueToday)}
                </span>
                <span className="mt-1 block text-[11px] text-primary">
                  View Follow-ups →
                </span>
              </Link>
            )}
          </section>
        ) : null}
      </div>

      <span
        aria-hidden="true"
        className={cn(
          "grid size-[30px] shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#3b82f6,#6d3ff0)] text-[10px] font-semibold text-white",
        )}
      >
        {userName ? userName.slice(0, 2).toUpperCase() : "R"}
      </span>
    </header>
  );
}
