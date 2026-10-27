import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { getLeadStats } from "@/features/overview/queries";

import {
  buildAnalyticsSnapshot,
  type AnalyticsLeadRow,
  type AnalyticsRange,
  type AnalyticsSnapshot,
} from "./analytics";

type AnalyticsLeadQueryRow = {
  created_at: string;
  status: AnalyticsLeadRow["status"];
  next_follow_up_date: string | null;
  businesses:
    | { category: string | null }
    | { category: string | null }[]
    | null;
};

export type AnalyticsSnapshotResult =
  | { ok: true; snapshot: AnalyticsSnapshot }
  | { ok: false; message: string };

/**
 * Loads one compact, user-scoped lead sample and combines it with the
 * existing `lead_stats` view. All queries stay on the server, and the page
 * itself never receives raw lead rows.
 */
export async function getAnalyticsSnapshot(
  range: AnalyticsRange,
): Promise<AnalyticsSnapshotResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, message: "Sign in to view analytics." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("created_at, status, next_follow_up_date, businesses!leads_business_id_fkey(category)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getAnalyticsSnapshot: failed to read lead rows", error);
    return { ok: false, message: "Could not load analytics. Please try again." };
  }

  const leadStats = await getLeadStats();
  const rows: AnalyticsLeadRow[] = ((data ?? []) as unknown as AnalyticsLeadQueryRow[]).map(
    (row) => {
      const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
      return {
        createdAt: row.created_at,
        status: row.status,
        nextFollowUpDate: row.next_follow_up_date,
        category: business?.category ?? null,
      };
    },
  );

  return {
    ok: true,
    snapshot: buildAnalyticsSnapshot(
      rows,
      leadStats.savedLeads,
      leadStats.interested,
      leadStats.followUpsDue,
      range,
    ),
  };
}
