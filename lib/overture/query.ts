import { createRequire } from "node:module";
import { join } from "node:path";

import type { Database as DuckDbDatabase, Connection } from "duckdb-async";

import { matchCategories, type CategoryCandidate } from "./categories";

/**
 * Server-only Overture Maps search pipeline.
 *
 * Ported from the working `testoverture` prototype; Reachly owns this copy and
 * does not import anything from `reference/`. Queries public GeoParquet from
 * S3 through DuckDB — no Overture or AWS credentials are involved.
 *
 * Never import this module from a page or client component: it uses DuckDB
 * native bindings and must only run inside a Route Handler / server action.
 */

/**
 * Pinned Overture release and schema family.
 *
 * VERIFIED 2026-10-23: Overture keeps a rolling window of releases only.
 * `2026-08-19.0` (the originally planned pin) no longer exists in the public
 * bucket, and the September 2026 schema removed `categories` in favour of
 * `taxonomy.primary`. The available releases at verification time were
 * `2026-09-23.0`, `2026-09-23.1`, and `2026-10-21.0`; both probed releases
 * expose `taxonomy STRUCT(primary VARCHAR, hierarchy VARCHAR[], alternates
 * VARCHAR[])` plus `basic_category`.
 *
 * This module intentionally does NOT fall back to another release or field
 * path. A schema mismatch fails loudly (see `assertReleaseSchema`).
 */
export const OVERTURE_RELEASE = "2026-10-21.0";

const OVERTURE_S3_ROOT = "s3://overturemaps-us-west-2/release";
const DEFAULT_TIMEOUT_MS = 120_000;

const PLACES_PATH = `read_parquet('${OVERTURE_S3_ROOT}/${OVERTURE_RELEASE}/theme=places/type=place/*', hive_partitioning=1)`;
const DIVISIONS_PATH = `read_parquet('${OVERTURE_S3_ROOT}/${OVERTURE_RELEASE}/theme=divisions/type=division_area/*', hive_partitioning=1)`;

export interface PlaceRow {
  id: string;
  name: string | null;
  category: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  lon: number | null;
  lat: number | null;
}

export interface BBox {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

export interface CityInfo {
  exactName: string;
  adminLevel: number | null;
  countryCode: string;
}

export interface SearchStats {
  total: number;
  withPhone: number;
  withWebsite: number;
  withEmail: number;
}

export interface SearchInput {
  niche: string;
  city: string;
  country: string;
}

export interface SearchOptions {
  /** Override the resolved city bbox. Intended for tests and diagnostics. */
  bbox?: BBox;
  /** Maximum number of rows requested from Overture. */
  limit?: number;
  /** Application-level timeout; not a hosting-platform guarantee. */
  timeoutMs?: number;
}

export interface SearchResult {
  release: string;
  cityInfo: CityInfo;
  bbox: BBox;
  candidates: CategoryCandidate[];
  matchedCategories: string[];
  suggestions: string[];
  stats: SearchStats;
  rows: PlaceRow[];
}

export type OvertureErrorKind =
  | "city_not_found"
  | "schema_mismatch"
  | "timeout"
  | "query_failed";

/** Classified search failure so the API can return a useful status/code. */
export class OvertureSearchError extends Error {
  readonly kind: OvertureErrorKind;

  constructor(kind: OvertureErrorKind, message: string) {
    super(message);
    this.name = "OvertureSearchError";
    this.kind = kind;
  }
}

/** Common country-name to ISO-3166 alpha-2 mapping (2-letter codes pass through). */
const COUNTRY_ISO: Record<string, string> = {
  algeria: "DZ",
  tunisia: "TN",
  morocco: "MA",
  libya: "LY",
  egypt: "EG",
  france: "FR",
  "united kingdom": "GB",
  uk: "GB",
  "great britain": "GB",
  germany: "DE",
  italy: "IT",
  spain: "ES",
  portugal: "PT",
  belgium: "BE",
  netherlands: "NL",
  switzerland: "CH",
  austria: "AT",
  canada: "CA",
  "united states": "US",
  usa: "US",
  america: "US",
  mexico: "MX",
  brazil: "BR",
  argentina: "AR",
  china: "CN",
  india: "IN",
  japan: "JP",
  "south korea": "KR",
  australia: "AU",
  "new zealand": "NZ",
  southafrica: "ZA",
  "saudi arabia": "SA",
  "united arab emirates": "AE",
  uae: "AE",
  turkey: "TR",
  qatar: "QA",
  kuwait: "KW",
  jordan: "JO",
  lebanon: "LB",
  iraq: "IQ",
  iran: "IR",
  pakistan: "PK",
  bangladesh: "BD",
  nigeria: "NG",
  kenya: "KE",
  ghana: "GH",
  senegal: "SN",
  ivory: "CI",
};

function sanitizeForSql(value: string): string {
  return value.replace(/'/g, "''");
}

function isCountryCode(value: string): boolean {
  return /^[a-z]{2}$/i.test(value);
}

function countryToIso(country: string): string | null {
  const key = country.trim().toLowerCase();
  if (!key) return null;
  if (isCountryCode(key)) return key.toUpperCase();
  return COUNTRY_ISO[key] ?? null;
}

async function installExtensions(conn: Connection): Promise<void> {
  // httpfs  -> read Parquet straight from S3 (Overture's bucket is public, no auth)
  // spatial -> geometry type support (required to read GeoParquet)
  await conn.run("INSTALL httpfs; LOAD httpfs;");
  await conn.run("INSTALL spatial; LOAD spatial;");
  await conn.run("SET s3_region='us-west-2'");
  // Session tuning for remote Parquet/HTTP (verified with DuckDB 1.4.2).
  try {
    await conn.run("SET preserve_insertion_order=false");
  } catch {
    // Older/newer builds may not support this setting; the query still works.
  }
  try {
    await conn.run("SET enable_http_metadata_cache=true");
  } catch {
    // Older/newer builds may not support this setting; the query still works.
  }
}

async function describeColumns(conn: Connection, fromClause: string): Promise<string[]> {
  const rows = (await conn.all(
    `DESCRIBE SELECT * FROM ${fromClause} LIMIT 0`,
  )) as unknown as Array<{ column_name: string }>;
  return rows.map((row) => row.column_name);
}

let placeSchemaVerified = false;

/**
 * Validate the pinned release before trusting any query result.
 *
 * Checks the columns this module depends on and binds the exact nested
 * projections used below (`categories.primary`, `addresses[1].freeform`, ...).
 * On failure it throws instead of silently falling back to another schema.
 */
async function assertReleaseSchema(conn: Connection): Promise<void> {
  if (placeSchemaVerified) return;

  try {
    const placeColumns = await describeColumns(conn, PLACES_PATH);
    const requiredPlaceColumns = [
      "id",
      "names",
      "taxonomy",
      "addresses",
      "phones",
      "websites",
      "emails",
      "bbox",
    ];
    const missingPlaceColumns = requiredPlaceColumns.filter(
      (column) => !placeColumns.includes(column),
    );

    if (missingPlaceColumns.length > 0) {
      throw new OvertureSearchError(
        "schema_mismatch",
        `Overture release ${OVERTURE_RELEASE} is incompatible with this search: ` +
          `theme=places is missing ${missingPlaceColumns.join(", ")}. ` +
          `Update lib/overture/query.ts to a supported release instead of assuming a fallback.`,
      );
    }

    // Bind the exact nested fields used by fetchPlaces. If Overture renames a
    // nested field this throws a binder error rather than returning bad rows.
    await conn.all(
      `DESCRIBE SELECT
         names.primary AS name,
         taxonomy.primary AS category,
         addresses[1].freeform AS address,
         phones[1] AS phone,
         websites[1] AS website,
         emails[1] AS email,
         bbox.xmin AS xmin
       FROM ${PLACES_PATH} LIMIT 0`,
    );

    const divisionColumns = await describeColumns(conn, DIVISIONS_PATH);
    const requiredDivisionColumns = ["names", "admin_level", "country", "region", "bbox", "class"];
    const missingDivisionColumns = requiredDivisionColumns.filter(
      (column) => !divisionColumns.includes(column),
    );

    if (missingDivisionColumns.length > 0) {
      throw new OvertureSearchError(
        "schema_mismatch",
        `Overture release ${OVERTURE_RELEASE} is incompatible with this search: ` +
          `theme=divisions is missing ${missingDivisionColumns.join(", ")}.`,
      );
    }

    await conn.all(
      `DESCRIBE SELECT
         names.primary AS name,
         names.common AS common,
         admin_level,
         country,
         bbox.xmin AS xmin
       FROM ${DIVISIONS_PATH} LIMIT 0`,
    );

    placeSchemaVerified = true;
  } catch (error) {
    if (error instanceof OvertureSearchError) throw error;

    throw new OvertureSearchError(
      "schema_mismatch",
      `Overture release ${OVERTURE_RELEASE} schema check failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Find a city's bounding box from Overture's own `divisions` theme
 * (administrative areas). Matches the city name against the primary name or
 * any common (localized) name, restricted to the given country.
 *
 * Selection heuristic: structured divisions (non-null admin_level) are
 * preferred over settlement points, so a "Algiers"/"Oran" search resolves to
 * the whole metropolitan area/commune rather than a single pixel.
 */
async function resolveCityDivision(
  conn: Connection,
  city: string,
  country: string,
): Promise<CityInfo & { bbox: BBox }> {
  const iso = countryToIso(country);
  const cityLiteral = sanitizeForSql(city);
  const countryClause = iso
    ? `country = '${iso}'`
    : // Unknown country: still try, but do not silently pretend it matched.
      `(country IS NOT NULL)`;

  // Match name in primary OR in the common(language->name) map, case-insensitively.
  const pattern = `'%${cityLiteral.toLowerCase()}%'`;
  const sql = `
    SELECT names.primary AS name, admin_level, country AS cc, region,
           bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax
    FROM ${DIVISIONS_PATH}
    WHERE ${countryClause}
      AND class = 'land'
      AND (
        lower(names.primary) LIKE ${pattern}
        OR len(
             list_filter(map_values(names.common), x -> lower(x) LIKE ${pattern})
           ) > 0
      )
    ORDER BY COALESCE(admin_level, -1) DESC, names.primary = '${cityLiteral}' DESC
    LIMIT 1`;

  const rows = (await conn.all(sql)) as unknown as Array<{
    name: string;
    admin_level: number | null;
    cc: string;
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  }>;

  if (rows.length === 0) {
    throw new OvertureSearchError(
      "city_not_found",
      `City "${city}" not found in ${country || "any country"} (release ${OVERTURE_RELEASE}). ` +
        (iso ? "" : `"${country}" is not a recognized country name/ISO code. `) +
        'Pick a city that exists as an administrative area in Overture, e.g. "Algiers".',
    );
  }

  const row = rows[0];
  // Expand the box slightly so businesses sitting on the boundary are included.
  const padLon = Math.max((row.xmax - row.xmin) * 0.05, 0.02);
  const padLat = Math.max((row.ymax - row.ymin) * 0.05, 0.02);

  return {
    exactName: row.name,
    adminLevel: row.admin_level,
    countryCode: row.cc,
    bbox: {
      minLon: row.xmin - padLon,
      maxLon: row.xmax + padLon,
      minLat: row.ymin - padLat,
      maxLat: row.ymax + padLat,
    },
  };
}

/** Distinct business categories present inside a bbox, bounded for performance. */
async function distinctCategories(conn: Connection, bbox: BBox): Promise<CategoryCandidate[]> {
  const rows = (await conn.all(`
    SELECT DISTINCT taxonomy.primary AS category
    FROM ${PLACES_PATH}
    WHERE bbox.xmin >= ${bbox.minLon} AND bbox.xmax <= ${bbox.maxLon}
      AND bbox.ymin >= ${bbox.minLat} AND bbox.ymax <= ${bbox.maxLat}
      AND taxonomy.primary IS NOT NULL
    LIMIT 1000`)) as unknown as Array<{ category: string }>;

  return rows.map((row) => ({ category: row.category, count: 1 }));
}

/** Fetch places matching a category list inside a bbox. */
async function fetchPlaces(
  conn: Connection,
  bbox: BBox,
  categories: string[],
  limit?: number,
): Promise<PlaceRow[]> {
  // Schema notes for the pinned release (2026-10-21.0):
  //   - `taxonomy.primary` is a single VARCHAR (the pre-September schema used
  //     `categories.primary`; it no longer exists)
  //   - phones/websites/emails are text arrays; [1] takes the first one
  //   - bbox is a struct (xmin, xmax, ymin, ymax), not an array
  //   - `assertReleaseSchema` validates this before any query runs.
  const limitClause =
    typeof limit === "number" && Number.isFinite(limit) && limit > 0
      ? ` LIMIT ${Math.floor(limit)}`
      : "";

  return (await conn.all(`
    SELECT
      id,
      names.primary                                           AS name,
      taxonomy.primary                                        AS category,
      addresses[1].freeform                                    AS address,
      phones[1]                                                AS phone,
      websites[1]                                              AS website,
      emails[1]                                                AS email,
      (bbox.xmin + bbox.xmax) / 2 AS lon,
      (bbox.ymin + bbox.ymax) / 2 AS lat
    FROM ${PLACES_PATH}
    WHERE bbox.xmin >= ${bbox.minLon} AND bbox.xmax <= ${bbox.maxLon}
      AND bbox.ymin >= ${bbox.minLat} AND bbox.ymax <= ${bbox.maxLat}
      AND taxonomy.primary IN (${categories
        .map((category) => `'${sanitizeForSql(category)}'`)
        .join(", ")})${limitClause}`)) as unknown as PlaceRow[];
}

/**
 * Load DuckDB through `createRequire` so Turbopack does not try to bundle or
 * trace the native `duckdb` package. Turbopack 16.4 panics while tracing
 * `node-pre-gyp` metadata ("missing field `napi_versions`") for this package;
 * loading it at runtime keeps the native binding outside the bundle. The
 * package is listed in `serverExternalPackages` as well.
 *
 * IMPORTANT: do not use `__filename` (or `import.meta.url`) as the require
 * base. Turbopack rewrites module paths to its virtual project root, producing
 * `createRequire("/ROOT/lib/overture/query.ts")` in the server chunk. That
 * path does not exist on disk, so `require("duckdb-async")` fails with
 * "Cannot find module". `process.cwd()` is the real Next.js project root for
 * both `next dev` and `next start`, and node_modules resolves from there.
 */
const requireNative = createRequire(join(process.cwd(), "package.json"));
let duckdbModule: typeof import("duckdb-async") | null = null;

function loadDuckDb(): typeof import("duckdb-async") {
  if (!duckdbModule) {
    duckdbModule = requireNative("duckdb-async") as typeof import("duckdb-async");
  }
  return duckdbModule;
}

const globalForDuckDb = globalThis as typeof globalThis & {
  __reachlyOvertureDb?: Promise<DuckDbDatabase>;
};

function getDatabase(): Promise<DuckDbDatabase> {
  if (!globalForDuckDb.__reachlyOvertureDb) {
    globalForDuckDb.__reachlyOvertureDb = loadDuckDb().Database.create(":memory:");
    // Allow a later search to retry after a failed initialization.
    globalForDuckDb.__reachlyOvertureDb.catch(() => {
      globalForDuckDb.__reachlyOvertureDb = undefined;
    });
  }

  return globalForDuckDb.__reachlyOvertureDb;
}

/**
 * Serialize searches so overlapping callers reuse the warmed metadata cache
 * instead of each kicking off a duplicate cold scan of the same S3 files.
 */
let searchChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = searchChain.then(fn, fn);
  searchChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Full search pipeline: city bbox -> candidate categories -> niche match ->
 * places fetch. The returned result is raw pipeline output; the API layer
 * normalizes it into `NormalizedBusiness[]`.
 */
export async function runSearch(
  input: SearchInput,
  options?: SearchOptions,
): Promise<SearchResult> {
  return enqueue(() => runSearchInner(input, options));
}

async function runSearchInner(
  input: SearchInput,
  options?: SearchOptions,
): Promise<SearchResult> {
  const timeoutMs =
    typeof options?.timeoutMs === "number" && options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_TIMEOUT_MS;

  const db = await getDatabase();
  const conn = await db.connect();
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    await installExtensions(conn);
    await assertReleaseSchema(conn);

    const work = (async (): Promise<SearchResult> => {
      const cityInfo = options?.bbox
        ? {
            exactName: input.city,
            adminLevel: null,
            countryCode: "",
            bbox: options.bbox,
          }
        : await resolveCityDivision(conn, input.city, input.country);

      const candidates = await distinctCategories(conn, cityInfo.bbox);
      const { matched, suggestions } = matchCategories(input.niche, candidates);

      let rows: PlaceRow[] = [];
      if (matched.length > 0) {
        rows = await fetchPlaces(conn, cityInfo.bbox, matched, options?.limit);
      }

      const filled = (value: string | null): boolean =>
        typeof value === "string" && value.trim() !== "";

      return {
        release: OVERTURE_RELEASE,
        cityInfo: {
          exactName: cityInfo.exactName,
          adminLevel: cityInfo.adminLevel,
          countryCode: cityInfo.countryCode,
        },
        bbox: cityInfo.bbox,
        candidates,
        matchedCategories: matched,
        suggestions,
        stats: {
          total: rows.length,
          withPhone: rows.filter((row) => filled(row.phone)).length,
          withWebsite: rows.filter((row) => filled(row.website)).length,
          withEmail: rows.filter((row) => filled(row.email)).length,
        },
        rows,
      };
    })();

    // Ensure late rejections (e.g. after a timeout) never go unhandled.
    work.catch(() => undefined);

    try {
      return await Promise.race([
        work,
        new Promise<SearchResult>((_, reject) => {
          timer = setTimeout(() => {
            // Best-effort: in DuckDB 1.4.2 on Node 24 this does not reliably
            // cancel a running query; the race is what returns control to the
            // caller. The connection is closed in `finally` below.
            try {
              db.interrupt();
            } catch {
              // Interrupt support is best-effort.
            }
            reject(
              new OvertureSearchError(
                "timeout",
                `Search timed out after ${Math.round(timeoutMs / 1000)}s. ` +
                  "This is an application-level limit, not a hosting-platform guarantee.",
              ),
            );
          }, timeoutMs);
        }),
      ]);
    } catch (error) {
      if (error instanceof OvertureSearchError) throw error;
      throw new OvertureSearchError(
        "query_failed",
        error instanceof Error ? error.message : "The Overture query failed.",
      );
    }
  } finally {
    if (timer) clearTimeout(timer);
    // Close only THIS search's connection; keep the shared database warm.
    try {
      await conn.close();
    } catch {
      // Closing a connection that already failed is not actionable.
    }
  }
}
