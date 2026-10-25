import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import {
  isValidLeadId,
  mapLeadDetailRow,
  type LeadActivityRow,
  type LeadDetail,
  type LeadDetailRow,
} from "./lead-detail";
import { mapLeadRow, type LeadListItem } from "./lead-list";

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

const LEAD_DETAIL_SELECT = `
  id,
  created_at,
  status,
  last_contacted_at,
  next_follow_up_date,
  businesses!leads_business_id_fkey (
    name,
    category,
    phone,
    email,
    website,
    address,
    city
  )
`;

const LEAD_ACTIVITY_SELECT = `
  id,
  kind,
  body,
  created_at
`;

export type LeadDetailResult =
  | { ok: true; lead: LeadDetail }
  | { ok: false; reason: "not_found" | "error"; message: string };

/**
 * Returns one lead owned by the signed-in user, with its notes.
 *
 * `id` and `user_id` are both applied even though RLS already scopes the read.
 * A lead that is missing, malformed, or owned by another user is reported as
 * not found rather than leaking its existence.
 */
export async function getLeadDetails(
  leadId: string,
): Promise<LeadDetailResult> {
  if (!isValidLeadId(leadId)) {
    return { ok: false, reason: "not_found", message: "Lead not found." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      reason: "error",
      message: "Sign in to view this lead.",
    };
  }

  const supabase = await createClient();

  const [leadResult, activityResult] = await Promise.all([
    supabase
      .from("leads")
      .select(LEAD_DETAIL_SELECT)
      .eq("id", leadId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("lead_activities")
      .select(LEAD_ACTIVITY_SELECT)
      .eq("lead_id", leadId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (leadResult.error) {
    console.error("getLeadDetails: failed to read lead", leadResult.error);
    return {
      ok: false,
      reason: "error",
      message: "Could not load this lead. Please try again.",
    };
  }

  if (!leadResult.data) {
    return { ok: false, reason: "not_found", message: "Lead not found." };
  }

  if (activityResult.error) {
    console.error(
      "getLeadDetails: failed to read lead activity",
      activityResult.error,
    );
    return {
      ok: false,
      reason: "error",
      message: "Could not load this lead's notes. Please try again.",
    };
  }

  const lead = mapLeadDetailRow(
    leadResult.data as unknown as LeadDetailRow,
    (activityResult.data ?? []) as unknown as LeadActivityRow[],
  );

  if (!lead) {
    return { ok: false, reason: "not_found", message: "Lead not found." };
  }

  return { ok: true, lead };
}
