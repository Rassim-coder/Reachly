"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  BarChartIcon,
  BellRingIcon,
  BookmarkIcon,
  BotIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  ListIcon,
  MenuIcon,
  SearchIcon,
  SettingsIcon,
  XIcon,
} from "@/components/ui/icons";
import { APP_NAME, NAV_GROUPS, SETTINGS_NAV_ITEM, type NavIcon, type NavItem } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV_ICONS: Record<NavIcon, typeof SearchIcon> = {
  "layout-dashboard": LayoutDashboardIcon,
  search: SearchIcon,
  bookmark: BookmarkIcon,
  "bell-ring": BellRingIcon,
  list: ListIcon,
  "bar-chart": BarChartIcon,
  "file-text": FileTextIcon,
  bot: BotIcon,
  settings: SettingsIcon,
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = isActive(pathname, item.href);
  const Icon = NAV_ICONS[item.icon];

  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={cn(
          "rl-rail-item group/item relative flex h-9 w-full items-center gap-3 rounded-[10px] px-2.5 text-left text-[13px] font-medium transition-colors",
          active
            ? "bg-tint text-primary"
            : "text-muted hover:bg-field hover:text-ink",
        )}
      >
        {active ? (
          <span
            aria-hidden="true"
            className="absolute top-1.5 bottom-1.5 left-[-8px] w-[3px] rounded-[2px] bg-primary"
          />
        ) : null}
        <Icon className="shrink-0" />
        <span className="rl-rail-label truncate">{item.label}</span>
        {item.badge ? (
          <span className="rl-rail-label ml-auto rounded-full bg-accent-blue px-[7px] py-[1px] text-[10px] font-semibold text-white">
            {item.badge}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(true);
  // When the rail is collapsed the group header is hidden, so its items must
  // stay visible regardless of the group's own open/closed state.
  const expanded = collapsed ? true : open;

  return (
    <div>
      {label ? (
        <button
          type="button"
          aria-expanded={expanded}
          tabIndex={collapsed ? -1 : 0}
          onClick={() => setOpen(!open)}
        className="rl-rail-label flex w-full items-center justify-between px-2.5 pt-3 pb-1.5 text-[10px] font-medium tracking-[.08em] text-faint uppercase"
        >
          {label}
          <ChevronDownIcon
            size={12}
            className={cn("transition-transform duration-150", !expanded && "-rotate-90")}
          />
        </button>
      ) : null}
      <ul hidden={!expanded} className="m-0 list-none p-0">
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * Dashboard sidebar matching `reference/Reachly Dashboard (1).html`: a sticky
 * rail that collapses to icons on desktop and slides in as a drawer on
 * mobile.
 */
export function DashboardNav({
  userName,
  onSignOutSlot,
}: {
  userName?: string;
  onSignOutSlot?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // The desktop collapse button is hidden on mobile, where the rail becomes a
  // drawer; keep the collapsed flag from leaking into the drawer layout.
  const collapsedOnRail = collapsed;

  // Settings sits outside the grouped sections in the reference design, so it
  // is appended without a header of its own.
  const groups = [...NAV_GROUPS, { label: "", items: [SETTINGS_NAV_ITEM] }];

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setDrawerOpen(true)}
        className="fixed top-3 left-3 z-30 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-field lg:hidden"
      >
        <MenuIcon size={18} />
      </button>

      {drawerOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[236px] -translate-x-full flex-col border-r border-line bg-sidebar transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:z-20 lg:h-dvh lg:translate-x-0",
          drawerOpen && "translate-x-0 shadow-[0_0_40px_rgba(0,0,0,.25)]",
          collapsedOnRail && "rl-rail-collapsed lg:w-[68px]",
        )}
      >
        <div className="flex h-[50px] items-center gap-2.5 border-b border-line px-4">
          <span className="grid size-7 shrink-0 place-items-center">
            <Image
              src="/reachly-logo-mark.png"
              alt=""
              aria-hidden="true"
              width={477}
              height={571}
              className="h-7 w-auto"
              priority
            />
          </span>
          <div className="rl-rail-label min-w-0">
            <b className="block truncate text-[13px] leading-[1.1] text-primary">
              {APP_NAME}
            </b>
            <small className="text-[9px] tracking-[.1em] text-faint">PROSPECTING</small>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="ml-auto text-faint lg:hidden"
          >
            <XIcon size={16} />
          </button>
        </div>

        <button
          type="button"
          aria-label="Collapse sidebar"
          aria-expanded={!collapsedOnRail}
          onClick={() => setCollapsed(!collapsedOnRail)}
          className="absolute top-[68px] -right-[11px] hidden h-[22px] w-[22px] place-items-center rounded-full border border-line bg-surface text-muted lg:grid"
        >
          <ChevronLeftIcon
            size={12}
            className={cn("transition-transform duration-200", collapsedOnRail && "rotate-180")}
          />
        </button>

        <nav className="flex-1 overflow-auto px-2 pt-2 pb-3" aria-label="Dashboard">
          {groups.map((group) => (
            <NavGroup
              key={group.label || group.items[0].href}
              label={group.label}
              items={group.items}
              pathname={pathname}
              collapsed={collapsedOnRail}
              onNavigate={() => setDrawerOpen(false)}
            />
          ))}
        </nav>

        <div className="flex items-center gap-2.5 border-t border-line px-3.5 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#3b82f6,#6d3ff0)] text-[11px] font-semibold text-white">
            {userName ? userName.slice(0, 2).toUpperCase() : "R"}
          </span>
          <div className="rl-rail-label min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium">
              {userName || "Account"}
            </p>
            <small className="block truncate text-[11px] text-faint">Founder</small>
          </div>
          <span className="rl-rail-label text-faint">{onSignOutSlot}</span>
        </div>
      </aside>
    </>
  );
}