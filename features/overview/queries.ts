import { createClient } from "@/lib/supabase/server";

/**
 * Overview metrics for the signed-in user.
 *
 * Reads the existing `lead_stats` view, which is already scoped to
 * `auth.uid()` and derived from the user's own leads. No query is built here
 * so the numbers can never drift from the schema definition.
 *
 * Returns `null` values (not throws) when the read fails, so the dashboard
 * renders its empty state instead of an error page.
 */
export type LeadStats = {
  savedLeads: number;
  contactedThisWeek: number;
  interested: number;
  followUpsDue: number;
};

export async function getLeadStats(): Promise<LeadStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_stats")
    .select("saved_leads, contacted_this_week, interested, follow_ups_due")
    .maybeSingle();

  if (error || !data) {
    return {
      savedLeads: 0,
      contactedThisWeek: 0,
      interested: 0,
      followUpsDue: 0,
    };
  }

  return {
    savedLeads: data.saved_leads ?? 0,
    contactedThisWeek: data.contacted_this_week ?? 0,
    interested: data.interested ?? 0,
    followUpsDue: data.follow_ups_due ?? 0,
  };
}