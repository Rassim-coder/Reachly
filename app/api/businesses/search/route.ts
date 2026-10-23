import { NextResponse } from "next/server";

import { decodeSearchCursor, encodeSearchCursor } from "@/lib/overture/cursor";
import { normalizeBusinesses } from "@/lib/overture/normalize";
import { OVERTURE_RELEASE, OvertureSearchError, runSearch } from "@/lib/overture/query";
import type { ApiError, ApiErrorCode, BusinessSearchResponse } from "@/types/api";

/**
 * Canonical business search endpoint (`docs/API.md` §2).
 *
 * Runs server-side only: DuckDB reads Overture GeoParquet from S3, so this
 * route must use the Node.js runtime. Route handlers already default to the
 * Node.js runtime; `cacheComponents` rejects an explicit `runtime` export.
 *
 * The proxy already requires a session for `/api/*`; no additional
 * authentication is applied here.
 */

const PAGE_SIZE = 50;
const MAX_NICHE_LENGTH = 100;
const MAX_LOCATION_LENGTH = 120;
/**
 * Application-level limit only. It is not a guarantee that a hosting platform
 * allows a request to run for this long.
 */
const SEARCH_TIMEOUT_MS = 120_000;

function errorResponse(code: ApiErrorCode, message: string, status: number) {
  const body: ApiError = { error: { code, message } };
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Parse `"City, Country"` into the city/country pair the pipeline needs.
 * Splitting on the last comma keeps multi-part city names intact.
 */
function parseLocation(location: string): { city: string; country: string } | null {
  const comma = location.lastIndexOf(",");
  if (comma === -1) return null;

  const city = location.slice(0, comma).trim();
  const country = location.slice(comma + 1).trim();

  if (!city || !country) return null;

  return { city, country };
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(
      "VALIDATION_ERROR",
      'Send a JSON body with "niche" and "location".',
      400,
    );
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return errorResponse(
      "VALIDATION_ERROR",
      'Send a JSON body with "niche" and "location".',
      400,
    );
  }

  const { niche, location, cursor } = payload as Record<string, unknown>;

  if (typeof niche !== "string" || niche.trim() === "") {
    return errorResponse("VALIDATION_ERROR", "Provide a business niche.", 400);
  }

  if (niche.trim().length > MAX_NICHE_LENGTH) {
    return errorResponse(
      "VALIDATION_ERROR",
      `The niche must be ${MAX_NICHE_LENGTH} characters or fewer.`,
      400,
    );
  }

  if (typeof location !== "string" || location.trim() === "") {
    return errorResponse("VALIDATION_ERROR", "Provide a location.", 400);
  }

  if (location.trim().length > MAX_LOCATION_LENGTH) {
    return errorResponse(
      "VALIDATION_ERROR",
      `The location must be ${MAX_LOCATION_LENGTH} characters or fewer.`,
      400,
    );
  }

  if (cursor !== undefined && cursor !== null && typeof cursor !== "string") {
    return errorResponse(
      "VALIDATION_ERROR",
      "The pagination cursor must be a string.",
      400,
    );
  }

  const cursorValue =
    typeof cursor === "string" && cursor.trim() !== "" ? cursor.trim() : null;

  const decodedCursor = cursorValue
    ? decodeSearchCursor(cursorValue, OVERTURE_RELEASE)
    : null;

  if (cursorValue && !decodedCursor) {
    return errorResponse(
      "VALIDATION_ERROR",
      "The pagination cursor is invalid or no longer matches the pinned Overture release. Run the search again.",
      400,
    );
  }

  const parsedLocation = parseLocation(location);

  if (!parsedLocation) {
    return errorResponse(
      "VALIDATION_ERROR",
      'Provide the location as "City, Country", for example "Oran, Algeria".',
      400,
    );
  }

  try {
    const result = await runSearch(
      {
        niche: niche.trim(),
        city: parsedLocation.city,
        country: parsedLocation.country,
      },
      {
        limit: PAGE_SIZE,
        timeoutMs: SEARCH_TIMEOUT_MS,
        // A continuation page reuses the resolved bbox and categories from the
        // cursor, so the divisions lookup and distinct-category scan are not
        // repeated. The remote places scan itself is unavoidable.
        bbox: decodedCursor?.bbox,
        categories: decodedCursor?.categories,
        after: decodedCursor?.after,
      },
    );

    const normalized = normalizeBusinesses(result.rows);
    const lastRow = result.rows[result.rows.length - 1];

    const nextCursor =
      result.hasMore && lastRow
        ? encodeSearchCursor(OVERTURE_RELEASE, {
            bbox: result.bbox,
            categories: result.matchedCategories,
            after: lastRow.id,
          })
        : null;

    const body: BusinessSearchResponse = {
      results: normalized,
      nextCursor,
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "no-store",
        "X-Overture-Release": OVERTURE_RELEASE,
      },
    });
  } catch (error) {
    if (error instanceof OvertureSearchError && error.kind === "city_not_found") {
      return errorResponse("NOT_FOUND", error.message, 404);
    }

    if (error instanceof OvertureSearchError && error.kind === "timeout") {
      return errorResponse("SEARCH_FAILED", error.message, 504);
    }

    // Release/schema mismatches and DuckDB failures are reported truthfully.
    const message =
      error instanceof Error ? error.message : "The business search failed.";

    return errorResponse("SEARCH_FAILED", message, 500);
  }
}
