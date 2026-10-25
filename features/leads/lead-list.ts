import type { Database } from "@/lib/supabase/database.types";

/**
 * Pure mapping and presentation helpers for the My Leads list.
 *
 * The Supabase query remains in `queries.ts`; this module deliberately has no
 * I/O so the row mapping and formatting can be unit-tested without a database.
 */

export type LeadStatus = Database["public"]["Enums"]["lead_status"];

export type LeadListRowBusiness = {
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
};

export type LeadListRow = {
  id: string;
  created_at: string;
  status: LeadStatus;
  last_contacted_at: string | null;
  next_follow_up_date: string | null;
  /**
   * PostgREST returns a many-to-one embed as an object. The array variant is
   * accepted defensively so a schema/PostgREST change cannot crash the page.
   */
  businesses: LeadListRowBusiness | LeadListRowBusiness[] | null;
};

export type LeadListItem = {
  id: string;
  createdAt: string;
  businessName: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  location: string | null;
  status: LeadStatus;
  lastContactedAt: string | null;
  nextFollowUpDate: string | null;
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  to_contact: "To contact",
  contacted: "Contacted",
  interested: "Interested",
  not_interested: "Not interested",
  follow_up: "Follow-up",
};

export function leadStatusLabel(status: LeadStatus): string {
  return LEAD_STATUS_LABELS[status] ?? "Unknown";
}

/** Runtime guard for untrusted form values before a status update. */
export function isLeadStatus(value: unknown): value is LeadStatus {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(LEAD_STATUS_LABELS, value)
  );
}

function cleanText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function formatLeadLocation(
  address: string | null,
  city: string | null,
): string | null {
  const parts = [cleanText(address), cleanText(city)].filter(
    (part): part is string => part !== null,
  );

  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Turns the source category token into a readable label without changing the
 * underlying value stored in the database.
 */
export function formatLeadCategory(value: string | null | undefined): string | null {
  const category = cleanText(value);
  if (!category) return null;

  const words = category.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (words === "") return null;

  return words.charAt(0).toUpperCase() + words.slice(1);
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const timestampFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/**
 * Formats both `timestamptz` values and date-only values consistently.
 * Invalid or empty values return `null` so the UI can show its own fallback.
 */
export function formatLeadDate(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (trimmed === "") return null;

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T00:00:00Z`
    : trimmed;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return null;

  return dateFormatter.format(date);
}

/** Formats an activity timestamp with a visible time, unlike date-only fields. */
export function formatLeadTimestamp(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return timestampFormatter.format(date);
}

/** The current calendar day used for date-only follow-up comparisons. */
export function todayDateString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export type LeadFollowUpState = "overdue" | "today" | "upcoming" | "none";

/**
 * Follow-up dates are date-only values. Comparing their normalized YYYY-MM-DD
 * form avoids timezone shifts and time-of-day ambiguity.
 */
export function getLeadFollowUpState(
  value: string | null | undefined,
  today: string = todayDateString(),
): LeadFollowUpState {
  const followUpDate = cleanText(value);
  if (!followUpDate || !/^\d{4}-\d{2}-\d{2}$/.test(followUpDate)) {
    return "none";
  }

  if (followUpDate < today) return "overdue";
  if (followUpDate === today) return "today";
  return "upcoming";
}

export function leadFollowUpLabel(state: LeadFollowUpState): string {
  switch (state) {
    case "overdue":
      return "Overdue";
    case "today":
      return "Due today";
    case "upcoming":
      return "Upcoming";
    default:
      return "Not scheduled";
  }
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function displayWebsite(value: string): string {
  return value.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

/**
 * Converts one Supabase join row into the fields the My Leads list renders.
 * Returns `null` when the related business is unavailable or unusable.
 */
export function mapLeadRow(row: LeadListRow): LeadListItem | null {
  const business = Array.isArray(row.businesses)
    ? (row.businesses[0] ?? null)
    : row.businesses;

  if (!business) return null;

  const businessName = cleanText(business.name);
  if (!businessName) return null;

  return {
    id: row.id,
    createdAt: row.created_at,
    businessName,
    category: formatLeadCategory(business.category),
    phone: cleanText(business.phone),
    email: cleanText(business.email),
    website: cleanText(business.website),
    location: formatLeadLocation(business.address, business.city),
    status: row.status,
    lastContactedAt: row.last_contacted_at,
    nextFollowUpDate: row.next_follow_up_date,
  };
}
