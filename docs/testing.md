# Reachly — Testing

## 1. Current status

Unit tests exist for pure business-search, temporary search persistence, lead
validation, lead-saving result parsing, My Leads mapping/presentation logic, and
Follow-ups date grouping, and Analytics calculations.

- **No database integration tests are configured.**
- **No Supabase test project or local test environment is configured.**
- Lead saving uses the `save_businesses_as_leads` RPC instead of the service-role
  client. The function is installed in the development project, but no automated
  database integration test verifies it and no production verification is claimed.
- My Leads has an authenticated, filtered, paginated list; a detail drawer;
  status, note, and follow-up updates; activity history; page-scoped selection;
  bulk status/follow-up updates; and bulk deletion. None of those database paths
  are proven by integration tests.
- Follow-ups has a dedicated server-rendered queue grouped into Overdue, Today,
  and Upcoming, with inline reschedule/completion and the existing detail drawer.
  Its authenticated database paths are also unverified.
- Analytics aggregates all queried lead/activity data on the server. Its live
  Supabase queries, RLS isolation, and Recharts rendering still require manual
  verification.

The suite uses Node's built-in test runner (`node:test`) and native TypeScript
type stripping. It adds **no test framework dependency**. Tests were verified on
Node 24.18; native TypeScript support requires a recent Node 22/24 release.

## 2. Commands

```bash
pnpm test        # unit tests only
pnpm typecheck   # tsc --noEmit
pnpm lint        # ESLint
pnpm build       # production build (also type-checks)
```

`pnpm test` is intentionally the fast, offline suite. It does not need Supabase,
DuckDB, network access, a browser, or environment variables.

## 3. Unit coverage

| File | Behavior covered |
|---|---|
| `tests/unit/result-filters.test.ts` | Website/phone/email presence filters, AND combinations, empty results, whitespace/null handling, active-filter detection, no mutation of loaded rows |
| `tests/unit/search-errors.test.ts` | User-safe initial/Load more errors, validation and stale-cursor messaging, network failures, and suppression of raw provider diagnostics |
| `tests/unit/search-session.test.ts` | Search snapshot round-trip for criteria/results/filters/pagination, stale selected-ID pruning, malformed/expired cache rejection, criteria-only size fallback, quota failure behavior, empty-result restoration, and clearing only the temporary search key |
| `tests/unit/cursor.test.ts` | Cursor round-trip, URL-safe encoding, release/version rejection, malformed payloads, bbox shape and ranges, category and keyset-ID validation, size limit, strict output shape |
| `tests/unit/normalize.test.ts` | Overture row → API mapping, trimming, nullable contact fields, zero/negative coordinates, non-finite coordinates, blank name/id rejection, batch filtering |
| `tests/unit/lead-validation.test.ts` | Required source ID/name, length limits, optional text fields, latitude/longitude bounds, non-string/non-finite values, bulk deduplication and invalid counts, RPC payload mapping, note validation, follow-up date validation |
| `tests/unit/lead-list.test.ts` | Actual lead-status labels and runtime status guard, UTC date and timestamp formatting, category/location formatting, follow-up states and completed-history indicator, safe website links, joined lead/business row mapping, nullable contact fields, missing business handling, lead detail, notes and activity mapping, lead id validation |
| `tests/unit/follow-up-queue.test.ts` | Overdue/today/upcoming grouping, exclusion of unscheduled and invalid dates, stable date/name ordering, no duplicate section membership, input immutability, and UTC date-only boundaries |
| `tests/unit/follow-up-completion.test.ts` | Completion ordering, revalidation, idempotent retries, stale/unauthorized result handling, clear failures, and activity-write warnings |
| `tests/unit/follow-up-notifications.test.ts` | Zero, singular, and plural due-today notification messages |
| `tests/unit/analytics.test.ts` | 7/30/90-day UTC ranges, complete-week boundaries, current metrics, status and niche grouping, daily/weekly saved/contacted aggregation, activity-event counts, empty intervals, and zero-lead percentages |
| `tests/unit/lead-filters.test.ts` | Filter defaults and enum validation, page clamping, active-filter detection, page size, LIKE-pattern escaping, humanized category matching, safe page fallback after deleting the last rows on a page |
| `tests/unit/lead-bulk.test.ts` | Page-scoped select/deselect and indeterminate state, selection pruning, empty/invalid/oversized ids, status validation, changed/unchanged/missing-row planning, status and follow-up summaries, partial failures, batched activity payloads, delete confirmation copy, full/partial/failed deletion results |
| `tests/unit/lead-save-result.test.ts` | RPC JSON result parsing, malformed/inconsistent result rejection, single-save messages, bulk partial-success counts |

The lead validation was extracted from `features/leads/actions.ts` into
`features/leads/validation.ts` so it can run without a Next.js request context.
The server action still performs authentication, authorization, and all writes;
the extraction did not change validation rules or persistence.

### Test import conventions

Unit tests import source files with explicit `.ts` extensions because Node runs
them directly without a bundler or path-alias resolver. Application code should
continue to use the existing `@/` imports. The tested modules only use
type-only imports across aliases, which Node erases at runtime.

`tsconfig.json` sets `allowImportingTsExtensions` so the same test files are
type-checked. `noEmit` remains enabled.

## 4. What requires database integration tests

These behaviors cannot be proven by the unit suite:

### Lead saving — `saveBusinessAsLead`

- Applying `docs/sql/save_lead_function.sql` creates the RPC and the narrow
  execution grants described in `docs/database.md`.
- Unauthenticated direct RPC calls are rejected.
- A new business is inserted once and never updated on a later save.
- An existing shared business keeps its original contact fields when another
  user saves it.
- Lead creation inserts one owned lead and revalidation runs.
- A second save is reported as “already in your leads” without duplicating data.
- An invalid input is rejected before any write.
- The function cannot be called by `anon` or `PUBLIC`.

### Bulk saving — `saveBusinessesAsLeads`

- Added / already-existing / failed counts match the resulting rows.
- Invalid inputs are counted as failures and valid items still save.
- Duplicate source IDs in one request collapse to one business.
- Chunk boundaries (50) do not double-count or lose rows.
- The 500-item request cap is enforced.
- A partial failure keeps saved rows saved and reports the remainder accurately.
- One user's leads are never visible to another user.

### My Leads list, drawer, status, notes, and follow-ups

- Filtered and paginated reads return only the signed-in user's leads.
- Search, category, status, follow-up, and sort combinations return the expected
  rows and accurate counts.
- The embedded business join returns the expected name and contact fields.
- Opening a lead loads only the signed-in user's lead, notes, and activities.
- A status update uses one of the real `lead_status` values and records an
  activity.
- A note is inserted with `kind = 'note'` and the authenticated owner.
- Follow-ups can be scheduled, changed, cleared, and completed; the latter two
  record the correct activity kind.
- Overdue, due-today, upcoming, and unscheduled dates render correctly.
- A user cannot read or mutate another user's lead, notes, or follow-ups.
- RLS blocks cross-user reads and writes at the database level.
- The `lead_stats` view reflects inserted leads.
- A saved lead is visibly present after the save action.
- Empty, query-failure, loading, and not-found states render without invented
  data.

### Dedicated Follow-ups queue

- A signed-in user's scheduled leads are returned with joined business and
  contact data; unscheduled leads are excluded.
- Overdue, today, and upcoming counts match date-only boundaries, no lead appears
  in two sections, and upcoming rows are ordered nearest first.
- The batched latest-note read returns only notes owned by the signed-in user; a
  note-query failure degrades to a visible warning without hiding the queue.
- Inline reschedule and completion actions persist the date change, record the
  correct activity, refresh sections/counts, and never change status implicitly.
- Completion clears the date only after the update succeeds.
- Completion is scoped to the expected date, so a stale request cannot clear a
  rescheduled follow-up; a repeated request does not append duplicate activity.
- Another user cannot read or mutate a follow-up by id.
- The drawer, inline controls, mobile wrapping, busy state, and error feedback
  require browser verification.
- The dashboard bell uses the signed-in user's UTC due-today count and links to
  Follow-ups; badge updates after mutations and the UTC date rollover require
  authenticated browser verification.

### Analytics

- The global 7/30/90-day selector changes both historical chart queries; 7/30
  days aggregate daily and 90 days aggregate into Monday-based UTC weeks with
  empty buckets.
- Saved events use lead creation timestamps; contacted values use recorded
  status-change activity rows targeting Contacted, never current status as a
  historical substitute.
- Outreach counts recorded Contacted/Interested status changes and completed
  follow-up activities in the selected date range; event counts are not
  unique-lead counts.
- Current status/niche counts use each owned lead once; empty categories and
  zero-lead percentages render safely.
- Owner scoping, activity-history completeness, URL selection, tooltips, legends,
  responsive chart rendering, and chart error/empty states require authenticated
  database and browser verification.

### Bulk My Leads actions

- Select-all checks only the current page; changing filters or pages prunes ids
  that are no longer visible.
- Bulk status updates validate the real enum and record one activity per changed
  lead, with no activity for rows already at that status.
- Bulk follow-up scheduling, rescheduling, and clearing update only owned rows
  and record the compatible activity kinds.
- Bulk deletion removes only the caller's leads, keeps shared businesses, and
  lets the existing activity/list-membership cascades do their documented work.
- A second user cannot select, update, or delete the first user's lead by id.
- Partial update/activity/delete failures return counts that match the final
  rows.
- Deleting the final rows on a page moves the list to a valid page and clears
  deleted ids from selection.
- Rapid repeated submissions do not create duplicate activities.
- The delete confirmation, selection toolbar, indeterminate header checkbox,
  mobile wrapping, and drawer refresh are browser-verified.

### Existing gaps also needing coverage later

- Search route validation and pagination edge cases.
- Overture/DuckDB queries and release-schema guard (network and native runtime).
- Browser interaction: business-result selection, select-all, filters, Load more
  persistence, and bulk-save states.
- Browser reload restoration: no automatic search, restored-results labelling,
  criteria-only fallback, expired/invalid snapshot handling, and Clear results
  leaving saved leads untouched.
- “Load more” continuation against real Overture data.

## 5. Safe Supabase test strategy

Do **not** run automated write tests against the hosted project
`qhihmtxsbyeoenqdtmai` or any production project. Use an isolated target.

### 5.1 Isolated environment

Preferred options, in order:

1. **Local Supabase stack** (`pnpm dlx supabase start`) with Docker.
2. A separate, dedicated Supabase project used only for tests.

The repository currently has no active migrations (`supabase/migrations/` is
empty); the archived baseline is documentation, not an applyable test schema.
Before integration tests can run, provision the isolated database deliberately:
create a fresh, reviewed baseline migration for the test stack or restore a
schema-only dump into the test project. Do not run `supabase db push` against
the hosted project and do not change its schema as part of test setup.

Test configuration must come from dedicated environment variables, for example:

```dotenv
SUPABASE_TEST_URL=
SUPABASE_TEST_PUBLISHABLE_KEY=
SUPABASE_TEST_SERVICE_ROLE_KEY=
```

Rules:

- Keep these in a git-ignored file or CI secret store.
- Never prefix the service-role key with `NEXT_PUBLIC_`.
- Never log or snapshot the keys.
- The test runner must refuse to run if the URL matches the production project
  reference or is not a known local/test URL.
- Point the app under test at `.env.test` only for the test process.

### 5.2 Test users and auth

- Create test users through the local Auth admin API or a local seed script.
- Use at least **two** users to test RLS isolation.
- Use per-run unique emails (for example `test+<run-id>-a@example.invalid`).
- Do not reuse real accounts, and never send test invites to real addresses.
- Clean up users at the end; deleting a user cascades their profiles and leads
  through the documented foreign keys.

### 5.3 Test data and cleanup

- Namespace generated businesses with `source = 'test'` and a unique
  `source_id` such as `<run-id>-<counter>`. Do not use `source = 'overture'`,
  because that would mix test records into real search data.
- Test one lead per user/business and a duplicate-save case.
- Cleanup order: leads → businesses → users. `leads.business_id` uses
  `on delete restrict`, so businesses cannot be deleted first.
- Run cleanup in `finally`/`afterEach`; do not rely on a passing test.
- Prefer per-test unique data over truncating tables. Never truncate or delete
  records the test did not create.
- If a test needs a failed write, use invalid input or a deliberately missing
  foreign key; do not corrupt shared tables to force an error.

### 5.4 Client boundaries in integration tests

- Use the **admin/service-role client only** for setup, cleanup, and
  cross-user assertions.
- Exercise app reads and writes through the authenticated user's client or the
  server action, not the admin client, so RLS is actually tested.
- Add explicit tests that:
  - an anonymous client cannot read or write leads or businesses;
  - user B cannot select user A's lead;
  - an authenticated client cannot insert or update a `businesses` row;
  - a client cannot set another user's `user_id`.

### 5.5 Running integration tests

Keep the default `pnpm test` offline and deterministic. Add a separate command
(for example `pnpm test:integration`) once the isolated environment exists. That
command must:

1. Verify the target is local/test and refuse production.
2. Apply the reviewed test schema.
3. Seed users and unique test businesses.
4. Run serially if the target is shared.
5. Clean up in `finally`.
6. Report skipped integration tests explicitly when the environment is absent,
   never silently pass.

The runner choice for that phase is intentionally deferred. The current
`node:test` setup can be reused, but importing Next server actions that use the
`@/` alias and `next/cache` may require a loader or HTTP-level testing. That
decision should be made with the isolated environment, not by adding a framework
now.

## 6. Known risks and limitations

- Unit tests prove pure logic only. They do **not** validate PostgREST,
  PostgreSQL constraints, RLS, auth, the SECURITY DEFINER function, or
  server-action behavior.
- The validation extraction keeps the existing message for over-length required
  fields: because the cleaner returns `undefined`, an over-length source ID or
  name is reported as “missing” rather than “invalid”. The test records this
  behavior; changing it is a product decision.
- Bulk save counts, duplicate handling, function privileges, and shared-business
  overwrite protection remain unverified against a live database.
- Bulk lead status, follow-up, delete, activity, ownership, and RLS behavior
  remain unverified against an authenticated database session. Only validation,
  planning, activity payloads, result messages, and pure selection logic are
  covered.
- No test currently covers `getCurrentUser`, the `UNAUTHENTICATED` path, route
  validation, DuckDB/Overture queries, or UI interactions.
- Node's native TypeScript support does not type-check; `pnpm typecheck` and the
  build remain required.
- Tests use concrete file lists in `package.json`; add new test files there when
  introducing them so they run on all platforms without shell glob expansion.
- My Leads reads, filters, pagination, status updates, notes, follow-ups,
  activities, bulk mutations, and deletion are implemented but remain unverified
  against a database. Only their pure mapping, filtering, validation, planning,
  and presentation logic are covered.
