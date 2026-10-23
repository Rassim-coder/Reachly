import * as fs from 'fs';
import { Database } from 'duckdb-async';
import { loadConfig, Config } from './config';

/**
 * Queries Overture Maps `places` directly from the Parquet files on S3 with DuckDB
 * and reports what fraction of matching business have a phone number.
 *
 * All target parameters (city bbox, category, output file) come from config.ts,
 * which reads environment variables — see docs there.
 */

async function main() {
  const cfg: Config = loadConfig();

  const db = await Database.create(':memory:');
  const conn = await db.connect();

  // httpfs  -> read Parquet straight from S3 (no auth; Overture's bucket is public)
  // spatial -> geometry type support (required to read GeoParquet)
  await conn.run('INSTALL httpfs; LOAD httpfs;');
  await conn.run('INSTALL spatial; LOAD spatial;');
  // The Overture Parquet files live in the us-west-2 S3 region
  await conn.run("SET s3_region='us-west-2'");

  // hive_partitioning=1 lets DuckDB assemble theme=/type= from the directory layout.
  // Note on Overture schema (2026-08-19.0):
  //   - categories.primary  is a single VARCHAR   (older releases used VARCHAR[])
  //   - phones/websites/emails are text arrays, index [1] takes the first one
  //   - bbox is a struct (xmin, xmax, ymin, ymax), not an array
  //   - newer alternative classification columns are `taxonomy.primary` and
  //     `basic_category`; use them if `categories` disappears in a future release.
  const sql = `
    SELECT
      id,
      names.primary                                                AS name,
      categories.primary                                           AS category,
      addresses[1].freeform                                         AS address,
      phones[1]                                                     AS phone,
      websites[1]                                                   AS website,
      emails[1]                                                     AS email,
      (bbox.xmin + bbox.xmax) / 2 AS lon,
      (bbox.ymin + bbox.ymax) / 2 AS lat
    FROM read_parquet(
      's3://overturemaps-us-west-2/release/${cfg.release}/theme=places/type=place/*',
      hive_partitioning=1
    )
    WHERE bbox.xmin >= ${cfg.minLon}
      AND bbox.xmax <= ${cfg.maxLon}
      AND bbox.ymin >= ${cfg.minLat}
      AND bbox.ymax <= ${cfg.maxLat}
      AND categories.primary IN (${cfg.categories.map((c) => `'${c}'`).join(', ')})
  `;

  const rows = await conn.all(sql);

  const total = rows.length;
  const withPhone = rows.filter((r) => r.phone && r.phone.trim() !== '').length;
  const withWebsite = rows.filter((r) => r.website && r.website.trim() !== '').length;
  const withEmail = rows.filter((r) => r.email && r.email.trim() !== '').length;

  console.log('==========================================');
  console.log(`Release:          ${cfg.release}`);
  console.log(`City:             ${cfg.cityLabel}`);
  console.log(`Categories:       ${cfg.categories.join(', ')}`);
  console.log(`Bounding box:     ${cfg.minLon},${cfg.minLat} .. ${cfg.maxLon},${cfg.maxLat}`);
  console.log('------------------------------------------');
  console.log(`Total matching places:    ${total}`);
  console.log(`With a phone number:      ${withPhone}   <-- key number for lead-gen`);
  console.log(`With a website:           ${withWebsite}`);
  console.log(`With an email:            ${withEmail}`);
  console.log('==========================================');

  if (rows.length > 0) {
    console.log('\nFirst 5 sample rows:');
    console.table(rows.slice(0, 5));
  }

  fs.writeFileSync(cfg.outFile, JSON.stringify(rows, null, 2), 'utf-8');
  console.log(`\nSaved ${rows.length} rows to ${cfg.outFile}`);

  await conn.close();
  await db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});