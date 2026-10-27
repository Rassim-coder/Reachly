import {
  formatLeadCategory,
  formatLeadDate,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "../leads/lead-list.ts";

/**
 * Pure analytics helpers for the Analytics page.
 *
 * The selected date range applies only to the **Leads Over Time** chart. The
 * KPI cards below it are current-state metrics, not date-filtered event sums.
 * Contacted-over-time is not derived from `leads.status`; no reliable contact
 * event source exists yet.
 */

export type AnalyticsLeadRow = {
  createdAt: string;
  status: LeadStatus;
  nextFollowUpDate: string | null;
  /** Kept as the raw source value so identical raw labels group together. */
  category: string | null;
};

export type AnalyticsChartPoint = {
  bucket: string;
  label: string;
  saved: number;
};

export type AnalyticsPipelinePoint = {
  status: LeadStatus;
  label: string;
  count: number;
};

export type AnalyticsNichePoint = {
  category: string;
  label: string;
  count: number;
};

export type AnalyticsSnapshot = {
  savedLeads: number;
  contactedLeads: number;
  interestedLeads: number;
  followUpsDue: number;
  pipeline: AnalyticsPipelinePoint[];
  overTime: AnalyticsChartPoint[];
  niches: AnalyticsNichePoint[];
};

export type AnalyticsRange = {
  from: string;
  to: string;
  toExclusive: string;
};

export type AnalyticsSearchParams = {
  from?: string;
  to?: string;
};

const isoDatePrefix = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: unknown): value is string {
  if (!isoDatePrefix.test(value as string)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime());
}

function shiftIsoDate(value: string, dayOffset: number): string {
  const [year, month, day] = value
    .split("-")
    .map((part) => Number.parseInt(part, 10));
  const shifted = new Date(Date.UTC(year, month - 1, day + dayOffset));
  return shifted.toISOString().slice(0, 10);
}

/**
 * Parses the URL date range. Invalid or partial input falls back to the last
 * 30 days; a reversed range is rejected rather than silently swapped.
 */
export function parseAnalyticsRange(
  input: AnalyticsSearchParams,
  today = new Date().toISOString().slice(0, 10),
): AnalyticsRange | null {
  const fromInput = input.from ?? "";
  const toInput = input.to ?? "";

  if (fromInput !== "" && toInput !== "") {
    if (!isIsoDate(fromInput) || !isIsoDate(toInput) || fromInput > toInput) {
      return null;
    }

    return { from: fromInput, to: toInput, toExclusive: shiftIsoDate(toInput, 1) };
  }

  if (fromInput !== "") {
    if (!isIsoDate(fromInput)) {
      return defaultRange(today);
    }

    return {
      from: fromInput,
      to: today,
      toExclusive: shiftIsoDate(today, 1),
    };
  }

  if (toInput !== "") {
    if (!isIsoDate(toInput)) {
      return defaultRange(today);
    }

    return {
      from: shiftIsoDate(toInput, -29),
      to: toInput,
      toExclusive: shiftIsoDate(toInput, 1),
    };
  }

  return defaultRange(today);
}

function defaultRange(today: string): AnalyticsRange {
  return {
    from: shiftIsoDate(today, -29),
    to: today,
    toExclusive: shiftIsoDate(today, 1),
  };
}

function timestampToIsoDate(value: string): string | null {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return null;
  return timestamp.toISOString().slice(0, 10);
}

function timestampToIsoMonth(value: string): string | null {
  const isoDate = timestampToIsoDate(value);
  return isoDate?.slice(0, 7) ?? null;
}

function monthLabel(month: string): string | null {
  const date = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Counts new saved leads per bucket. Saved events come from `leads.created_at`.
 */
export function buildSavedOverTime(
  rows: readonly AnalyticsLeadRow[],
  range: AnalyticsRange,
): AnalyticsChartPoint[] {
  const dayCount =
    (new Date(`${range.to}T00:00:00Z`).getTime() -
      new Date(`${range.from}T00:00:00Z`).getTime()) /
    86400000 + 1;
  const bucketMode = dayCount <= 31 ? "day" : "month";

  const buckets = new Map<string, AnalyticsChartPoint>();

  for (const row of rows) {
    const isoDate = timestampToIsoDate(row.createdAt);

    if (!isoDate || isoDate < range.from || isoDate >= range.toExclusive) continue;

    const bucket =
      bucketMode === "month" ? (timestampToIsoMonth(row.createdAt) ?? "") : isoDate;
    const key = bucket;
    const label =
      bucketMode === "month" ? (monthLabel(key) ?? key) : labelForDay(key);

    const existing = buckets.get(key);
    if (existing) {
      existing.saved += 1;
      continue;
    }

    buckets.set(key, { bucket: key, label, saved: 1 });
  }

  return [...buckets.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));
}

function labelForDay(value: string): string {
  return formatLeadDate(value) ?? value;
}

/**
 * Stable, enum-ordered pipeline counts for the user's saved leads.
 */
export function buildPipelineBreakdown(
  rows: readonly AnalyticsLeadRow[],
): AnalyticsPipelinePoint[] {
  const counts = new Map<LeadStatus, number>();

  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }

  return (Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((status) => ({
    status,
    label: LEAD_STATUS_LABELS[status],
    count: counts.get(status) ?? 0,
  }));
}

/**
 * Groups the user's saved leads by their business category. Unlabelled
 * categories have their own bucket rather than an invented label.
 */
export function buildLeadsByNiche(rows: readonly AnalyticsLeadRow[]): AnalyticsNichePoint[] {
  const counts = new Map<string, { category: string | null; count: number }>();

  for (const row of rows) {
    const categoryKey = row.category ?? "__no_category__";
    const existing = counts.get(categoryKey);
    const currentCount = existing?.count ?? 0;
    counts.set(categoryKey, { category: row.category, count: currentCount + 1 });
  }

  return [...counts.entries()]
    .map(([categoryKey, value]) => {
      const category = value.category;
      const label = category !== null ? (formatLeadCategory(category) ?? "Other") : "No category";
      return { category: categoryKey, label, count: value.count };
    })
    .sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label),
    );
}

/**
 * Combines current-state counts and bucketed saved-lead history.
 * `contactedLeads` is deliberately a current status count, not a contact-event count.
 */
export function buildAnalyticsSnapshot(
  rows: readonly AnalyticsLeadRow[],
  savedLeads: number,
  interestedLeads: number,
  followUpsDue: number,
  range: AnalyticsRange,
): AnalyticsSnapshot {
  const pipeline = buildPipelineBreakdown(rows);
  const contactedLeads = pipeline.find((point) => point.status === "contacted")?.count ?? 0;

  return {
    savedLeads,
    contactedLeads,
    interestedLeads,
    followUpsDue,
    pipeline,
    overTime: buildSavedOverTime(rows, range),
    niches: buildLeadsByNiche(rows),
  };
}
