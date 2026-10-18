# Reachly — Overture Business Search

## 1. Purpose

Overture Maps is the planned source for discovering businesses. DuckDB will query cloud-hosted GeoParquet data, and the Next.js server will expose normalized results to the frontend.

This document describes the intended approach. Exact release details and implementation behavior must be verified against the actual prototype and code.

## 2. Intended Architecture

1. Receive a niche and location from the user.
2. Validate the request.
3. Resolve the requested geographic area.
4. Map the user's niche to supported Overture categories.
5. Query the selected Overture data release using DuckDB.
6. Filter and normalize results.
7. Apply a result limit and pagination strategy.
8. Return results through the server-side API.
9. Persist a business only when the user saves it as a lead.

## 3. Source Configuration — To Confirm

Record the following before implementation:

- Overture release: **TODO — verify exact release**
- GeoParquet paths: **TODO — verify**
- Overture schema and relevant columns: **TODO — inspect source**
- Category taxonomy: **TODO — verify against selected release**
- DuckDB package and version: **TODO — inspect prototype**
- Location resolution strategy: **TODO — choose and validate**
- Pagination strategy: **TODO — implement and test**

Do not silently mix releases or assume column names remain identical across releases.

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

## 11. Existing Prototype

A DuckDB prototype may exist outside the current repository.

Before replacing it:
1. Locate and inspect the existing files.
2. Identify the source release and schema used.
3. Compare its query behavior with the intended implementation.
4. Preserve working behavior until a replacement has been tested.

## 12. Completion Criteria

Search is ready for dashboard integration when:
- Real results are returned from the agreed source.
- Category and geographic behavior have been tested.
- Results are normalized consistently.
- Limits and error handling are in place.
- Performance is measured.
- Runtime compatibility risks are documented.