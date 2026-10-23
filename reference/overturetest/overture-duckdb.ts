import * as fs from 'fs';
import { Database } from 'duckdb-async';

/**
 * Minimal standalone experiment (Option B): query Overture Maps `places`
 * GeoParquet directly from the public S3 bucket with DuckDB and export JSON.
 *
 * Uses the current release and the current taxonomy schema — the old
 * `categories` property was removed in the September 2026 release and replaced
 * by `taxonomy.primary` / `basic_category`.
 *
 * Run:  npx ts-node overture-duckdb.ts
 * Env:  RELEASE, MIN_LON, MAX_LON, MIN_LAT, MAX_LAT, LIMIT, OUT_FILE
 */

const RELEASE = process.env.RELEASE || '2026-09-23.1';

// Small test area in central Algiers, Algeria.
const BBOX = {
  minLon: Number(process.env.MIN_LON ?? 3.03),
  maxLon: Number(process.env.MAX_LON ?? 3.06),
  minLat: Number(process.env.MIN_LAT ?? 36.74),
  maxLat: Number(process.env.MAX_LAT ?? 36.77),
};

const LIMIT = Number(process.env.LIMIT ?? 25);
const OUT_FILE = process.env.OUT_FILE || 'algiers-overture-sample.json';

/** Same field names as query.ts PlaceRow, plus basic_category and confidence. */
interface PlaceRow {
  id: string;
  name: string | null;
  category: string | null;
  basic_category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  lon: number | null;
  lat: number | null;
  confidence: number | null;
}

async function main(): Promise<void> {
  const db = await Database.create(':memory:');
  const conn = await db.connect();
  try {
    // httpfs -> read Parquet straight from public S3 (no auth), spatial -> GeoParquet.
    await conn.run('INSTALL httpfs; LOAD httpfs;');
    await conn.run('INSTALL spatial; LOAD spatial;');
    await conn.run("SET s3_region='us-west-2'");

    const places = `read_parquet('s3://overturemaps-us-west-2/release/${RELEASE}/theme=places/type=place/*', hive_partitioning=1)`;

    // Guard: fail loudly if a release drops a column we depend on.
    const desc = (await conn.all(`DESCRIBE SELECT * FROM ${places} LIMIT 0`)) as Array<{ column_name: string }>;
    const cols = desc.map((d) => d.column_name);
    for (const need of ['id', 'names', 'basic_category', 'taxonomy', 'addresses', 'phones', 'websites', 'emails', 'bbox']) {
      if (!cols.includes(need)) {
        throw new Error(`Schema check failed: "${need}" missing in release ${RELEASE}`);
      }
    }
    console.log(`Schema OK — ${cols.length} columns in release ${RELEASE}.`);

    const sql = `
      SELECT
        id,
        names.primary                AS name,
        basic_category,
        taxonomy.primary             AS category,
        addresses[1].freeform        AS address,
        phones[1]                    AS phone,
        websites[1]                  AS website,
        emails[1]                    AS email,
        (bbox.xmin + bbox.xmax) / 2  AS lon,
        (bbox.ymin + bbox.ymax) / 2  AS lat,
        confidence
      FROM ${places}
      WHERE bbox.xmin BETWEEN ${BBOX.minLon} AND ${BBOX.maxLon}
        AND bbox.ymin BETWEEN ${BBOX.minLat} AND ${BBOX.maxLat}
      LIMIT ${LIMIT}`;

    const rows = (await conn.all(sql)) as unknown as PlaceRow[];

    const filled = (v: unknown): boolean => typeof v === 'string' && v.trim() !== '';
    console.log('==========================================');
    console.log(`Release:      ${RELEASE}`);
    console.log(`Bounding box: ${BBOX.minLon},${BBOX.minLat} .. ${BBOX.maxLon},${BBOX.maxLat} (Algiers)`);
    console.log('------------------------------------------');
    console.log(`Rows returned:    ${rows.length}`);
    console.log(`With a phone:     ${rows.filter((r) => filled(r.phone)).length}`);
    console.log(`With a website:   ${rows.filter((r) => filled(r.website)).length}`);
    console.log(`With an email:    ${rows.filter((r) => filled(r.email)).length}`);
    console.log('==========================================');

    if (rows.length > 0) {
      console.log('\nFirst 5 rows:');
      console.table(rows.slice(0, 5));
    }

    fs.writeFileSync(OUT_FILE, JSON.stringify(rows, null, 2), 'utf-8');
    console.log(`\nSaved ${rows.length} rows to ${OUT_FILE}`);
  } finally {
    await conn.close();
    await db.close();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
