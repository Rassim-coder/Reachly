# Reachly — Overture Business Search

## 1. Purpose

Overture Maps is the source for discovering businesses. DuckDB queries cloud-hosted GeoParquet data, and the Next.js server exposes normalized results to the frontend through `POST /api/businesses/search`.

Search is implemented in Reachly's own files (`lib/overture/`, `app/api/businesses/search/route.ts`) and does not import the prototype under `reference/`.

## 2. Architecture

1. Receive a niche and location from the user.
2. Validate the request.
3. Resolve the requested geographic area.
4. Map the user's niche to supported Overture categories.
5. Query the selected Overture data release using DuckDB.
6. Filter and normalize results.
7. Apply a result limit and pagination strategy.
8. Return results through the server-side API.
9. Persist a business only when the user saves it as a lead.

## 3. Verified Source Configuration

Verified on 2026-10-23:

- Overture release: **`2026-10-21.0`**
- GeoParquet paths:
  - `s3://overturemaps-us-west-2/release/2026-10-21.0/theme=places/type=place/*` (`hive_partitioning=1`)
  - `s3://overturemaps-us-west-2/release/2026-10-21.0/theme=divisions/type=division_area/*` (`hive_partitioning=1`)
- Overture schema and relevant columns:
  - places: `id`, `names.primary`, `taxonomy` (`STRUCT(primary VARCHAR, hierarchy VARCHAR[], alternates VARCHAR[])`), `addresses[1].freeform`, `phones[1]`, `websites[1]`, `emails[1]`, `bbox`
  - divisions: `names.primary`, `names.common`, `admin_level`, `country`, `class`, `bbox`
- Category taxonomy: `taxonomy.primary` (VARCHAR). The synonym table in `lib/overture/categories.ts` uses taxonomy values verified from this release, e.g. `dental_clinic`, `general_dentistry`, `auto_dealer`, `legal_service`.
- DuckDB package and version: `duckdb-async@1.4.2` with the native `duckdb@1.4.2` binding.
- Location resolution strategy: city name is matched against `names.primary` and `names.common` in `theme=divisions/type=division_area`, restricted by ISO country code; the highest `admin_level` match wins, then the bbox is padded by 5% (minimum 0.02°) per axis.
- Pagination strategy: **not implemented**; a search returns at most 50 rows and `nextCursor` is always `null`.

Critical release note: Overture keeps only a rolling window of releases. The originally planned `2026-08-19.0` is no longer published, and the September 2026 schema removed `categories` in favour of `taxonomy.primary`. Release and schema are pinned in `lib/overture/query.ts`, and `assertReleaseSchema` fails loudly on mismatch. There is **no silent fallback** to another release or field path.

### Runtime integration notes

- `duckdb-async` and `duckdb` are listed in `serverExternalPackages`. The module is loaded through `createRequire(__filename)` because Turbopack 16.4 panics while tracing the `duckdb` package's `node-pre-gyp` metadata (`missing field napi_versions`). With this approach the Turbopack production build succeeds and Tailwind processing is preserved.
- One in-memory DuckDB database is shared per process; each search opens its own connection, and searches are serialized to reuse the warmed S3 metadata cache.
- A 120-second application-level timeout returns a `504`; it is not a hosting-platform guarantee. Serverless compatibility, memory use under load, and concurrency have not been verified.

## 4. Niche and Category Mapping

Users may enter natural language such as:
- Dentists.
- Restaurants.
- Car dealerships.
- Advertising agencies.

The search service must map the requested niche to categories supported by the selected Overture release.

Requirements:
- Keep mappings explicit and testable.
- Distinguish a category match from a broad text match.
- Handle unsupported or ambiguous niches.
- Do not claim that Overture automatically understands every user-entered niche.
- Record the taxonomy version used for the implementation.

## 5. Geographic Search

The service must interpret a location such as "Paris, France" or "Algiers, Algeria" and apply a defined geographic filter.

A bounding box is relatively simple but may include businesses outside the intended city boundary. More precise geographic filtering requires a reliable boundary or geometry strategy.

Test:
- Cities with clear geographic boundaries.
- Large metropolitan areas.
- Ambiguous city names.
- Locations with few or no matching businesses.
- Results near geographic boundaries.

Do not silently equate a bounding box with an exact administrative boundary.

## 6. Result Normalization

Use a consistent business result type.

Expected fields:
- Source identifier.
- Business name.
- Category.
- Address or location description.
- Latitude and longitude.
- Phone.
- Website.
- Email, if present in the selected source/schema.

Optional fields should be normalized to `null` when unavailable.

Verify the actual field names and availability before implementing normalization. Do not fabricate missing contact details.

## 7. Data Persistence

- Search results are transient.
- Do not bulk-import every search result into Supabase.
- Persist a business when the user saves it as a lead.
- Preserve a stable source identifier when the source provides one.
- Decide how to handle records with missing identifiers.
- Follow the approved business upsert and duplicate-lead rules.

## 8. Performance and Reliability

Search behavior must be measured, not assumed.

Test:
- Cold and warm query performance.
- Different niches and locations.
- Large result sets.
- Concurrent searches.
- Remote file access and network failures.
- Timeouts and memory usage.
- Repeated searches with equivalent inputs.
- Pagination consistency.

Use bounded result sizes and prevent unbounded or abusive queries.

## 9. Deployment Compatibility

Before choosing production hosting, verify:
- DuckDB's runtime requirements.
- Remote GeoParquet access.
- Filesystem and network assumptions.
- Serverless execution and timeout limits.
- Memory usage and concurrent query behavior.
- Package compatibility with the chosen Next.js runtime.

Do not assume local development performance predicts production behavior.

## 10. Test Matrix

Create repeatable tests covering:
- Dentists in Paris.
- Restaurants in a large city.
- A niche with few results.
- An unsupported niche.
- An invalid or ambiguous location.
- Missing phone, website, or coordinates.
- Empty search results.
- A remote query failure.
- A result set larger than one page.

Record the exact source release, search parameters, result counts, and timings for each benchmark.

### Measured results (2026-10-23, release `2026-10-21.0`)

Local Node process, single sequential searches, limit 50:

| Niche | Location | Results | Phone | Website | Email | Time |
| --- | --- | --- | --- | --- | --- | --- |
| dentist | Oran, Algeria | 50 | 47 | 12 | 36 | 51.0 s (cold start) |
| car dealer | Algiers, Algeria | 50 | 39 | 20 | 23 | 14.5 s (warm) |
| restaurant | Paris, France | 50 | 45 | 35 | 13 | 29.3 s (warm) |

The route handler was also invoked directly: validation failures returned `400`, an unknown city returned `404`, and a real search returned `200` with 50 normalized results. Authenticated HTTP testing was not performed because no test credentials were available; unauthenticated HTTP requests are redirected to `/login` by the proxy.

## 11. Existing Prototype

The prototype in `reference/overturetest/` was inspected and its working query logic was ported into `lib/overture/`. Reachly does not import anything from that folder at runtime; it can be deleted without affecting search. `tsconfig.json` and `eslint.config.mjs` exclude `reference/` so it does not interfere with project checks.

## 12. Completion Criteria

Search is ready for dashboard integration when:
- Real results are returned from the agreed source.
- Category and geographic behavior have been tested.
- Results are normalized consistently.
- Limits and error handling are in place.
- Performance is measured.
- Runtime compatibility risks are documented.