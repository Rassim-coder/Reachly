import type { Database } from "@/lib/supabase/database.types";

import {
  formatLeadCategory,
  type LeadListItem,
  type LeadStatus,
} from "./lead-list.ts";

/**
 * Pure mapping for the lead detail drawer and detail route. Database reads live
 * in `queries.ts`; this module only converts joined rows and activity rows into
 * view data.
 */

export type LeadActivityKind = Database["public"]["Enums"]["activity_kind"];

export type LeadDetailRowBusiness = {
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
};

export type LeadDetailRow = {
  id: string;
  created_at: string;
  status: LeadStatus;
  last_contacted_at: string | null;
  next_follow_up_date: string | null;
  businesses: LeadDetailRowBusiness | LeadDetailRowBusiness[] | null;
};

export type LeadActivityRow = {
  id: string;
  kind: string;
  body: string | null;
  created_at: string;
};

export type LeadNoteItem = {
  id: string;
  body: string;
  createdAt: string;
};

export type LeadActivityItem = {
  id: string;
  kind: LeadActivityKind;
  label: string;
  body: string;
  createdAt: string;
};

export type LeadDetail = LeadListItem & {
  notes: LeadNoteItem[];
  activities: LeadActivityItem[];
};

const ACTIVITY_KIND_LABELS: Record<LeadActivityKind, string> = {
  saved: "Lead saved",
  note: "Note",
  status_change: "Status changed",
  follow_up_scheduled: "Follow-up scheduled",
  follow_up_completed: "Follow-up completed",
  follow_up_cleared: "Follow-up cleared",
};

function cleanText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function locationLabel(address: string | null, city: string | null): string | null {
  const parts = [cleanText(address), cleanText(city)].filter(
    (part): part is string => part !== null,
  );

  return parts.length > 0 ? parts.join(", ") : null;
}

export function isValidLeadId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isActivityKind(value: string): value is LeadActivityKind {
  return Object.prototype.hasOwnProperty.call(ACTIVITY_KIND_LABELS, value);
}

/** Kept for the existing note-only detail helpers and tests. */
export function mapLeadActivityRow(row: LeadActivityRow): LeadNoteItem | null {
  if (row.kind !== "note") return null;

  const body = cleanText(row.body);
  if (!body) return null;

  return { id: row.id, body, createdAt: row.created_at };
}

/** Maps every supported activity kind into the drawer timeline. */
export function mapLeadActivityItem(
  row: LeadActivityRow,
): LeadActivityItem | null {
  if (!isActivityKind(row.kind)) return null;

  const cleanBody = cleanText(row.body);

  // An empty note has no content to show. Other activity kinds have a useful
  // label even when older rows were stored without a body.
  if (row.kind === "note" && !cleanBody) return null;

  return {
    id: row.id,
    kind: row.kind,
    label: ACTIVITY_KIND_LABELS[row.kind],
    body: cleanBody ?? ACTIVITY_KIND_LABELS[row.kind],
    createdAt: row.created_at,
  };
}

export function mapLeadDetailRow(
  row: LeadDetailRow,
  activities: LeadActivityRow[],
): LeadDetail | null {
  const business = Array.isArray(row.businesses)
    ? (row.businesses[0] ?? null)
    : row.businesses;
  const businessName = cleanText(business?.name);

  if (!businessName) return null;

  const mappedActivities = activities
    .map(mapLeadActivityItem)
    .filter((activity): activity is LeadActivityItem => activity !== null);

  const notes = mappedActivities
    .filter((activity) => activity.kind === "note")
    .map((activity) => ({
      id: activity.id,
      body: activity.body,
      createdAt: activity.createdAt,
    }));

  return {
    id: row.id,
    createdAt: row.created_at,
    businessName,
    category: formatLeadCategory(business?.category),
    phone: cleanText(business?.phone),
    email: cleanText(business?.email),
    website: cleanText(business?.website),
    location: locationLabel(
      business?.address ?? null,
      business?.city ?? null,
    ),
    status: row.status,
    lastContactedAt: row.last_contacted_at,
    nextFollowUpDate: row.next_follow_up_date,
    notes,
    activities: mappedActivities,
  };
}
