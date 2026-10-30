import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
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
 * The Proxy refreshes sessions and redirects private routes, but authorization
 * is repeated here because Proxy is not the security boundary for data access.
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
  const user = await getCurrentUser();
  if (!user) {
    return errorResponse("UNAUTHENTICATED", "Sign in to search businesses.", 401);
  }

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
      "The pagination cursor is invalid or has expired. Run the search again.",
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
      return errorResponse(
        "NOT_FOUND",
        "We couldn't find a matching city. Check the city and country, then try again.",
        404,
      );
    }

    if (error instanceof OvertureSearchError && error.kind === "timeout") {
      console.error("POST /api/businesses/search: Overture request timed out", error);
      return errorResponse(
        "SEARCH_FAILED",
        cursorValue
          ? "Loading more businesses took longer than expected. Your current results are unchanged—please try again shortly."
          : "This search is taking longer than expected. Please try again shortly or use a more specific niche and location.",
        504,
      );
    }

    // Keep low-level DuckDB/S3 details in server logs only. They can include
    // bucket paths and internal source diagnostics that aren't useful to users.
    console.error("POST /api/businesses/search: remote search failed", error);
    return errorResponse(
      "SEARCH_FAILED",
      cursorValue
        ? "More businesses couldn't be loaded right now. Your current results are unchanged—please try again shortly."
        : "Business search is temporarily unavailable. Please try again shortly.",
      500,
    );
  }
}
