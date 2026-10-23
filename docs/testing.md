# Reachly — Testing

## 1. Current status

Unit tests exist for pure business-search and lead-validation logic.

- **No database integration tests are configured.**
- **No Supabase test project or local test environment is configured.**
- The local `.env` does not contain `SUPABASE_SERVICE_ROLE_KEY`, so lead-saving
  persistence cannot currently be exercised end to end.
- My Leads is still a placeholder page, so there is no page-level query to test.

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
| `tests/unit/cursor.test.ts` | Cursor round-trip, URL-safe encoding, release/version rejection, malformed payloads, bbox shape and ranges, category and keyset-ID validation, size limit, strict output shape |
| `tests/unit/normalize.test.ts` | Overture row → API mapping, trimming, nullable contact fields, zero/negative coordinates, non-finite coordinates, blank name/id rejection, batch filtering |
| `tests/unit/lead-validation.test.ts` | Required source ID/name, length limits, optional text fields, latitude/longitude bounds, non-string/non-finite values, bulk deduplication and invalid counts, database row mapping |

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

- Unauthenticated caller receives the sign-in error.
- Missing service-role configuration returns the configuration error without a
  write.
- `businesses` upsert is idempotent on `unique (source, source_id)`.
- Lead creation inserts one owned lead and revalidation runs.
- A second save hits `unique (user_id, business_id)`, returns `23505`, and is
  reported as “already in your leads” without duplicating data.
- An invalid input is rejected before any write.
- Service-role credentials are used only server-side; clients cannot insert
  shared business rows or another user's lead.

### Bulk saving — `saveBusinessesAsLeads`

- Added / already-existing / failed counts match the resulting rows.
- Invalid inputs are counted as failures and valid items still save.
- Duplicate source IDs in one request collapse to one business.
- Chunk boundaries (50) do not double-count or lose rows.
- The 500-item request cap is enforced.
- A partial failure keeps saved rows saved and reports the remainder accurately.
- One user's leads are never visible to another user.

### My Leads (when implemented)

- Reads return only the signed-in user's leads.
- Ordering, filters, and pagination follow the agreed contract.
- The `lead_stats` view reflects inserted leads.
- RLS blocks cross-user reads and writes at the database level.
- A saved lead is visibly present after the save action.

### Existing gaps also needing coverage later

- Search route validation and pagination edge cases.
- Overture/DuckDB queries and release-schema guard (network and native runtime).
- Browser interaction: selection, select-all, filters, Load more persistence,
  bulk-save states.
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
  PostgreSQL constraints, RLS, auth, or server-action behavior.
- The validation extraction is behavior-preserving, including the existing
  message for over-length required fields: because the cleaner returns
  `undefined`, an over-length source ID or name is reported as “missing” rather
  than “invalid”. The test records this behavior; changing it is a product
  decision.
- Bulk save counts, duplicate handling, and service-role configuration remain
  unverified against a live database.
- No test currently covers `getCurrentUser`, the `UNAUTHENTICATED` path, route
  validation, DuckDB/Overture queries, or UI interactions.
- Node's native TypeScript support does not type-check; `pnpm typecheck` and the
  build remain required.
- Tests use concrete file lists in `package.json`; add new test files there when
  introducing them so they run on all platforms without shell glob expansion.
- My Leads does not exist yet, so none of its query or display behavior can be
  tested.
