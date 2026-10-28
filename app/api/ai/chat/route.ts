import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import {
  MAX_CONTEXT_LEADS,
  parseAiChatMessages,
  summarizeAiChatContext,
  type AiChatMessage,
  type AiChatContext,
  type AiChatLead,
} from "@/features/ai/chat";
import {
  generateChatAnswer,
  GroqChatError,
  isGroqConfigured,
} from "@/features/ai/groq";

const LEAD_STATUSES = [
  "new",
  "to_contact",
  "contacted",
  "interested",
  "not_interested",
  "follow_up",
] as const;

type LeadStatus = (typeof LEAD_STATUSES)[number];

type ProfileRow = {
  icp_niches: string[];
  icp_cities: string[];
  default_search_location: string;
};

type BusinessRow = {
  name: string;
  category: string | null;
  city: string | null;
};

type LeadRow = {
  created_at: string;
  last_contacted_at: string | null;
  next_follow_up_date: string | null;
  status: LeadStatus;
  businesses: BusinessRow | BusinessRow[] | null;
};

function errorResponse(message: string, status: number, code: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function parseRequest(payload: unknown): {
  messages: AiChatMessage[];
  shareContext: true;
} | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  if (candidate.shareContext !== true) return null;

  const messages = parseAiChatMessages(candidate.messages);
  return messages ? { messages, shareContext: true } : null;
}

function asBusiness(value: LeadRow["businesses"]): BusinessRow | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

async function loadContext(
  userId: string,
): Promise<{ ok: true; context: AiChatContext } | { ok: false }> {
  const supabase = await createClient();
  const [profileResult, leadResult, ...statusResults] = await Promise.all([
    supabase
      .from("profiles")
      .select("icp_niches, icp_cities, default_search_location")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("leads")
      .select(
        "created_at, last_contacted_at, next_follow_up_date, status, businesses!leads_business_id_fkey!inner(name, category, city)",
        { count: "exact" },
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(0, MAX_CONTEXT_LEADS - 1),
    ...LEAD_STATUSES.map((status) =>
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", status),
    ),
  ]);

  if (profileResult.error || leadResult.error) {
    console.error(
      "AI chat: failed to load user context",
      profileResult.error ?? leadResult.error,
    );
    return { ok: false };
  }

  if (leadResult.count === null) {
    console.error("AI chat: exact lead count was not returned");
    return { ok: false };
  }

  const statusCounts: Record<string, number> = {};
  for (let index = 0; index < LEAD_STATUSES.length; index += 1) {
    const result = statusResults[index];
    if (result?.error || result?.count === null || !result) {
      console.error(
        "AI chat: failed to count lead statuses",
        result?.error ?? "The database did not return an exact count.",
      );
      return { ok: false };
    }
    statusCounts[LEAD_STATUSES[index]] = result.count;
  }

  const profile = profileResult.data as ProfileRow | null;
  const rows = (leadResult.data ?? []) as unknown as LeadRow[];
  const recentLeads: AiChatLead[] = rows.flatMap((row) => {
    const business = asBusiness(row.businesses);
    if (!business?.name) return [];

    return [
      {
        businessName: business.name,
        category: business.category,
        city: business.city,
        status: row.status,
        savedAt: row.created_at.slice(0, 10),
        lastContactedAt: row.last_contacted_at,
        nextFollowUpDate: row.next_follow_up_date,
      },
    ];
  });

  return {
    ok: true,
    context: {
      asOfDate: new Date().toISOString().slice(0, 10),
      profile: {
        targetNiches: profile?.icp_niches ?? [],
        targetCities: profile?.icp_cities ?? [],
        defaultLocation: profile?.default_search_location.trim() || null,
      },
      totalLeads: leadResult.count,
      analyzedLeads: recentLeads.length,
      statusCounts,
      recentLeads,
    },
  };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("Sign in to chat about your leads.", 401, "UNAUTHENTICATED");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("Send a valid chat request.", 400, "VALIDATION_ERROR");
  }

  const parsed = parseRequest(payload);
  if (!parsed) {
    return errorResponse(
      "A chat message and explicit confirmation to share your Reachly context with Groq are required.",
      400,
      "CONSENT_REQUIRED",
    );
  }

  if (!isGroqConfigured()) {
    return errorResponse(
      "AI chat is not configured. Add GROQ_API_KEY to the server environment.",
      503,
      "AI_NOT_CONFIGURED",
    );
  }

  const result = await loadContext(user.id);
  if (!result.ok) {
    return errorResponse(
      "Could not load your Reachly context. Please try again.",
      500,
      "DATA_LOAD_FAILED",
    );
  }

  try {
    const answer = await generateChatAnswer(parsed.messages, result.context);

    return NextResponse.json(
      {
        answer,
        context: summarizeAiChatContext(result.context),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof GroqChatError) {
      const status =
        error.kind === "not_configured"
          ? 503
          : error.kind === "timeout"
            ? 504
            : 502;
      const code =
        error.kind === "not_configured"
          ? "AI_NOT_CONFIGURED"
          : error.kind === "timeout"
            ? "AI_TIMEOUT"
            : error.kind === "incomplete_response"
              ? "AI_INCOMPLETE_RESPONSE"
              : "AI_PROVIDER_FAILED";

      return errorResponse(error.message, status, code);
    }

    console.error("AI chat: unexpected generation failure", error);
    return errorResponse(
      "The AI answer could not be generated. Please try again.",
      502,
      "AI_PROVIDER_FAILED",
    );
  }
}
