import { Database, Connection } from 'duckdb-async';
import { loadConfig } from './config';
import { matchCategories, CategoryCandidate } from './categories';

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

export interface SearchOptions {
  bbox?: BBox;
  limit?: number;
  timeoutMs?: number;
}

export interface SearchResult {
  request: { niche: string; city: string; country: string };
  release: string;
  cityInfo: { exactName: string; adminLevel: number | null; countryCode: string };
  bbox: BBox;
  candidates: CategoryCandidate[];
  matchedCategories: string[];
  suggestions: string[];
  stats: { total: number; withPhone: number; withWebsite: number; withEmail: number };
  rows: PlaceRow[];
  outFile: string;
}

/** Common country-name to ISO-3166 alpha-2 mapping (2-letter codes pass through). */
const COUNTRY_ISO: Record<string, string> = {
  algeria: 'DZ', tunisia: 'TN', morocco: 'MA', libya: 'LY', egypt: 'EG',
  france: 'FR', 'united kingdom': 'GB', uk: 'GB', 'great britain': 'GB',
  germany: 'DE', italy: 'IT', spain: 'ES', portugal: 'PT', belgium: 'BE',
  netherlands: 'NL', switzerland: 'CH', austria: 'AT', canada: 'CA',
  'united states': 'US', usa: 'US', america: 'US', mexico: 'MX', brazil: 'BR',
  argentina: 'AR', china: 'CN', india: 'IN', japan: 'JP', 'south korea': 'KR',
  australia: 'AU', 'new zealand': 'NZ', southafrica: 'ZA', 'saudi arabia': 'SA',
  'united arab emirates': 'AE', uae: 'AE', turkey: 'TR', qatar: 'QA',
  kuwait: 'KW', jordan: 'JO', lebanon: 'LB', iraq: 'IQ', iran: 'IR',
  pakistan: 'PK', bangladesh: 'BD', nigeria: 'NG', kenya: 'KE', ghana: 'GH',
  senegal: 'SN', ivory: 'CI',
};

function slug(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'result';
}

function sanitizeForSql(s: string): string {
  return s.replace(/'/g, "''");
}

function isCountryCode(s: string): boolean {
  return /^[a-z]{2}$/i.test(s);
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
  await conn.run('INSTALL httpfs; LOAD httpfs;');
  await conn.run('INSTALL spatial; LOAD spatial;');
  await conn.run("SET s3_region='us-west-2'");
  // Session tuning for remote Parquet/HTTP (verified v1.4.2)
  try {
    await conn.run("SET preserve_insertion_order=false");
  } catch (err) {
    // Ignore if setting not supported
  }
  try {
    await conn.run("SET enable_http_metadata_cache=true");
  } catch (err) {
    // Ignore if setting not supported
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
  release: string,
): Promise<{ exactName: string; adminLevel: number | null; countryCode: string; bbox: BBox }> {
  const iso = countryToIso(country);
  const c = sanitizeForSql(city);
  const countryClause = iso
    ? `country = '${iso}'`
    : // Unknown country: still try, but list every country matched for the message
      `(country IS NOT NULL)`;

  const div = `read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=divisions/type=division_area/*', hive_partitioning=1)`;

  // Match name in primary OR in the common(language->name) map, case-insensitively.
  const pat = `'%${c.toLowerCase()}%'`;
  const sql = `
    SELECT names.primary AS name, admin_level, country AS cc, region,
           bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax
    FROM ${div}
    WHERE ${countryClause}
      AND class = 'land'
      AND (
        lower(names.primary) LIKE ${pat}
        OR len(
             list_filter(map_values(names.common), x -> lower(x) LIKE ${pat})
           ) > 0
      )
    ORDER BY COALESCE(admin_level, -1) DESC, names.primary = '${c}' DESC
    LIMIT 1`;

  const rows = await conn.all(sql);
  if (rows.length === 0) {
    throw new Error(
      `City "${city}" not found in ${country || 'any country'} (release ${release}). ` +
      (iso ? '' : `"${country}" is not a recognized country name/ISO code. `) +
      'Pick a city that exists as an administrative area in Overture, e.g. "Algiers".',
    );
  }

  const r = rows[0];
  // Expand the box slightly so businesses sitting on the boundary are included.
  const padLon = Math.max((r.xmax - r.xmin) * 0.05, 0.02);
  const padLat = Math.max((r.ymax - r.ymin) * 0.05, 0.02);
  return {
    exactName: r.name,
    adminLevel: r.admin_level,
    countryCode: r.cc,
    bbox: {
      minLon: r.xmin - padLon,
      maxLon: r.xmax + padLon,
      minLat: r.ymin - padLat,
      maxLat: r.ymax + padLat,
    },
  };
}

/** Distinct business categories present inside a bbox, bounded for performance. */
async function distinctCategories(conn: Connection, bbox: BBox, release: string, limitN: number = 1000): Promise<CategoryCandidate[]> {
  const places = `read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=places/type=place/*', hive_partitioning=1)`;
  const rows = await conn.all(`
    SELECT DISTINCT categories.primary AS category
    FROM ${places}
    WHERE bbox.xmin >= ${bbox.minLon} AND bbox.xmax <= ${bbox.maxLon}
      AND bbox.ymin >= ${bbox.minLat} AND bbox.ymax <= ${bbox.maxLat}
      AND categories.primary IS NOT NULL
    LIMIT ${Number(limitN)}`);
  return rows.map((r) => ({ category: r.category, count: 1 }));
}

/** Fetch places matching a category list inside a bbox. */
async function fetchPlaces(conn: Connection, bbox: BBox, categories: string[], release: string, limit?: number): Promise<PlaceRow[]> {
  const places = `read_parquet('s3://overturemaps-us-west-2/release/${release}/theme=places/type=place/*', hive_partitioning=1)`;
  // NOTE on the Overture schema (2026-08-19.0, schema v2.0.0):
  //   - categories.primary is a single VARCHAR (older releases used VARCHAR[])
  //   - phones/websites/emails are text arrays; [1] takes the first one
  //   - bbox is a struct (xmin, xmax, ymin, ymax), not an array
  //   - if `categories` is removed in a future release, switch to `taxonomy.primary`
  // No auth needed; values returned by DuckDB are plain strings/numbers/null.
  const limitClause = typeof limit === 'number' && limit > 0 ? ` LIMIT ${limit}` : '';
  return conn.all(`
    SELECT
      id,
      names.primary                                           AS name,
      categories.primary                                      AS category,
      addresses[1].freeform                                    AS address,
      phones[1]                                                AS phone,
      websites[1]                                              AS website,
      emails[1]                                                AS email,
      (bbox.xmin + bbox.xmax) / 2 AS lon,
      (bbox.ymin + bbox.ymax) / 2 AS lat
    FROM ${places}
    WHERE bbox.xmin >= ${bbox.minLon} AND bbox.xmax <= ${bbox.maxLon}
      AND bbox.ymin >= ${bbox.minLat} AND bbox.ymax <= ${bbox.maxLat}
      AND categories.primary IN (${categories.map((c) => `'${sanitizeForSql(c)}'`).join(', ')})${limitClause}`) as unknown as Promise<PlaceRow[]>;
}

/**
 * The DuckDB object cache and remote-Parquet metadata cache live at the
 * DATABASE level. Creating a fresh `:memory:` Database for every search made
 * each request re-pay the cold S3 metadata scan (glob + every Parquet footer),
 * which is what made repeat searches take minutes. We therefore keep ONE
 * shared in-memory Database for the whole process and hand each search its own
 * Connection (cheap, isolated, safe for concurrent readers).
 */
let sharedDb: Database | null = null;
let dbPromise: Promise<Database> | null = null;

async function getDatabase(): Promise<Database> {
  if (sharedDb) return sharedDb;
  if (!dbPromise) {
    dbPromise = Database.create(':memory:').then(
      (db) => {
        sharedDb = db;
        return db;
      },
      (err) => {
        dbPromise = null;
        throw err;
      },
    );
  }
  return dbPromise;
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
 * places fetch. Used by both the CLI (search.ts) and the web server.
 */
export async function runSearch(input: { niche: string; city: string; country: string }, options?: SearchOptions): Promise<SearchResult> {
  return enqueue(() => runSearchInner(input, options));
}

async function runSearchInner(input: { niche: string; city: string; country: string }, options?: SearchOptions): Promise<SearchResult> {
  const cfg = loadConfig();
  const t0 = Date.now();
  const phase = async (label: string, fn: () => Promise<any>) => {
    const p0 = Date.now();
    const res = await fn();
    const p1 = Date.now();
    console.log(`[timing] ${label}: ${p1 - p0}ms`);
    return res;
  };

  const timeoutMs = typeof options?.timeoutMs === 'number' && options.timeoutMs > 0 ? options.timeoutMs : 120000;

  const db = await getDatabase();
  const conn = await phase('db.connect', async () => await db.connect());
  let timer: any = null;
  try {
    await phase('installExtensions+load+sets', async () => await installExtensions(conn));

    const work = (async () => {
      const cityInfo = await phase('resolveCityDivision', async () => {
        const b = options?.bbox;
        if (b) {
          return { exactName: input.city, adminLevel: null, countryCode: '', bbox: b } as any;
        }
        return await resolveCityDivision(conn, input.city, input.country, cfg.release);
      });

      const candidates = await phase('distinctCategories', async () => await distinctCategories(conn, cityInfo.bbox, cfg.release));
      const { matched, suggestions } = await phase('matchCategories', async () => matchCategories(input.niche, candidates));

      let rows: PlaceRow[] = [];
      if (matched.length > 0) {
        rows = await phase('fetchPlaces', async () => await fetchPlaces(conn, cityInfo.bbox, matched, cfg.release, options?.limit));
      }

      const stats = await phase('stats', async () => ({
        total: rows.length,
        withPhone: rows.filter((r) => r.phone && r.phone.trim() !== '').length,
        withWebsite: rows.filter((r) => r.website && r.website.trim() !== '').length,
        withEmail: rows.filter((r) => r.email && r.email.trim() !== '').length,
      }));

      const outFile = await phase('outFile', async () =>
        input.city && input.country
          ? `${slug(input.city)}-${slug((matched[0] ?? 'any').split('_').join('-'))}.json`
          : 'places_filtered.json',
      );

      console.log(`[timing] total: ${Date.now() - t0}ms`);

      return {
        request: input,
        release: cfg.release,
        cityInfo: { exactName: (cityInfo as any).exactName, adminLevel: (cityInfo as any).adminLevel, countryCode: (cityInfo as any).countryCode },
        bbox: cityInfo.bbox,
        candidates,
        matchedCategories: matched,
        suggestions,
        stats,
        rows,
        outFile,
      } as SearchResult;
    })();

    // Ensure late rejections (e.g. after a timeout) never go unhandled.
    work.catch(() => undefined);

    if (!(timeoutMs > 0)) return await work;

    return await Promise.race([
      work,
      new Promise<SearchResult>((_, reject) => {
        timer = setTimeout(() => {
          // Best-effort: interrupt the shared Database. NOTE: in duckdb 1.4.2
          // on Node 24 this does not reliably cancel a running query, so the
          // race below is what actually returns control (with a clear error
          // and no partial results) to the caller.
          try { db.interrupt(); } catch (e) { /* ignore */ }
          reject(new Error(`Search timed out after ${Math.round(timeoutMs / 1000)}s`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    // Close only THIS search's connection; keep the shared Database warm.
    try { await conn.close(); } catch (e) { /* ignore */ }
  }
}