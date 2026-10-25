import type { NormalizedBusiness } from "@/types/api";

import type { PresenceFilter, ResultFilters } from "./result-filters";

/**
 * Browser-only persistence for the last Find Businesses search.
 *
 * Results are temporary UI state, not leads. This module never writes to
 * Supabase and never stores credentials. A versioned, size-bounded snapshot
 * keeps reloads useful without turning Overture results into application data.
 */

export const SEARCH_SESSION_STORAGE_KEY = "reachly:find-businesses:search:v1";
export const SEARCH_SESSION_VERSION = 1;
export const SEARCH_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_PERSISTED_RESULTS = 200;
export const MAX_SEARCH_SESSION_CHARS = 400_000;

export const DEFAULT_SEARCH_FILTERS: ResultFilters = {
  website: "all",
  phone: "all",
  email: "all",
};

const MAX_NICHE_LENGTH = 100;
const MAX_LOCATION_LENGTH = 120;
const MAX_CURSOR_LENGTH = 4_096;
const MAX_SOURCE_ID_LENGTH = 512;
const MAX_NAME_LENGTH = 500;
const MAX_OPTIONAL_TEXT_LENGTH = 2_000;

export type SearchQuery = {
  niche: string;
  location: string;
};

export type SearchSessionInput = {
  query: SearchQuery;
  results: readonly NormalizedBusiness[];
  nextCursor: string | null;
  firstElapsedMs: number;
  filters: ResultFilters;
  selectedIds: readonly string[];
};

export type PersistedSearchSession = {
  version: number;
  savedAt: number;
  query: SearchQuery;
  resultsStored: boolean;
  results: NormalizedBusiness[];
  nextCursor: string | null;
  firstElapsedMs: number | null;
  filters: ResultFilters;
  selectedIds: string[];
};

export type RestoredSearchSession = {
  savedAt: number;
  query: SearchQuery;
  /** `null` when the results were too large to store and only criteria remain. */
  results: NormalizedBusiness[] | null;
  nextCursor: string | null;
  firstElapsedMs: number | null;
  filters: ResultFilters;
  selectedIds: string[];
};

export type SearchSessionStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown, maxLength: number): value is string | null {
  return (
    value === null ||
    (typeof value === "string" && value.length <= maxLength)
  );
}

function isNullableCoordinate(
  value: unknown,
  min: number,
  max: number,
): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= min && value <= max);
}

function isPresenceFilter(value: unknown): value is PresenceFilter {
  return value === "all" || value === "has" || value === "none";
}

function parseQuery(value: unknown): SearchQuery | null {
  if (!isRecord(value)) return null;
  if (typeof value.niche !== "string" || typeof value.location !== "string") {
    return null;
  }

  const niche = value.niche.trim();
  const location = value.location.trim();

  if (
    niche === "" ||
    location === "" ||
    niche.length > MAX_NICHE_LENGTH ||
    location.length > MAX_LOCATION_LENGTH
  ) {
    return null;
  }

  return { niche, location };
}

function parseFilters(value: unknown): ResultFilters | null {
  if (!isRecord(value)) return null;
  if (
    !isPresenceFilter(value.website) ||
    !isPresenceFilter(value.phone) ||
    !isPresenceFilter(value.email)
  ) {
    return null;
  }

  return {
    website: value.website,
    phone: value.phone,
    email: value.email,
  };
}

function parseBusiness(value: unknown): NormalizedBusiness | null {
  if (!isRecord(value)) return null;

  if (
    typeof value.sourceId !== "string" ||
    value.sourceId.trim() === "" ||
    value.sourceId.length > MAX_SOURCE_ID_LENGTH ||
    typeof value.name !== "string" ||
    value.name.trim() === "" ||
    value.name.length > MAX_NAME_LENGTH ||
    !isNullableString(value.category, MAX_OPTIONAL_TEXT_LENGTH) ||
    !isNullableString(value.address, MAX_OPTIONAL_TEXT_LENGTH) ||
    !isNullableString(value.phone, MAX_OPTIONAL_TEXT_LENGTH) ||
    !isNullableString(value.website, MAX_OPTIONAL_TEXT_LENGTH) ||
    !isNullableString(value.email, MAX_OPTIONAL_TEXT_LENGTH) ||
    !isNullableCoordinate(value.latitude, -90, 90) ||
    !isNullableCoordinate(value.longitude, -180, 180)
  ) {
    return null;
  }

  return {
    sourceId: value.sourceId,
    name: value.name,
    category: value.category,
    address: value.address,
    latitude: value.latitude,
    longitude: value.longitude,
    phone: value.phone,
    website: value.website,
    email: value.email,
  };
}

function parseResults(value: unknown): NormalizedBusiness[] | null {
  if (!Array.isArray(value)) return null;

  const results: NormalizedBusiness[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const business = parseBusiness(item);
    if (!business) return null;
    if (seen.has(business.sourceId)) continue;

    seen.add(business.sourceId);
    results.push(business);
  }

  return results;
}

function selectLoadedIds(
  value: unknown,
  results: readonly NormalizedBusiness[],
): string[] {
  if (!Array.isArray(value)) return [];

  const loaded = new Set(results.map((business) => business.sourceId));
  const selected: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (
      typeof item === "string" &&
      loaded.has(item) &&
      !seen.has(item)
    ) {
      seen.add(item);
      selected.push(item);
    }
  }

  return selected;
}

function normalizeElapsed(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value);
}

function normalizeCursor(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_CURSOR_LENGTH) {
    return null;
  }

  return value;
}

function criteriaOnly(
  query: SearchQuery,
  filters: ResultFilters,
  savedAt: number,
): PersistedSearchSession {
  return {
    version: SEARCH_SESSION_VERSION,
    savedAt,
    query,
    resultsStored: false,
    results: [],
    nextCursor: null,
    firstElapsedMs: null,
    filters,
    selectedIds: [],
  };
}

function discard(storage: SearchSessionStorage): null {
  try {
    storage.removeItem(SEARCH_SESSION_STORAGE_KEY);
  } catch {
    // Storage can be unavailable or read-only; the caller still treats the
    // snapshot as absent.
  }

  return null;
}

/**
 * Builds a snapshot without touching storage. Results beyond the size bound are
 * deliberately omitted rather than truncated, because keeping a partial list
 * while retaining a later cursor would silently skip rows after reload.
 */
export function buildSearchSession(
  input: SearchSessionInput,
  now: number = Date.now(),
): PersistedSearchSession {
  const query = {
    niche: input.query.niche.trim(),
    location: input.query.location.trim(),
  };
  const filters: ResultFilters = { ...input.filters };
  const results: NormalizedBusiness[] = [];
  const seen = new Set<string>();

  for (const business of input.results) {
    if (seen.has(business.sourceId)) continue;
    seen.add(business.sourceId);
    results.push(business);
  }

  const firstElapsedMs = normalizeElapsed(input.firstElapsedMs) ?? 0;
  const snapshot: PersistedSearchSession = {
    version: SEARCH_SESSION_VERSION,
    savedAt: now,
    query,
    resultsStored: true,
    results,
    nextCursor: normalizeCursor(input.nextCursor),
    firstElapsedMs,
    filters,
    selectedIds: selectLoadedIds(input.selectedIds, results),
  };

  if (
    results.length > MAX_PERSISTED_RESULTS ||
    JSON.stringify(snapshot).length > MAX_SEARCH_SESSION_CHARS
  ) {
    return criteriaOnly(query, filters, now);
  }

  return snapshot;
}

export function writeSearchSession(
  storage: SearchSessionStorage,
  input: SearchSessionInput,
  now: number = Date.now(),
): boolean {
  const snapshot = buildSearchSession(input, now);

  function write(value: PersistedSearchSession): boolean {
    try {
      storage.setItem(SEARCH_SESSION_STORAGE_KEY, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  if (write(snapshot)) return true;

  // A quota failure can still leave enough room for the criteria-only snapshot.
  if (
    snapshot.resultsStored &&
    write(criteriaOnly(snapshot.query, snapshot.filters, now))
  ) {
    return true;
  }

  // Do not leave an older, unrelated snapshot behind if neither write worked.
  try {
    storage.removeItem(SEARCH_SESSION_STORAGE_KEY);
  } catch {
    // Storage may be unavailable or read-only.
  }

  return false;
}

export function readSearchSession(
  storage: SearchSessionStorage,
  now: number = Date.now(),
): RestoredSearchSession | null {
  let raw: string | null;

  try {
    raw = storage.getItem(SEARCH_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }

  if (raw === null) return null;
  if (raw.length > MAX_SEARCH_SESSION_CHARS + 10_000) {
    return discard(storage);
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return discard(storage);
  }

  if (!isRecord(value)) return discard(storage);
  if (value.version !== SEARCH_SESSION_VERSION) return discard(storage);

  if (
    typeof value.savedAt !== "number" ||
    !Number.isFinite(value.savedAt) ||
    value.savedAt <= 0 ||
    now - value.savedAt > SEARCH_SESSION_TTL_MS
  ) {
    return discard(storage);
  }

  const query = parseQuery(value.query);
  const filters = parseFilters(value.filters);
  if (!query || !filters) return discard(storage);

  if (typeof value.resultsStored !== "boolean") return discard(storage);

  if (!value.resultsStored) {
    return {
      savedAt: value.savedAt,
      query,
      results: null,
      nextCursor: null,
      firstElapsedMs: null,
      filters,
      selectedIds: [],
    };
  }

  const results = parseResults(value.results);
  if (!results || results.length > MAX_PERSISTED_RESULTS) {
    return discard(storage);
  }

  const firstElapsedMs = normalizeElapsed(value.firstElapsedMs);
  if (firstElapsedMs === null) return discard(storage);

  return {
    savedAt: value.savedAt,
    query,
    results,
    nextCursor: normalizeCursor(value.nextCursor),
    firstElapsedMs,
    filters,
    selectedIds: selectLoadedIds(value.selectedIds, results),
  };
}

export function clearSearchSession(storage: SearchSessionStorage): void {
  try {
    storage.removeItem(SEARCH_SESSION_STORAGE_KEY);
  } catch {
    // Clearing temporary results must remain harmless if storage is blocked.
  }
}
