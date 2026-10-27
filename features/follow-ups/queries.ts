import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import {
  mapLeadRow,
  todayDateString,
  type LeadListItem,
  type LeadListRow,
} from "../leads/lead-list";
import { leadListSelect } from "../leads/queries";
import {
  groupFollowUps,
  type FollowUpItem,
  type FollowUpNote,
  type FollowUpQueue,
} from "./follow-up-queue";

/** One batched read is used for recent notes; the queue stays usable without it. */
const NOTE_SCAN_LIMIT = 1000;

type FollowUpNoteRow = {
  lead_id: string;
  body: string | null;
  created_at: string;
};

export type FollowUpQueueResult =
  | {
      ok: true;
      queue: FollowUpQueue;
      notesWarning: string | null;
    }
  | { ok: false; message: string };

/** Count only this authenticated user's follow-ups due on the current UTC day. */
export async function getFollowUpsDueTodayCount(): Promise<number | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("next_follow_up_date", todayDateString());

  if (error) {
    console.error("getFollowUpsDueTodayCount: failed to read today's follow-ups", error);
    return null;
  }

  return count ?? 0;
}

/**
 * Reads the signed-in user's scheduled follow-ups.
 *
 * The explicit `user_id` filter and the authenticated Supabase client provide
 * request-level scoping; RLS remains the database-level protection. The date
 * grouping is done on the server with the same date-only rules used by My Leads.
 */
export async function getFollowUpQueue(): Promise<FollowUpQueueResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, message: "Sign in to view your follow-ups." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(leadListSelect(true))
    .eq("user_id", user.id)
    .not("next_follow_up_date", "is", null)
    .order("next_follow_up_date", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("getFollowUpQueue: failed to read follow-ups", error);
    return {
      ok: false,
      message: "Could not load your follow-ups. Please try again.",
    };
  }

  const leads = ((data ?? []) as unknown as LeadListRow[])
    .map((row) => mapLeadRow(row))
    .filter((lead): lead is LeadListItem => lead !== null);

  const notesByLeadId = new Map<string, FollowUpNote>();
  let notesWarning: string | null = null;

  if (leads.length > 0) {
    const { data: noteData, error: noteError } = await supabase
      .from("lead_activities")
      .select("lead_id, body, created_at")
      .in(
        "lead_id",
        leads.map((lead) => lead.id),
      )
      .eq("user_id", user.id)
      .eq("kind", "note")
      .order("created_at", { ascending: false })
      .limit(NOTE_SCAN_LIMIT);

    if (noteError) {
      console.error("getFollowUpQueue: failed to read latest notes", noteError);
      notesWarning =
        "Latest notes could not be loaded. Open a lead to read its full activity history.";
    } else {
      for (const row of (noteData ?? []) as unknown as FollowUpNoteRow[]) {
        const body = typeof row.body === "string" ? row.body.trim() : "";
        if (body === "" || notesByLeadId.has(row.lead_id)) continue;

        notesByLeadId.set(row.lead_id, {
          body,
          createdAt: row.created_at,
        });
      }
    }
  }

  const items: FollowUpItem[] = leads.map((lead) => ({
    ...lead,
    latestNote: notesByLeadId.get(lead.id) ?? null,
  }));

  return {
    ok: true,
    queue: groupFollowUps(items),
    notesWarning,
  };
}
