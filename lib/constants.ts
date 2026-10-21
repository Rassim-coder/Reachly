export const APP_NAME = "Reachly";
export const APP_DESCRIPTION =
  "B2B business prospecting and lightweight CRM.";

/**
 * Icon key for a nav item. Resolved to a component in
 * `components/ui/icons.tsx` by `DashboardNav`, so the data stays free of JSX.
 */
export type NavIcon =
  | "layout-dashboard"
  | "search"
  | "bookmark"
  | "bell-ring"
  | "list"
  | "bar-chart"
  | "file-text"
  | "bot"
  | "settings";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  /** Short trailing badge (e.g. a follow-up count). Omitted when absent. */
  badge?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/**
 * Dashboard navigation, grouped as described in PROJECT_BRIEF.md
 * (Prospecting, Organize, Assistant) with Settings kept separate.
 * Layout follows `reference/Reachly Dashboard (1).html`.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Prospecting",
    items: [
      { href: "/", label: "Overview", icon: "layout-dashboard" },
      { href: "/find-businesses", label: "Find Businesses", icon: "search" },
      { href: "/my-leads", label: "My Leads", icon: "bookmark" },
      { href: "/follow-ups", label: "Follow-ups", icon: "bell-ring" },
    ],
  },
  {
    label: "Organize",
    items: [
      { href: "/lists", label: "Lists", icon: "list" },
      { href: "/analytics", label: "Analytics", icon: "bar-chart" },
      { href: "/templates", label: "Templates", icon: "file-text" },
    ],
  },
  {
    label: "Assistant",
    items: [{ href: "/ai-assistant", label: "AI Assistant", icon: "bot" }],
  },
];

export const SETTINGS_NAV_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: "settings",
};
