/**
 * Live Overture Maps acquisition with an on-disk cache.
 *
 * Overture's bucket is public, so no AWS credentials are needed — but a query
 * over a city's bbox takes ~45s. Everything here therefore goes through
 * `crm/cache/<release>/<city>-<niche>.json`:
 *
 *   fresh cache            -> serve instantly (source: cache)
 *   stale or missing cache -> run the live query, then write the cache
 *   live query fails       -> serve the stale cache if we have one, else throw
 *
 * Only `runSearch()` from ../query does the actual work; this module owns
 * caching, de-duplication of concurrent queries, and provenance reporting.
 */

import * as fs from 'fs';
import * as path from 'path';
import { runSearch, PlaceRow } from '../query';
import { loadConfig } from '../config';

export interface SearchSpec {
  niche: string;
  city: string;
  country: string;
}

export interface Provenance {
  /** Where these rows actually came from. */
  source: 'live' | 'cache';
  release: string;
  fetchedAt: string | null;
  ageMs: number | null;
  /** True when we served expired data because a live query failed. */
  stale: boolean;
  error?: string;
}

export interface Dataset {
  rows: PlaceRow[];
  niche: string;
  city: string;
  country: string;
  provenance: Provenance;
}

const CACHE_DIR = path.join(__dirname, 'cache');

/** Queries loaded at boot, so the CRM has data before anyone clicks "Find". */
export function defaultSearches(): SearchSpec[] {
  const raw = process.env.CRM_SEARCHES;
  const fallback: SearchSpec[] = [
    { niche: 'car dealer', city: 'Algiers', country: 'Algeria' },
    { niche: 'dentist', city: 'Oran', country: 'Algeria' },
  ];
  if (!raw) return fallback;
  const parsed = raw
    .split(',')
    .map((part) => {
      const [niche, city, country] = part.split('|').map((s) => (s || '').trim());
      return { niche, city, country };
    })
    .filter((s) => s.niche && s.city && s.country);
  return parsed.length ? parsed : fallback;
}

function ttlMs(): number {
  const hours = Number(process.env.CRM_CACHE_TTL_HOURS);
  return (Number.isFinite(hours) && hours > 0 ? hours : 24) * 3600_000;
}

function slug(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'x'
  );
}

function cachePath(spec: SearchSpec, release: string): string {
  return path.join(CACHE_DIR, release, `${slug(spec.city)}-${slug(spec.niche)}.json`);
}

interface CacheFile {
  fetchedAt: string;
  release: string;
  request: SearchSpec;
  rows: PlaceRow[];
}

function readCache(spec: SearchSpec, release: string): { file: CacheFile; ageMs: number } | null {
  const file = cachePath(spec, release);
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    const parsed = JSON.parse(raw) as CacheFile;
    if (!Array.isArray(parsed.rows)) return null;
    const ageMs = Date.now() - new Date(parsed.fetchedAt).getTime();
    if (!Number.isFinite(ageMs)) return null;
    return { file: parsed, ageMs };
  } catch {
    return null;
  }
}

function writeCache(spec: SearchSpec, release: string, rows: PlaceRow[]): void {
  const target = cachePath(spec, release);
  const payload: CacheFile = {
    fetchedAt: new Date().toISOString(),
    release,
    request: spec,
    rows,
  };
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(payload), 'utf-8');
}

/** One live query per spec, even if several requests ask at once. */
const inFlight = new Map<string, Promise<PlaceRow[]>>();

async function queryLive(spec: SearchSpec): Promise<PlaceRow[]> {
  const key = `${spec.niche}|${spec.city}|${spec.country}`;
  const existing = inFlight.get(key);
  if (existing) return existing;

  const task = runSearch(spec)
    .then((res) => res.rows)
    .finally(() => inFlight.delete(key));

  inFlight.set(key, task);
  return task;
}

/**
 * The cached dataset for this search, but only if it is still fresh.
 * Lets callers answer instantly from cache instead of waiting on Overture.
 */
export async function peekFreshDataset(spec: SearchSpec): Promise<Dataset | null> {
  const { release } = loadConfig();
  const cached = readCache(spec, release);
  if (!cached || cached.ageMs >= ttlMs()) return null;
  return {
    rows: cached.file.rows,
    niche: spec.niche,
    city: spec.city,
    country: spec.country,
    provenance: {
      source: 'cache',
      release,
      fetchedAt: cached.file.fetchedAt,
      ageMs: cached.ageMs,
      stale: false,
    },
  };
}

/** Kick off a live query for `spec` without making the caller wait for it. */
export function refreshInBackground(spec: SearchSpec, label = 'background'): void {
  const started = Date.now();
  console.log(`  Refreshing Overture (${label}): ${spec.niche} / ${spec.city} …`);
  getDataset(spec)
    .then((ds) => {
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`  Refreshed ${ds.rows.length} ${spec.niche} in ${spec.city} (${secs}s)`);
    })
    .catch((err: Error) => console.warn(`  Refresh failed for ${spec.niche}/${spec.city}: ${err.message}`));
}

export interface DatasetOptions {
  /** Ignore cache freshness and re-query Overture. */
  refresh?: boolean;
  /** Called when a live query starts, so the UI can show progress. */
  onLiveQuery?: (spec: SearchSpec) => void;
}

export async function getDataset(spec: SearchSpec, opts: DatasetOptions = {}): Promise<Dataset> {
  const { release } = loadConfig();
  const cached = readCache(spec, release);

  if (!opts.refresh && cached && cached.ageMs < ttlMs()) {
    return {
      rows: cached.file.rows,
      niche: spec.niche,
      city: spec.city,
      country: spec.country,
      provenance: {
        source: 'cache',
        release,
        fetchedAt: cached.file.fetchedAt,
        ageMs: cached.ageMs,
        stale: false,
      },
    };
  }

  opts.onLiveQuery?.(spec);
  try {
    const rows = await queryLive(spec);
    writeCache(spec, release, rows);
    const fetchedAt = new Date().toISOString();
    return {
      rows,
      niche: spec.niche,
      city: spec.city,
      country: spec.country,
      provenance: { source: 'live', release, fetchedAt, ageMs: 0, stale: false },
    };
  } catch (err: any) {
    const message = err?.message || String(err);
    if (cached) {
      return {
        rows: cached.file.rows,
        niche: spec.niche,
        city: spec.city,
        country: spec.country,
        provenance: {
          source: 'cache',
          release,
          fetchedAt: cached.file.fetchedAt,
          ageMs: cached.ageMs,
          stale: true,
          error: message,
        },
      };
    }
    throw new Error(`Overture query failed for "${spec.niche}" in ${spec.city}: ${message}`);
  }
}

/**
 * Fire the default queries without blocking startup, refreshing any cache that
 * has expired. The first page load is served from cache in the meantime.
 */
export function warmDefaultDatasets(): void {
  const { release } = loadConfig();
  for (const spec of defaultSearches()) {
    const cached = readCache(spec, release);
    if (cached && cached.ageMs < ttlMs()) continue;
    const started = Date.now();
    console.log(`  Warming Overture cache: ${spec.niche} / ${spec.city} …`);
    getDataset(spec)
      .then((ds) => {
        const secs = ((Date.now() - started) / 1000).toFixed(1);
        const how = ds.provenance.source === 'live' ? 'queried' : 'using stale cache';
        console.log(`  Warmed ${ds.rows.length} ${spec.niche} in ${spec.city} (${how}, ${secs}s)`);
      })
      .catch((err: Error) => console.warn(`  Warm-up failed for ${spec.niche}/${spec.city}: ${err.message}`));
  }
}

export function cacheStatus(): { dir: string; ttlHours: number; files: string[] } {
  const hours = ttlMs() / 3600_000;
  let files: string[] = [];
  try {
    const { release } = loadConfig();
    const dir = path.join(CACHE_DIR, release);
    files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  } catch {
    files = [];
  }
  return { dir: CACHE_DIR, ttlHours: hours, files };
}