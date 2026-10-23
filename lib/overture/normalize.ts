import type { NormalizedBusiness } from "@/types/api";

import type { PlaceRow } from "./query";

function trimmedOrNull(value: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function finiteOrNull(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Map one Overture place to the API contract in `types/api.ts`.
 *
 * Returns `null` when the source record has no usable business name. Optional
 * contact details and coordinates stay `null` — they are never fabricated.
 */
export function normalizeBusiness(row: PlaceRow): NormalizedBusiness | null {
  const name = trimmedOrNull(row.name);
  if (!name || !row.id) return null;

  return {
    sourceId: row.id,
    name,
    category: trimmedOrNull(row.category),
    address: trimmedOrNull(row.address),
    latitude: finiteOrNull(row.lat),
    longitude: finiteOrNull(row.lon),
    phone: trimmedOrNull(row.phone),
    website: trimmedOrNull(row.website),
    email: trimmedOrNull(row.email),
  };
}

/** Normalize a result set, dropping records without a business name. */
export function normalizeBusinesses(rows: PlaceRow[]): NormalizedBusiness[] {
  const results: NormalizedBusiness[] = [];

  for (const row of rows) {
    const business = normalizeBusiness(row);
    if (business) results.push(business);
  }

  return results;
}
