export const APP_NAME = "Reachly";
export const APP_DESCRIPTION =
  "B2B business prospecting and lightweight CRM.";

export type NavItem = {
  href: string;
  label: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/**
 * Dashboard navigation, grouped as described in PROJECT_BRIEF.md
 * (Prospecting, Organize, Assistant) with Settings kept separate.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Prospecting",
    items: [
      { href: "/", label: "Overview" },
      { href: "/find-businesses", label: "Find Businesses" },
      { href: "/my-leads", label: "My Leads" },
      { href: "/follow-ups", label: "Follow-ups" },
    ],
  },
  {
    label: "Organize",
    items: [
      { href: "/lists", label: "Lists" },
      { href: "/analytics", label: "Analytics" },
      { href: "/templates", label: "Templates" },
    ],
  },
  {
    label: "Assistant",
    items: [{ href: "/ai-assistant", label: "AI Assistant" }],
  },
];

export const SETTINGS_NAV_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
};
