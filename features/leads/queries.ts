import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import {
  mapLeadRow,
  type LeadListItem,
} from "./lead-list";

/**
 * Fields needed by the read-only My Leads list. The embedded business is a
 * many-to-one join through `leads.business_id`.
 */
const LEAD_LIST_SELECT = `
  id,
  created_at,
  status,
  last_contacted_at,
  next_follow_up_date,
  businesses!leads_business_id_fkey (
    name,
    phone,
    email,
    website,
    address,
    city
  )
`;

export type MyLeadsResult =
  | { ok: true; leads: LeadListItem[] }
  | { ok: false; message: string };

/**
 * Returns the signed-in user's leads, newest first.
 *
 * The explicit `user_id` filter and the authenticated Supabase client provide
 * request-level scoping; RLS remains the database-level protection. A query
 * failure is returned as an error result instead of being rendered as an empty
 * list, so the page never implies the user has no leads when the read failed.
 */
export async function getMyLeads(): Promise<MyLeadsResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, message: "Sign in to view your leads." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_LIST_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getMyLeads: failed to read leads", error);
    return { ok: false, message: "Could not load your leads. Please try again." };
  }

  const rows = data ?? [];
  const leads = rows
    .map((row) => mapLeadRow(row))
    .filter((lead): lead is LeadListItem => lead !== null);

  return { ok: true, leads };
}
