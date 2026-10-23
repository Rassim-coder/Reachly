"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NormalizedBusiness } from "@/types/api";

/**
 * Save a discovered business as the signed-in user's lead.
 *
 * `businesses` is shared reference data with no client-side write policy, so
 * the business row is upserted with the service-role client. The lead itself
 * belongs to the authenticated user, and `unique (user_id, business_id)`
 * prevents duplicates at the database level.
 */

export type SaveLeadResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type BulkSaveLeadsResult =
  | { ok: true; added: number; existing: number; failed: number; total: number }
  | { ok: false; message: string };

const MAX_NAME_LENGTH = 300;
const MAX_SOURCE_ID_LENGTH = 200;
const MAX_TEXT_LENGTH = 500;
/** Upper bound per bulk request; the client selects from results it has loaded. */
const MAX_BULK_SAVE = 500;
/** Keeps each upsert statement small so one bad row cannot fail an entire selection. */
const BULK_CHUNK_SIZE = 50;

type CleanBusiness = {
  sourceId: string;
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
};

type CleanBusinessResult =
  | { ok: true; value: CleanBusiness }
  | { ok: false; message: string };

/** Returns `null` for empty values and `undefined` for invalid input. */
function cleanText(value: unknown, maxLength: number): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.length > maxLength) return undefined;

  return trimmed;
}

function cleanCoordinate(
  value: unknown,
  maxAbsolute: number,
): number | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < -maxAbsolute || value > maxAbsolute) return undefined;

  return value;
}

/** Re-validate an untrusted business payload before it reaches the database. */
function cleanBusiness(input: unknown): CleanBusinessResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, message: "The business details are invalid." };
  }

  const candidate = input as Record<string, unknown>;
  const sourceId = cleanText(candidate.sourceId, MAX_SOURCE_ID_LENGTH);
  const name = cleanText(candidate.name, MAX_NAME_LENGTH);

  if (!sourceId || !name) {
    return { ok: false, message: "The business is missing a source id or name." };
  }

  const category = cleanText(candidate.category, MAX_TEXT_LENGTH);
  const address = cleanText(candidate.address, MAX_TEXT_LENGTH);
  const phone = cleanText(candidate.phone, MAX_TEXT_LENGTH);
  const website = cleanText(candidate.website, MAX_TEXT_LENGTH);
  const email = cleanText(candidate.email, MAX_TEXT_LENGTH);
  const latitude = cleanCoordinate(candidate.latitude, 90);
  const longitude = cleanCoordinate(candidate.longitude, 180);

  if (
    [category, address, phone, website, email, latitude, longitude].some(
      (value) => value === undefined,
    )
  ) {
    return { ok: false, message: "The business details are invalid." };
  }

  return {
    ok: true,
    value: {
      sourceId,
      name,
      category: category ?? null,
      address: address ?? null,
      phone: phone ?? null,
      website: website ?? null,
      email: email ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    },
  };
}

function toBusinessRow(business: CleanBusiness) {
  return {
    source: "overture",
    source_id: business.sourceId,
    name: business.name,
    category: business.category,
    address: business.address,
    city: null,
    phone: business.phone,
    website: business.website,
    email: business.email,
    latitude: business.latitude,
    longitude: business.longitude,
  };
}

export async function saveBusinessAsLead(
  input: NormalizedBusiness,
): Promise<SaveLeadResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, message: "Sign in to save leads." };
  }

  const cleaned = cleanBusiness(input);

  if (!cleaned.ok) {
    return { ok: false, message: cleaned.message };
  }

  let admin: ReturnType<typeof createAdminClient>;

  try {
    admin = createAdminClient();
  } catch {
    return {
      ok: false,
      message:
        "Saving leads is not configured on this server (missing service-role key).",
    };
  }

  const { data: business, error: businessError } = await admin
    .from("businesses")
    .upsert(toBusinessRow(cleaned.value), { onConflict: "source,source_id" })
    .select("id")
    .single();

  if (businessError || !business) {
    console.error("saveBusinessAsLead: business upsert failed", businessError);
    return { ok: false, message: "Could not save the business. Please try again." };
  }

  const { error: leadError } = await admin.from("leads").insert({
    user_id: user.id,
    business_id: business.id,
  });

  if (leadError) {
    if (leadError.code === "23505") {
      return { ok: true, message: "This business is already in your leads." };
    }

    console.error("saveBusinessAsLead: lead insert failed", leadError);
    return { ok: false, message: "Could not save this lead. Please try again." };
  }

  revalidatePath("/my-leads");
  revalidatePath("/");

  return { ok: true, message: "Saved to your leads." };
}

/**
 * Save a user-selected batch of discovered businesses as leads.
 *
 * Reuses the same business upsert and the `unique (user_id, business_id)`
 * duplicate rule as the single-save action. Batches are chunked so one bad row
 * cannot fail the whole selection, and existing leads are counted before and
 * after the write so the counts reflect the resulting database state rather
 * than assumptions about which writes succeeded.
 */
export async function saveBusinessesAsLeads(
  inputs: NormalizedBusiness[],
): Promise<BulkSaveLeadsResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, message: "Sign in to save leads." };
  }

  if (!Array.isArray(inputs) || inputs.length === 0) {
    return { ok: false, message: "Select at least one business." };
  }

  if (inputs.length > MAX_BULK_SAVE) {
    return {
      ok: false,
      message: `Select ${MAX_BULK_SAVE} businesses or fewer at a time.`,
    };
  }

  let admin: ReturnType<typeof createAdminClient>;

  try {
    admin = createAdminClient();
  } catch {
    return {
      ok: false,
      message:
        "Saving leads is not configured on this server (missing service-role key).",
    };
  }

  // Selection is keyed by source id, but dedupe again server-side so a
  // malformed client payload cannot make one upsert statement conflict.
  const unique = new Map<string, CleanBusiness>();
  let failed = 0;

  for (const input of inputs) {
    const cleaned = cleanBusiness(input);

    if (!cleaned.ok) {
      failed += 1;
      continue;
    }

    if (!unique.has(cleaned.value.sourceId)) {
      unique.set(cleaned.value.sourceId, cleaned.value);
    }
  }

  const businessesToSave = [...unique.values()];
  let added = 0;
  let existing = 0;

  for (let start = 0; start < businessesToSave.length; start += BULK_CHUNK_SIZE) {
    const chunk = businessesToSave.slice(start, start + BULK_CHUNK_SIZE);

    const { data: savedBusinesses, error: businessError } = await admin
      .from("businesses")
      .upsert(chunk.map(toBusinessRow), { onConflict: "source,source_id" })
      .select("id, source_id");

    if (businessError) {
      console.error("saveBusinessesAsLeads: business upsert failed", businessError);
      failed += chunk.length;
      continue;
    }

    const businessIds = (savedBusinesses ?? []).map((row) => row.id);

    if (businessIds.length !== chunk.length) {
      failed += chunk.length - businessIds.length;
    }

    if (businessIds.length === 0) continue;

    const { data: existingRows, error: existingError } = await admin
      .from("leads")
      .select("business_id")
      .eq("user_id", user.id)
      .in("business_id", businessIds);

    if (existingError) {
      console.error(
        "saveBusinessesAsLeads: reading existing leads failed",
        existingError,
      );
      failed += businessIds.length;
      continue;
    }

    const before = new Set((existingRows ?? []).map((row) => row.business_id));
    existing += before.size;

    const missing = businessIds.filter((id) => !before.has(id));

    if (missing.length > 0) {
      // `ignoreDuplicates` maps to ON CONFLICT DO NOTHING, so a lead created by
      // another request between the read above and this write is not an error.
      const { error: leadError } = await admin.from("leads").upsert(
        missing.map((businessId) => ({
          user_id: user.id,
          business_id: businessId,
        })),
        { onConflict: "user_id,business_id", ignoreDuplicates: true },
      );

      if (leadError) {
        console.error("saveBusinessesAsLeads: lead insert failed", leadError);
      }
    }

    const { data: afterRows, error: afterError } = await admin
      .from("leads")
      .select("business_id")
      .eq("user_id", user.id)
      .in("business_id", businessIds);

    if (afterError) {
      console.error(
        "saveBusinessesAsLeads: verifying saved leads failed",
        afterError,
      );
      failed += businessIds.length - before.size;
      continue;
    }

    const after = new Set((afterRows ?? []).map((row) => row.business_id));

    added += businessIds.filter((id) => after.has(id) && !before.has(id)).length;
    failed += businessIds.filter((id) => !after.has(id)).length;
  }

  if (added > 0) {
    revalidatePath("/my-leads");
    revalidatePath("/");
  }

  return {
    ok: true,
    added,
    existing,
    failed,
    total: added + existing + failed,
  };
}
