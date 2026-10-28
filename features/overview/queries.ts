import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

import { formatLeadLocation } from "../leads/lead-list";
import {
  buildOverviewData,
  getOverviewMonthRange,
  withFollowUpNotesWarning,
  type OverviewContactEvent,
  type OverviewData,
  type OverviewLeadRecord,
  type OverviewNote,
} from "./overview";

const PAGE_SIZE = 1000;

type OverviewLeadQueryRow = {
  id: string;
  created_at: string;
  status: Database["public"]["Enums"]["lead_status"];
  next_follow_up_date: string | null;
  businesses:
    | {
        name: string;
        category: string | null;
        address: string | null;
        city: string | null;
      }
    | {
        name: string;
        category: string | null;
        address: string | null;
        city: string | null;
      }[]
    | null;
};

type OverviewActivityQueryRow = {
  id: string;
  lead_id: string;
  kind: "status_change";
  body: string | null;
  created_at: string;
};

type OverviewNoteQueryRow = {
  id: string;
  lead_id: string;
  body: string | null;
  created_at: string;
};

type PageRows<T> = { rows: T[]; error: string | null };

export type OverviewDataResult =
  | { ok: true; data: OverviewData }
  | { ok: false; message: string };

/** Loads the signed-in user's compact Overview data and aggregates it server-side. */
export async function getOverviewDashboardData(): Promise<OverviewDataResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in to view your Overview." };

  const now = new Date();
  const monthRange = getOverviewMonthRange(now);
  const supabase = await createClient();

  const [leadResult, contactResult] = await Promise.all([
    readPages<OverviewLeadQueryRow>(async (from, to) => {
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, created_at, status, next_follow_up_date, businesses!leads_business_id_fkey(name, category, address, city)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to);

      return {
        rows: (data ?? []) as unknown as OverviewLeadQueryRow[],
        error: error?.message ?? null,
      };
    }),
    readPages<OverviewActivityQueryRow>(async (from, to) => {
      const { data, error } = await supabase
        .from("lead_activities")
        .select("id, lead_id, kind, body, created_at")
        .eq("user_id", user.id)
        .eq("kind", "status_change")
        .gte("created_at", `${monthRange.startDate}T00:00:00.000Z`)
        .lt("created_at", `${monthRange.endExclusive}T00:00:00.000Z`)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);

      return {
        rows: (data ?? []) as unknown as OverviewActivityQueryRow[],
        error: error?.message ?? null,
      };
    }),
  ]);

  if (leadResult.error) {
    console.error("getOverviewDashboardData: failed to read owned leads");
    return {
      ok: false,
      message: "Could not load the Overview. Please try again.",
    };
  }

  if (contactResult.error) {
    console.error("getOverviewDashboardData: failed to read contact history");
  }

  const leads: OverviewLeadRecord[] = leadResult.rows.map((row) => {
    const business = Array.isArray(row.businesses)
      ? row.businesses[0]
      : row.businesses;
    return {
      id: row.id,
      createdAt: row.created_at,
      status: row.status,
      nextFollowUpDate: row.next_follow_up_date,
      businessName: business?.name.trim() || null,
      category: business?.category ?? null,
      location: business
        ? formatLeadLocation(business.address, business.city)
        : null,
    };
  });
  const contactEvents: OverviewContactEvent[] | null = contactResult.error
    ? null
    : contactResult.rows.map((row) => ({
        leadId: row.lead_id,
        kind: row.kind,
        body: row.body,
        createdAt: row.created_at,
      }));

  const withoutNotes = buildOverviewData(leads, contactEvents, [], now);
  const followUpIds = withoutNotes.followUps.map((followUp) => followUp.id);
  const noteResult = await readLatestNotes(supabase, user.id, followUpIds);
  const notesByLeadId = new Map<string, OverviewNote>();
  for (const note of noteResult.rows) {
    if (!notesByLeadId.has(note.lead_id)) {
      notesByLeadId.set(note.lead_id, {
        leadId: note.lead_id,
        body: note.body,
        createdAt: note.created_at,
      });
    }
  }

  return {
    ok: true,
    data: withFollowUpNotesWarning(
      buildOverviewData(leads, contactEvents, [...notesByLeadId.values()], now),
      noteResult.error
        ? "Follow-up notes could not be loaded. The due dates are still current."
        : null,
    ),
  };
}

async function readLatestNotes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  leadIds: string[],
): Promise<PageRows<OverviewNoteQueryRow>> {
  if (leadIds.length === 0) return { rows: [], error: null };

  const rows: OverviewNoteQueryRow[] = [];
  const leadIdsWithNotes = new Set<string>();

  try {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("lead_activities")
        .select("id, lead_id, body, created_at")
        .eq("user_id", userId)
        .eq("kind", "note")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error("getOverviewDashboardData: failed to read follow-up notes", error);
        return { rows, error: error.message };
      }

      const page = (data ?? []) as unknown as OverviewNoteQueryRow[];
      rows.push(...page);
      for (const note of page) leadIdsWithNotes.add(note.lead_id);

      if (page.length < PAGE_SIZE || leadIdsWithNotes.size === leadIds.length) break;
    }

    return { rows, error: null };
  } catch (error) {
    console.error("getOverviewDashboardData: follow-up note query threw", error);
    return { rows, error: "Overview note query failed." };
  }
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
  } catch (error) {
    console.error("getOverviewDashboardData: query threw", error);
    return { rows: [], error: "Overview query failed." };
  }
}
