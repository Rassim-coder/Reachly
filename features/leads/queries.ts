import { getCurrentUser } from "@/lib/auth/session";
import { resolveCategoryAliases } from "@/lib/overture/categories";
import { createClient } from "@/lib/supabase/server";

import {
  LEAD_PAGE_SIZE,
  parseLeadFilters,
  toCategoryIlikePattern,
  toIlikePattern,
  type LeadListFilters,
} from "./lead-filters";
import {
  isValidLeadId,
  mapLeadDetailRow,
  type LeadActivityRow,
  type LeadDetail,
  type LeadDetailRow,
} from "./lead-detail";
import {
  mapLeadRow,
  todayDateString,
  type LeadListItem,
  type LeadListRow,
} from "./lead-list";

/**
 * Fields needed by the My Leads list. The embedded business is a many-to-one
 * join through `leads.business_id`.
 */
function leadListSelect(innerJoin: boolean): string {
  const relation = innerJoin
    ? "businesses!leads_business_id_fkey!inner"
    : "businesses!leads_business_id_fkey";

  return `
    id,
    created_at,
    status,
    last_contacted_at,
    next_follow_up_date,
    ${relation} (
      name,
      category,
      phone,
      email,
      website,
      address,
      city
    )
  `;
}

export type MyLeadsSuccess = {
  ok: true;
  leads: LeadListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  filters: LeadListFilters;
};

export type MyLeadsResult =
  | MyLeadsSuccess
  | { ok: false; message: string };

/**
 * Returns one filtered, sorted page of the signed-in user's leads.
 *
 * All input is normalized before it is used. The explicit `user_id` filter and
 * the authenticated Supabase client provide request-level scoping; RLS remains
 * the database-level protection.
 */
export async function getMyLeadsPage(
  input: unknown = {},
): Promise<MyLeadsResult> {
  const filters = parseLeadFilters(input);
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, message: "Sign in to view your leads." };
  }

  const supabase = await createClient();
  const needsBusinessJoin = filters.search !== "" || filters.category !== "";

  let query = supabase
    .from("leads")
    .select(leadListSelect(needsBusinessJoin), { count: "exact" })
    .eq("user_id", user.id);

  if (filters.search !== "") {
    query = query.ilike("businesses.name", toIlikePattern(filters.search));
  }

  if (filters.category !== "") {
    const aliases = resolveCategoryAliases(filters.category);

    if (aliases.length > 0) {
      query = query.in("businesses.category", aliases);
    } else {
      query = query.ilike(
        "businesses.category",
        toCategoryIlikePattern(filters.category),
      );
    }
  }

  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const today = todayDateString();

  switch (filters.followUp) {
    case "overdue":
      query = query.lt("next_follow_up_date", today);
      break;
    case "upcoming":
      query = query.gte("next_follow_up_date", today);
      break;
    case "none":
      query = query.is("next_follow_up_date", null);
      break;
    default:
      break;
  }

  switch (filters.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "follow_up_asc":
      query = query
        .order("next_follow_up_date", {
          ascending: true,
          nullsFirst: false,
        })
        .order("created_at", { ascending: false });
      break;
    case "follow_up_desc":
      query = query
        .order("next_follow_up_date", {
          ascending: false,
          nullsFirst: false,
        })
        .order("created_at", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const offset = (filters.page - 1) * LEAD_PAGE_SIZE;
  const { data, error, count } = await query.range(
    offset,
    offset + LEAD_PAGE_SIZE - 1,
  );

  if (error) {
    console.error("getMyLeadsPage: failed to read leads", error);
    return {
      ok: false,
      message: "Could not load your leads. Please try again.",
    };
  }

  const leads = ((data ?? []) as unknown as LeadListRow[])
    .map((row) => mapLeadRow(row))
    .filter((lead): lead is LeadListItem => lead !== null);
  const total = count ?? leads.length;
  const pageCount = Math.max(1, Math.ceil(total / LEAD_PAGE_SIZE));

  return {
    ok: true,
    leads,
    total,
    page: filters.page,
    pageSize: LEAD_PAGE_SIZE,
    pageCount,
    filters,
  };
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

/** Maximum activity items loaded into one drawer. */
const ACTIVITY_LIMIT = 50;

export type LeadDetailResult =
  | { ok: true; lead: LeadDetail }
  | { ok: false; reason: "not_found" | "error"; message: string };

/**
 * Returns one lead owned by the signed-in user, with its recent activity.
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
      .order("created_at", { ascending: false })
      .limit(ACTIVITY_LIMIT),
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
      message: "Could not load this lead's activity. Please try again.",
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
