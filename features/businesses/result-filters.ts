import type { NormalizedBusiness } from "@/types/api";

/**
 * Client-side filters for businesses already loaded from the search API.
 *
 * Filters never trigger another search and never change which results are
 * loaded; they only decide which loaded rows are visible. Multiple filters use
 * AND logic.
 */

export type PresenceFilter = "all" | "has" | "none";

export type ResultFilters = {
  website: PresenceFilter;
  phone: PresenceFilter;
  email: PresenceFilter;
};

export const DEFAULT_RESULT_FILTERS: ResultFilters = {
  website: "all",
  phone: "all",
  email: "all",
};

function hasValue(value: string | null): boolean {
  return typeof value === "string" && value.trim() !== "";
}

export function matchesPresence(
  value: string | null,
  filter: PresenceFilter,
): boolean {
  if (filter === "all") return true;
  return filter === "has" ? hasValue(value) : !hasValue(value);
}

export function hasActiveFilters(filters: ResultFilters): boolean {
  return (
    filters.website !== "all" ||
    filters.phone !== "all" ||
    filters.email !== "all"
  );
}

export function filterLoadedBusinesses(
  businesses: NormalizedBusiness[],
  filters: ResultFilters,
): NormalizedBusiness[] {
  return businesses.filter(
    (business) =>
      matchesPresence(business.website, filters.website) &&
      matchesPresence(business.phone, filters.phone) &&
      matchesPresence(business.email, filters.email),
  );
}
