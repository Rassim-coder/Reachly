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

const MAX_NAME_LENGTH = 300;
const MAX_SOURCE_ID_LENGTH = 200;
const MAX_TEXT_LENGTH = 500;

/** Returns `null` for empty values and `undefined` for invalid input. */
function cleanText(value: unknown, maxLength: number): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.length > maxLength) return undefined;

  return trimmed;
}

function cleanCoordinate(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < -180 || value > 180) return undefined;

  return value;
}

export async function saveBusinessAsLead(
  input: NormalizedBusiness,
): Promise<SaveLeadResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, message: "Sign in to save leads." };
  }

  if (typeof input !== "object" || input === null) {
    return { ok: false, message: "The business details are invalid." };
  }

  const sourceId = cleanText(input.sourceId, MAX_SOURCE_ID_LENGTH);
  const name = cleanText(input.name, MAX_NAME_LENGTH);

  if (!sourceId || !name) {
    return { ok: false, message: "The business is missing a source id or name." };
  }

  const category = cleanText(input.category, MAX_TEXT_LENGTH);
  const address = cleanText(input.address, MAX_TEXT_LENGTH);
  const phone = cleanText(input.phone, MAX_TEXT_LENGTH);
  const website = cleanText(input.website, MAX_TEXT_LENGTH);
  const email = cleanText(input.email, MAX_TEXT_LENGTH);
  const latitude = cleanCoordinate(input.latitude);
  const longitude = cleanCoordinate(input.longitude);

  if (
    [category, address, phone, website, email, latitude, longitude].some(
      (value) => value === undefined,
    )
  ) {
    return { ok: false, message: "The business details are invalid." };
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
    .upsert(
      {
        source: "overture",
        source_id: sourceId,
        name,
        category: category ?? null,
        address: address ?? null,
        city: null,
        phone: phone ?? null,
        website: website ?? null,
        email: email ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      },
      { onConflict: "source,source_id" },
    )
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
