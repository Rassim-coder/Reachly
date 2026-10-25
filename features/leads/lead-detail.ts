import type { LeadListItem, LeadStatus } from "./lead-list";

/**
 * Pure mapping for the lead detail screen. Database reads live in `queries.ts`;
 * this module only converts joined rows and activity rows into view data.
 */

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

export type LeadDetail = LeadListItem & {
  category: string | null;
  notes: LeadNoteItem[];
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

export function mapLeadActivityRow(row: LeadActivityRow): LeadNoteItem | null {
  if (row.kind !== "note") return null;

  const body = cleanText(row.body);
  if (!body) return null;

  return { id: row.id, body, createdAt: row.created_at };
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

  const notes = activities
    .map(mapLeadActivityRow)
    .filter((note): note is LeadNoteItem => note !== null);

  return {
    id: row.id,
    createdAt: row.created_at,
    businessName,
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
    category: cleanText(business?.category),
    notes,
  };
}
