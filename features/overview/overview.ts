import {
  formatLeadCategory,
  formatLeadDate,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "../leads/lead-list.ts";
import { buildBulkStatusActivityBody } from "../leads/bulk.ts";

const DAY_MS = 86_400_000;
const STATUS_ORDER = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "#38bdf8",
  to_contact: "#fbbf24",
  contacted: "#60a5fa",
  interested: "#34d399",
  not_interested: "#f87171",
  follow_up: "#8b7cff",
};

export type OverviewLeadRecord = {
  id: string;
  createdAt: string;
  status: LeadStatus;
  nextFollowUpDate: string | null;
  businessName: string | null;
  category: string | null;
  location: string | null;
};

export type OverviewContactEvent = {
  leadId: string;
  kind: "status_change";
  body: string | null;
  createdAt: string;
};

export type OverviewNote = {
  leadId: string;
  body: string | null;
  createdAt: string;
};

export type OverviewMonthRange = {
  startDate: string;
  endExclusive: string;
  months: Array<{ bucket: string; label: string }>;
};

export type OverviewMonthlyPoint = {
  bucket: string;
  label: string;
  saved: number;
  contacted: number;
};

export type OverviewMetricStats = {
  savedLeads: number;
  contactedLast7Days: number | null;
  replies: null;
  followUpsDue: number;
};

export type OverviewPipelineItem = {
  status: LeadStatus;
  label: string;
  count: number;
  percentage: number;
  color: string;
};

export type OverviewNicheItem = {
  category: string;
  label: string;
  count: number;
  percentage: number;
};

export type OverviewRecentLead = {
  id: string;
  createdAt: string;
  businessName: string;
  category: string | null;
  location: string | null;
  status: LeadStatus;
  relativeCreatedAt: string;
};

export type OverviewFollowUp = {
  id: string;
  businessName: string;
  category: string | null;
  location: string | null;
  dueDate: string;
  dueLabel: string;
  dueDateLabel: string;
  latestNote: string | null;
};

export type OverviewData = {
  stats: OverviewMetricStats;
  monthlyTrends: OverviewMonthlyPoint[];
  pipeline: OverviewPipelineItem[];
  niches: OverviewNicheItem[];
  recentLeads: OverviewRecentLead[];
  followUps: OverviewFollowUp[];
  contactedHistoryError: string | null;
  followUpNotesWarning: string | null;
};

/** Six calendar months through the current UTC month, including the partial current month. */
export function getOverviewMonthRange(now: Date): OverviewMonthRange {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const firstMonth = new Date(Date.UTC(year, month - 5, 1));
  const startDate = firstMonth.toISOString().slice(0, 10);
  const endExclusive = new Date(Date.UTC(year, month + 1, 1))
    .toISOString()
    .slice(0, 10);
  const months: OverviewMonthRange["months"] = [];

  for (let offset = 0; offset < 6; offset += 1) {
    const date = new Date(Date.UTC(year, month - 5 + offset, 1));
    months.push({
      bucket: date.toISOString().slice(0, 7),
      label: new Intl.DateTimeFormat("en-GB", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }).format(date),
    });
  }

  return { startDate, endExclusive, months };
}

/** Pure aggregation of the authenticated user's current lead rows and history. */
export function buildOverviewData(
  leads: readonly OverviewLeadRecord[],
  contactEvents: readonly OverviewContactEvent[] | null,
  notes: readonly OverviewNote[],
  now: Date,
): OverviewData {
  const today = now.toISOString().slice(0, 10);
  const monthRange = getOverviewMonthRange(now);
  const statusCounts = new Map<LeadStatus, number>(
    STATUS_ORDER.map((status) => [status, 0]),
  );
  const nicheCounts = new Map<string, { label: string; count: number }>();
  const noteByLeadId = new Map<string, string>();
  const savedByMonth = new Map(monthRange.months.map(({ bucket }) => [bucket, 0]));
  const contactedBody = buildBulkStatusActivityBody("contacted");
  let followUpsDue = 0;

  for (const note of [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const body = typeof note.body === "string" ? note.body.trim() : "";
    if (body !== "" && !noteByLeadId.has(note.leadId)) {
      noteByLeadId.set(note.leadId, body);
    }
  }

  for (const lead of leads) {
    statusCounts.set(lead.status, (statusCounts.get(lead.status) ?? 0) + 1);
    if (lead.nextFollowUpDate && lead.nextFollowUpDate <= today) followUpsDue += 1;

    const category = cleanCategory(lead.category);
    const categoryKey = category?.toLowerCase() ?? "__no_category__";
    const currentNiche = nicheCounts.get(categoryKey);
    nicheCounts.set(categoryKey, {
      label: category ? formatLeadCategory(category) ?? category : "No category",
      count: (currentNiche?.count ?? 0) + 1,
    });

    const savedMonth = timestampMonth(lead.createdAt);
    if (savedMonth && savedByMonth.has(savedMonth)) {
      savedByMonth.set(savedMonth, (savedByMonth.get(savedMonth) ?? 0) + 1);
    }
  }

  const contactedBodyByMonth = new Map<string, Set<string>>();
  const contactedInLast7Days = new Set<string>();
  const contactWindowStart = now.getTime() - 7 * DAY_MS;

  if (contactEvents !== null) {
    for (const event of contactEvents) {
      if (event.kind !== "status_change" || event.body !== contactedBody) continue;

      const timestamp = timestampMillis(event.createdAt);
      if (!Number.isFinite(timestamp)) continue;
      const month = new Date(timestamp).toISOString().slice(0, 7);
      if (savedByMonth.has(month)) {
        const leadIds = contactedBodyByMonth.get(month) ?? new Set<string>();
        leadIds.add(event.leadId);
        contactedBodyByMonth.set(month, leadIds);
      }

      if (timestamp >= contactWindowStart && timestamp <= now.getTime()) {
        contactedInLast7Days.add(event.leadId);
      }
    }
  }

  const totalLeads = leads.length;
  const pipeline = STATUS_ORDER.map((status) => {
    const count = statusCounts.get(status) ?? 0;
    return {
      status,
      label: LEAD_STATUS_LABELS[status],
      count,
      percentage: totalLeads === 0 ? 0 : (count / totalLeads) * 100,
      color: STATUS_COLORS[status],
    };
  });

  const niches = [...nicheCounts.entries()]
    .map(([category, value]) => ({
      category,
      label: value.label,
      count: value.count,
      percentage: totalLeads === 0 ? 0 : (value.count / totalLeads) * 100,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);

  const recentLeads = [...leads]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((lead) => ({
      id: lead.id,
      createdAt: lead.createdAt,
      businessName: lead.businessName ?? "Business details unavailable",
      category: formatLeadCategory(lead.category),
      location: lead.location,
      status: lead.status,
      relativeCreatedAt: formatRelativeTime(lead.createdAt, now),
    }));

  const followUps = [...leads]
    .filter((lead): lead is OverviewLeadRecord & { nextFollowUpDate: string } =>
      lead.nextFollowUpDate !== null,
    )
    .sort(
      (a, b) =>
        a.nextFollowUpDate.localeCompare(b.nextFollowUpDate) ||
        (a.businessName ?? "").localeCompare(b.businessName ?? ""),
    )
    .slice(0, 4)
    .map((lead) => ({
      id: lead.id,
      businessName: lead.businessName ?? "Business details unavailable",
      category: formatLeadCategory(lead.category),
      location: lead.location,
      dueDate: lead.nextFollowUpDate,
      dueLabel: dueDateLabel(lead.nextFollowUpDate, today),
      dueDateLabel: formatLeadDate(lead.nextFollowUpDate) ?? "Date unavailable",
      latestNote: noteByLeadId.get(lead.id) ?? null,
    }));

  const monthlyTrends = monthRange.months.map(({ bucket, label }) => ({
    bucket,
    label,
    saved: savedByMonth.get(bucket) ?? 0,
    contacted: contactedBodyByMonth.get(bucket)?.size ?? 0,
  }));

  return {
    stats: {
      savedLeads: totalLeads,
      contactedLast7Days:
        contactEvents === null ? null : contactedInLast7Days.size,
      replies: null,
      followUpsDue,
    },
    monthlyTrends,
    pipeline,
    niches,
    recentLeads,
    followUps,
    contactedHistoryError:
      contactEvents === null
        ? "Contact history could not be loaded. Saved-lead history is still available."
        : null,
    followUpNotesWarning: null,
  };
}

export function withFollowUpNotesWarning(
  data: OverviewData,
  warning: string | null,
): OverviewData {
  return { ...data, followUpNotesWarning: warning };
}

function dueDateLabel(value: string, today: string): string {
  if (value < today) return "Overdue";
  if (value === today) return "Today";
  if (value === addDays(today, 1)) return "Tomorrow";
  return "Upcoming";
}

function timestampMonth(value: string): string | null {
  const timestamp = timestampMillis(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString().slice(0, 7);
}

function timestampMillis(value: string): number {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function cleanCategory(value: string | null): string | null {
  if (typeof value !== "string") return null;
  const category = value.trim().replace(/\s+/g, " ");
  return category === "" ? null : category;
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function formatRelativeTime(value: string, now: Date): string {
  const timestamp = timestampMillis(value);
  if (!Number.isFinite(timestamp)) return "Date unavailable";

  const seconds = Math.max(0, Math.floor((now.getTime() - timestamp) / 1000));
  if (seconds < 60) return "Just now";

  const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (seconds < 3600) return relative.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86_400) return relative.format(-Math.floor(seconds / 3600), "hour");
  if (seconds < 604_800) return relative.format(-Math.floor(seconds / 86_400), "day");
  if (seconds < 2_592_000) return relative.format(-Math.floor(seconds / 604_800), "week");
  if (seconds < 31_536_000) return relative.format(-Math.floor(seconds / 2_592_000), "month");
  return relative.format(-Math.floor(seconds / 31_536_000), "year");
}
