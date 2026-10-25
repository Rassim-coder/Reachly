import { isLeadStatus, type LeadStatus } from "./lead-list.ts";

/**
 * Pure parsing helpers for the My Leads server query. All values arrive from
 * the client and are normalized here before they are used in a database query.
 */

export const LEAD_PAGE_SIZE = 20;
export const MAX_LEAD_FILTER_LENGTH = 100;
const MAX_PAGE = 10_000;

export type LeadFollowUpFilter = "all" | "overdue" | "upcoming" | "none";

export type LeadSort =
  | "newest"
  | "oldest"
  | "follow_up_asc"
  | "follow_up_desc";

export type LeadListFilters = {
  search: string;
  category: string;
  status: LeadStatus | "all";
  followUp: LeadFollowUpFilter;
  sort: LeadSort;
  page: number;
};

export const DEFAULT_LEAD_FILTERS: LeadListFilters = {
  search: "",
  category: "",
  status: "all",
  followUp: "all",
  sort: "newest",
  page: 1,
};

const FOLLOW_UP_FILTERS: readonly LeadFollowUpFilter[] = [
  "all",
  "overdue",
  "upcoming",
  "none",
];

const LEAD_SORTS: readonly LeadSort[] = [
  "newest",
  "oldest",
  "follow_up_asc",
  "follow_up_desc",
];

function cleanFilterText(value: unknown): string {
  if (typeof value !== "string") return "";

  return value.trim().slice(0, MAX_LEAD_FILTER_LENGTH);
}

function isFollowUpFilter(value: unknown): value is LeadFollowUpFilter {
  return (
    typeof value === "string" &&
    FOLLOW_UP_FILTERS.includes(value as LeadFollowUpFilter)
  );
}

function isLeadSort(value: unknown): value is LeadSort {
  return (
    typeof value === "string" && LEAD_SORTS.includes(value as LeadSort)
  );
}

function cleanPage(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1
  ) {
    return DEFAULT_LEAD_FILTERS.page;
  }

  return Math.min(value, MAX_PAGE);
}

/**
 * Keeps the client on a real page after a mutation or deletion removes the last
 * rows from the requested page. An empty result set always resolves to page 1.
 */
export function getSafeLeadPage(page: number, pageCount: number): number {
  if (!Number.isInteger(pageCount) || pageCount < 1) return 1;
  if (!Number.isInteger(page) || page < 1) return 1;

  return Math.min(page, pageCount);
}

/** Revalidates an untrusted filter object before it reaches Supabase. */
export function parseLeadFilters(input: unknown): LeadListFilters {
  if (typeof input !== "object" || input === null) {
    return { ...DEFAULT_LEAD_FILTERS };
  }

  const candidate = input as Record<string, unknown>;
  const status = candidate.status;

  return {
    search: cleanFilterText(candidate.search),
    category: cleanFilterText(candidate.category),
    status: isLeadStatus(status) ? status : "all",
    followUp: isFollowUpFilter(candidate.followUp)
      ? candidate.followUp
      : "all",
    sort: isLeadSort(candidate.sort) ? candidate.sort : "newest",
    page: cleanPage(candidate.page),
  };
}

/** Whether any narrowing filter is active (sorting and paging do not count). */
export function hasActiveLeadFilters(filters: LeadListFilters): boolean {
  return (
    filters.search !== "" ||
    filters.category !== "" ||
    filters.status !== "all" ||
    filters.followUp !== "all"
  );
}

/**
 * Escapes LIKE metacharacters so a business name containing `%` or `_` is
 * matched literally. PostgreSQL's default LIKE escape character is a backslash.
 */
export function toIlikePattern(value: string): string {
  const escaped = value
    .trim()
    .replace(/[\\%_]/g, "\\$&");

  return `%${escaped}%`;
}

/**
 * Overture category tokens use underscores (`dental_clinic`) while the UI shows
 * a humanized label (`Dental clinic`). Accept either form, plus hyphens, without
 * treating the resulting underscore as a wildcard.
 */
export function toCategoryIlikePattern(value: string): string {
  return toIlikePattern(value.trim().replace(/[\s-]+/g, "_"));
}
