import type { BBox } from "./query";

/**
 * Opaque continuation cursor for business search.
 *
 * The cursor carries the resolved bbox and matched categories so a
 * continuation request does not repeat the divisions lookup or the
 * distinct-category scan. It is client-supplied and therefore validated on
 * decode; it contains no secrets and no user data.
 */

const MAX_CURSOR_LENGTH = 8_192;

export interface SearchCursor {
  bbox: BBox;
  categories: string[];
  /** Last raw `id` returned in the previous page. */
  after: string;
}

type CursorPayload = {
  v: 1;
  release: string;
  /** [minLon, minLat, maxLon, maxLat] */
  bbox: [number, number, number, number];
  categories: string[];
  after: string;
};

export function encodeSearchCursor(release: string, cursor: SearchCursor): string {
  const payload: CursorPayload = {
    v: 1,
    release,
    bbox: [
      cursor.bbox.minLon,
      cursor.bbox.minLat,
      cursor.bbox.maxLon,
      cursor.bbox.maxLat,
    ],
    categories: cursor.categories,
    after: cursor.after,
  };

  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Decode and validate a cursor. Returns `null` for malformed input or for a
 * cursor issued against a different Overture release, so dataset versions are
 * never mixed silently.
 */
export function decodeSearchCursor(
  value: string,
  expectedRelease: string,
): SearchCursor | null {
  if (value.length > MAX_CURSOR_LENGTH) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const candidate = parsed as Record<string, unknown>;
  const box = candidate.bbox;

  if (candidate.v !== 1 || candidate.release !== expectedRelease) return null;
  if (!Array.isArray(box) || box.length !== 4 || !box.every(isFiniteNumber)) {
    return null;
  }

  const [minLon, minLat, maxLon, maxLat] = box;
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) return null;
  if (minLon >= maxLon || minLat >= maxLat) return null;

  const categories = candidate.categories;
  if (
    !Array.isArray(categories) ||
    categories.length === 0 ||
    categories.length > 32 ||
    !categories.every(
      (category) =>
        typeof category === "string" &&
        category.length > 0 &&
        category.length <= 100 &&
        /^[A-Za-z0-9_]+$/.test(category),
    )
  ) {
    return null;
  }

  const after = candidate.after;
  if (typeof after !== "string" || !/^[A-Za-z0-9_.:-]{1,200}$/.test(after)) {
    return null;
  }

  return {
    bbox: { minLon, minLat, maxLon, maxLat },
    categories: categories as string[],
    after,
  };
}
