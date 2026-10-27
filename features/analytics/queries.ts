import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import {
  buildCurrentAnalytics,
  buildLeadsOverTime,
  buildOutreachActivity,
  getAnalyticsRange,
  type AnalyticsActivityEvent,
  type AnalyticsLeadRow,
  type AnalyticsRange,
  type AnalyticsPeriod,
  type LeadsOverTimePoint,
  type OutreachActivityPoint,
  type CurrentAnalytics,
} from "./analytics";

const PAGE_SIZE = 1000;

type CurrentLeadQueryRow = {
  id: string;
  created_at: string;
  status: AnalyticsLeadRow["status"];
  next_follow_up_date: string | null;
  businesses:
    | { category: string | null }
    | { category: string | null }[]
    | null;
};

type SavedLeadQueryRow = { created_at: string; id: string };

type ActivityQueryRow = {
  lead_id: string;
  kind: AnalyticsActivityEvent["kind"];
  body: string | null;
  created_at: string;
  id: string;
};

type PageRows<T> = { rows: T[]; error: string | null };

export type AnalyticsDashboardData = {
  period: AnalyticsPeriod;
  range: AnalyticsRange;
  current: CurrentAnalytics | null;
  currentError: string | null;
  leadsOverTime: LeadsOverTimePoint[] | null;
  leadsOverTimeError: string | null;
  outreachActivity: OutreachActivityPoint[] | null;
  outreachError: string | null;
};

export type AnalyticsDataResult =
  | { ok: true; data: AnalyticsDashboardData }
  | { ok: false; message: string };

/**
 * Reads authenticated, owner-scoped analytics data and aggregates it on the
 * server. Only compact aggregates are returned to the client chart components.
 */
export async function getAnalyticsDashboardData(
  period: AnalyticsPeriod,
): Promise<AnalyticsDataResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, message: "Sign in to view analytics." };
  }

  const range = getAnalyticsRange(period);
  const supabase = await createClient();

  const [currentResult, savedResult, activityResult] = await Promise.all([
    readPages<CurrentLeadQueryRow>(async (from, to) => {
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, created_at, status, next_follow_up_date, businesses!leads_business_id_fkey(category)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);

      return {
        rows: (data ?? []) as unknown as CurrentLeadQueryRow[],
        error: error?.message ?? null,
      };
    }),
    readPages<SavedLeadQueryRow>(async (from, to) => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, created_at")
        .eq("user_id", user.id)
        .gte("created_at", `${range.startDate}T00:00:00.000Z`)
        .lt("created_at", `${range.endExclusive}T00:00:00.000Z`)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);

      return {
        rows: (data ?? []) as unknown as SavedLeadQueryRow[],
        error: error?.message ?? null,
      };
    }),
    readPages<ActivityQueryRow>(async (from, to) => {
      const { data, error } = await supabase
        .from("lead_activities")
        .select("id, lead_id, kind, body, created_at")
        .eq("user_id", user.id)
        .in("kind", ["status_change", "follow_up_completed"])
        .gte("created_at", `${range.startDate}T00:00:00.000Z`)
        .lt("created_at", `${range.endExclusive}T00:00:00.000Z`)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);

      return {
        rows: (data ?? []) as unknown as ActivityQueryRow[],
        error: error?.message ?? null,
      };
    }),
  ]);

  if (currentResult.error) {
    console.error("getAnalyticsDashboardData: failed to read current leads");
  }
  if (savedResult.error) {
    console.error("getAnalyticsDashboardData: failed to read saved-lead history");
  }
  if (activityResult.error) {
    console.error("getAnalyticsDashboardData: failed to read activity history");
  }

  const currentRows = currentResult.error
    ? null
    : currentResult.rows.map((row): AnalyticsLeadRow => {
        const business = Array.isArray(row.businesses)
          ? row.businesses[0]
          : row.businesses;
        return {
          status: row.status,
          nextFollowUpDate: row.next_follow_up_date,
          category: business?.category ?? null,
        };
      });

  const activityRows: AnalyticsActivityEvent[] = activityResult.error
    ? []
    : activityResult.rows.map((row) => ({
        leadId: row.lead_id,
        kind: row.kind,
        body: row.body,
        createdAt: row.created_at,
      }));

  return {
    ok: true,
    data: {
      period,
      range,
      current:
        currentRows === null
          ? null
          : buildCurrentAnalytics(currentRows, range.endDate),
      currentError: currentResult.error
        ? "Current lead metrics could not be loaded. Please try again."
        : null,
      leadsOverTime:
        savedResult.error || activityResult.error
          ? null
          : buildLeadsOverTime(
              savedResult.rows.map((row) => ({ createdAt: row.created_at })),
              activityRows,
              range,
            ),
      leadsOverTimeError:
        savedResult.error || activityResult.error
          ? "Lead trend data could not be loaded. Please try again."
          : null,
      outreachActivity: activityResult.error
        ? null
        : buildOutreachActivity(activityRows, range),
      outreachError: activityResult.error
        ? "Outreach activity could not be loaded. Please try again."
        : null,
    },
  };
}

async function readPages<T>(
  loadPage: (from: number, to: number) => Promise<{
    rows: T[];
    error: string | null;
  }>,
): Promise<PageRows<T>> {
  const rows: T[] = [];

  try {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const page = await loadPage(offset, offset + PAGE_SIZE - 1);
      if (page.error) return { rows: [], error: page.error };

      rows.push(...page.rows);
      if (page.rows.length < PAGE_SIZE) break;
    }

    return { rows, error: null };
  } catch {
    return { rows: [], error: "Analytics query failed." };
  }
}
