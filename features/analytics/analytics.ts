import {
  formatLeadCategory,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "../leads/lead-list.ts";
import { buildBulkStatusActivityBody } from "../leads/bulk.ts";

export type AnalyticsPeriod = 7 | 30 | 90;

export type AnalyticsRange = {
  period: AnalyticsPeriod;
  startDate: string;
  endDate: string;
  endExclusive: string;
};

export type AnalyticsLeadRow = {
  status: LeadStatus;
  nextFollowUpDate: string | null;
  category: string | null;
};

export type SavedLeadEvent = {
  createdAt: string;
};

export type AnalyticsActivityEvent = {
  leadId: string;
  kind: "status_change" | "follow_up_completed";
  body: string | null;
  createdAt: string;
};

export type AnalyticsMetricSummary = {
  savedLeads: number;
  contactedLeads: number;
  interestedLeads: number;
  followUpsDue: number;
};

export type StatusDistributionPoint = {
  status: LeadStatus;
  label: string;
  count: number;
  percentage: number;
  color: string;
};

export type LeadsByNichePoint = {
  category: string;
  label: string;
  count: number;
};

export type LeadsOverTimePoint = {
  bucket: string;
  label: string;
  saved: number;
  contacted: number;
};

export type OutreachActivityPoint = {
  bucket: string;
  label: string;
  contacted: number;
  interested: number;
  followUpsCompleted: number;
  total: number;
};

export type CompleteWeeksRange = {
  startDate: string;
  endExclusive: string;
  weeks: Array<{ bucket: string; label: string }>;
};

export type CurrentAnalytics = {
  metrics: AnalyticsMetricSummary;
  statuses: StatusDistributionPoint[];
  niches: LeadsByNichePoint[];
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "#8b7cff",
  to_contact: "#60a5fa",
  contacted: "#22c5c7",
  interested: "#34d399",
  not_interested: "#94a3b8",
  follow_up: "#fbbf24",
};

const DAY_MS = 86_400_000;
const STATUS_ORDER = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];

export function parseAnalyticsPeriod(value: string | string[] | undefined): AnalyticsPeriod {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "7" || candidate === "90") return Number(candidate) as AnalyticsPeriod;
  return 30;
}

export function getAnalyticsRange(
  period: AnalyticsPeriod,
  now: Date = new Date(),
): AnalyticsRange {
  const endDate = now.toISOString().slice(0, 10);
  const startDate = shiftDate(endDate, -(period - 1));

  return {
    period,
    startDate,
    endDate,
    endExclusive: shiftDate(endDate, 1),
  };
}

export function getLastCompleteWeeks(
  today: string,
  count = 8,
): CompleteWeeksRange {
  const currentWeekStart = mondayOf(today);
  const startDate = shiftDate(currentWeekStart, -(count * 7));
  const weeks: CompleteWeeksRange["weeks"] = [];

  for (let index = 0; index < count; index += 1) {
    const bucket = shiftDate(startDate, index * 7);
    weeks.push({ bucket, label: `Week of ${shortDate(bucket)}` });
  }

  return { startDate, endExclusive: currentWeekStart, weeks };
}

/** Current-state metrics and breakdowns across every lead owned by the user. */
export function buildCurrentAnalytics(
  rows: readonly AnalyticsLeadRow[],
  today: string,
): CurrentAnalytics {
  const statusCounts = new Map<LeadStatus, number>(
    STATUS_ORDER.map((status) => [status, 0]),
  );
  const nicheCounts = new Map<string, { label: string; count: number }>();
  let followUpsDue = 0;

  for (const row of rows) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
    if (row.nextFollowUpDate && row.nextFollowUpDate <= today) followUpsDue += 1;

    const category = cleanCategory(row.category);
    const categoryKey = category?.toLowerCase() ?? "__no_category__";
    const current = nicheCounts.get(categoryKey);
    nicheCounts.set(categoryKey, {
      label: category ? formatLeadCategory(category) ?? category : "No category",
      count: (current?.count ?? 0) + 1,
    });
  }

  const savedLeads = rows.length;
  const statuses = STATUS_ORDER.map((status) => {
    const count = statusCounts.get(status) ?? 0;
    return {
      status,
      label: LEAD_STATUS_LABELS[status],
      count,
      percentage: savedLeads === 0 ? 0 : Math.round((count / savedLeads) * 1000) / 10,
      color: STATUS_COLORS[status],
    };
  });

  const niches = [...nicheCounts.entries()]
    .map(([category, value]) => ({ category, ...value }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 10);

  return {
    metrics: {
      savedLeads,
      contactedLeads: statusCounts.get("contacted") ?? 0,
      interestedLeads: statusCounts.get("interested") ?? 0,
      followUpsDue,
    },
    statuses,
    niches,
  };
}

/**
 * Saved points use lead creation timestamps. Contacted points use distinct
 * leads with a recorded transition to the Contacted status in each interval.
 */
export function buildLeadsOverTime(
  savedEvents: readonly SavedLeadEvent[],
  activityEvents: readonly AnalyticsActivityEvent[],
  range: AnalyticsRange,
): LeadsOverTimePoint[] {
  const weekly = range.period === 90;
  const bucketStarts = getRangeBuckets(range, weekly);
  const points = new Map<string, LeadsOverTimePoint>(
    bucketStarts.map((bucket) => [
      bucket,
      { bucket, label: weekly ? weekLabel(bucket, range) : shortDate(bucket), saved: 0, contacted: 0 },
    ]),
  );

  for (const event of savedEvents) {
    const date = timestampDate(event.createdAt);
    if (!isInRange(date, range)) continue;
    const bucket = weekly ? mondayOf(date) : date;
    const point = points.get(bucket);
    if (point) point.saved += 1;
  }

  const contactedLeadsByBucket = new Map<string, Set<string>>();
  const contactedBody = buildBulkStatusActivityBody("contacted");

  for (const event of activityEvents) {
    if (event.kind !== "status_change" || event.body !== contactedBody) continue;
    const date = timestampDate(event.createdAt);
    if (!isInRange(date, range)) continue;
    const bucket = weekly ? mondayOf(date) : date;
    if (!points.has(bucket)) continue;

    const leadIds = contactedLeadsByBucket.get(bucket) ?? new Set<string>();
    leadIds.add(event.leadId);
    contactedLeadsByBucket.set(bucket, leadIds);
  }

  for (const [bucket, leadIds] of contactedLeadsByBucket) {
    const point = points.get(bucket);
    if (point) point.contacted = leadIds.size;
  }

  return [...points.values()];
}

/** Counts activity rows, not unique leads, across the last 8 complete UTC weeks. */
export function buildOutreachActivity(
  events: readonly AnalyticsActivityEvent[],
  range: CompleteWeeksRange,
): OutreachActivityPoint[] {
  const points = new Map<string, OutreachActivityPoint>(
    range.weeks.map(({ bucket, label }) => [
      bucket,
      { bucket, label, contacted: 0, interested: 0, followUpsCompleted: 0, total: 0 },
    ]),
  );
  const contactedBody = buildBulkStatusActivityBody("contacted");
  const interestedBody = buildBulkStatusActivityBody("interested");

  for (const event of events) {
    const date = timestampDate(event.createdAt);
    if (date < range.startDate || date >= range.endExclusive) continue;

    const point = points.get(mondayOf(date));
    if (!point) continue;

    if (event.kind === "follow_up_completed") {
      point.followUpsCompleted += 1;
    } else if (
      event.kind === "status_change" &&
      event.body === contactedBody
    ) {
      point.contacted += 1;
    } else if (
      event.kind === "status_change" &&
      event.body === interestedBody
    ) {
      point.interested += 1;
    }
  }

  for (const point of points.values()) {
    point.total = point.contacted + point.interested + point.followUpsCompleted;
  }

  return [...points.values()];
}

function getRangeBuckets(range: AnalyticsRange, weekly: boolean): string[] {
  const buckets: string[] = [];
  let bucket = weekly ? mondayOf(range.startDate) : range.startDate;
  const end = weekly ? mondayOf(range.endDate) : range.endDate;

  while (bucket <= end) {
    buckets.push(bucket);
    bucket = shiftDate(bucket, weekly ? 7 : 1);
  }

  return buckets;
}

function weekLabel(bucket: string, range: AnalyticsRange): string {
  const weekEnd = shiftDate(bucket, 6);
  const visibleStart = bucket < range.startDate ? range.startDate : bucket;
  const visibleEnd = weekEnd > range.endDate ? range.endDate : weekEnd;
  return `${shortDate(visibleStart)}–${shortDate(visibleEnd)}`;
}

function isInRange(date: string, range: AnalyticsRange): boolean {
  return date !== "" && date >= range.startDate && date < range.endExclusive;
}

function timestampDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function cleanCategory(value: string | null): string | null {
  if (typeof value !== "string") return null;
  const category = value.trim().replace(/\s+/g, " ");
  return category === "" ? null : category;
}

function shortDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function mondayOf(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  return shiftDate(value, -offset);
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}
