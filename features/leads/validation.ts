/**
 * Pure input validation for saving discovered businesses as leads.
 *
 * Kept separate from `actions.ts` so it can be tested without a Next.js
 * request context, Supabase client, or database. The server action still
 * authenticates the user and performs all writes; nothing here does I/O.
 */

export const MAX_NAME_LENGTH = 300;
export const MAX_SOURCE_ID_LENGTH = 200;
export const MAX_TEXT_LENGTH = 500;
export const MAX_NOTE_LENGTH = 2000;

export type CleanBusiness = {
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

export type CleanBusinessResult =
  | { ok: true; value: CleanBusiness }
  | { ok: false; message: string };

export type CleanBusinessBatch = {
  businesses: CleanBusiness[];
  /** Number of inputs rejected by validation. */
  failed: number;
};

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
export function validateBusinessInput(input: unknown): CleanBusinessResult {
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

/**
 * Validate a bulk selection, dropping invalid inputs and collapsing repeated
 * stable source IDs (first occurrence wins).
 */
export function collectBusinessesForBulkSave(
  inputs: unknown[],
): CleanBusinessBatch {
  const unique = new Map<string, CleanBusiness>();
  let failed = 0;

  for (const input of inputs) {
    const cleaned = validateBusinessInput(input);

    if (!cleaned.ok) {
      failed += 1;
      continue;
    }

    if (!unique.has(cleaned.value.sourceId)) {
      unique.set(cleaned.value.sourceId, cleaned.value);
    }
  }

  return { businesses: [...unique.values()], failed };
}

/**
 * Shape expected by `save_businesses_as_leads`. Keys are intentionally the
 * application-level camelCase contract; the SQL function maps them into columns
 * and never trusts a source name or user id from the client.
 */
export function toBusinessPayload(business: CleanBusiness) {
  return {
    sourceId: business.sourceId,
    name: business.name,
    category: business.category,
    address: business.address,
    phone: business.phone,
    website: business.website,
    email: business.email,
    latitude: business.latitude,
    longitude: business.longitude,
  };
}

export type CleanNoteResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

/** Validates a user-entered lead note before it is written as an activity. */
export function validateLeadNote(input: unknown): CleanNoteResult {
  if (typeof input !== "string") {
    return { ok: false, message: "Write a note before saving." };
  }

  const trimmed = input.trim();

  if (trimmed === "") {
    return { ok: false, message: "Write a note before saving." };
  }

  if (trimmed.length > MAX_NOTE_LENGTH) {
    return {
      ok: false,
      message: `Notes cannot be longer than ${MAX_NOTE_LENGTH} characters.`,
    };
  }

  return { ok: true, value: trimmed };
}
