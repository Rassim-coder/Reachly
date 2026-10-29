import { leadListSelect } from "@/features/leads/queries";
import {
  mapLeadRow,
  type LeadListItem,
  type LeadListRow,
} from "@/features/leads/lead-list";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import type { ListInfo, ListSummary } from "./types";
import { isValidListId } from "./validation";

/** Upper bound of leads loaded into one list page. */
const LIST_LEADS_LIMIT = 200;

// Typed as `string` on purpose, like `leadListSelect`, so the embedded count
// is not parsed against the generated relationship types.
const LIST_SUMMARY_SELECT: string = `
  id,
  name,
  created_at,
  list_leads!list_items_owner_fk(count)
`;

type ListSummaryRow = {
  id: string;
  name: string;
  created_at: string;
  list_leads: { count: number }[] | null;
};

export type MyListsResult =
  | { ok: true; lists: ListSummary[] }
  | { ok: false; message: string };

export async function getMyLists(): Promise<MyListsResult> {
  const user = await getCurrentUser();

  if (!user) return { ok: false, message: "Sign in to view your lists." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lists")
    .select(LIST_SUMMARY_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getMyLists: failed to read lists", error);
    return {
      ok: false,
      message: "Could not load your lists. Please try again.",
    };
  }

  const rows = (data ?? []) as unknown as ListSummaryRow[];

  return {
    ok: true,
    lists: rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      leadCount: row.list_leads?.[0]?.count ?? 0,
    })),
  };
}

export type ListDetailResult =
  | { ok: true; list: ListInfo; leads: LeadListItem[] }
  | { ok: false; reason: "not_found" | "error"; message: string };

/**
 * Returns one list owned by the signed-in user with its leads, mapped with the
 * same helper as My Leads so the table and drawer can be reused unchanged.
 */
export async function getListWithLeads(
  listId: string,
): Promise<ListDetailResult> {
  if (!isValidListId(listId)) {
    return { ok: false, reason: "not_found", message: "List not found." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, reason: "error", message: "Sign in to view this list." };
  }

  const supabase = await createClient();

  const { data: list, error: listError } = await supabase
    .from("lists")
    .select("id, name, created_at")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (listError) {
    console.error("getListWithLeads: list read failed", listError);
    return {
      ok: false,
      reason: "error",
      message: "Could not load this list. Please try again.",
    };
  }

  if (!list) {
    return { ok: false, reason: "not_found", message: "List not found." };
  }

  const info: ListInfo = {
    id: list.id,
    name: list.name,
    createdAt: list.created_at,
  };

  const { data: memberships, error: membershipError } = await supabase
    .from("list_leads")
    .select("lead_id")
    .eq("list_id", listId)
    .eq("user_id", user.id)
    .order("added_at", { ascending: false })
    .limit(LIST_LEADS_LIMIT);

  if (membershipError) {
    console.error("getListWithLeads: membership read failed", membershipError);
    return {
      ok: false,
      reason: "error",
      message: "Could not load this list's leads. Please try again.",
    };
  }

  const leadIds = (memberships ?? []).map((row) => row.lead_id);

  if (leadIds.length === 0) return { ok: true, list: info, leads: [] };

  const { data: leadRows, error: leadsError } = await supabase
    .from("leads")
    .select(leadListSelect(false))
    .in("id", leadIds)
    .eq("user_id", user.id);

  if (leadsError) {
    console.error("getListWithLeads: lead read failed", leadsError);
    return {
      ok: false,
      reason: "error",
      message: "Could not load this list's leads. Please try again.",
    };
  }

  const order = new Map(leadIds.map((id, index) => [id.toLowerCase(), index]));
  const leads = ((leadRows ?? []) as unknown as LeadListRow[])
    .map((row) => mapLeadRow(row))
    .filter((lead): lead is LeadListItem => lead !== null)
    .sort(
      (a, b) =>
        (order.get(a.id.toLowerCase()) ?? 0) -
        (order.get(b.id.toLowerCase()) ?? 0),
    );

  return { ok: true, list: info, leads };
}