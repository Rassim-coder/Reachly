"use server";

import { getLeadDetails, getMyLeadsPage } from "./queries";

/**
 * Read-only server actions used by the My Leads workspace. They keep Supabase
 * access on the server while allowing filters and drawer selection to update
 * without leaving the page.
 */
export async function loadMyLeads(filters: unknown) {
  return getMyLeadsPage(filters);
}

export async function loadLeadDetails(leadId: string) {
  return getLeadDetails(leadId);
}
