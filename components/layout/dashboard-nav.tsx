"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_GROUPS, SETTINGS_NAV_ITEM, type NavItem } from "@/lib/constants";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const active = isActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
      )}
    >
      {item.label}
    </Link>
  );
}

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-3 text-xs font-medium tracking-wide text-zinc-500 uppercase">
            {group.label}
          </p>
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      ))}

      <div className="flex flex-col gap-1 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <NavLink item={SETTINGS_NAV_ITEM} pathname={pathname} />
      </div>
    </nav>
  );
}
