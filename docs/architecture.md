# Reachly — System Architecture

## 1. Status

This document describes the proposed architecture. Verify all implementation details against the repository before making changes.

## 2. Technology

- Next.js App Router and TypeScript.
- React for the user interface.
- Supabase PostgreSQL for persistent data.
- Supabase Auth for authentication.
- Overture Maps as the business discovery source.
- DuckDB for querying cloud-hosted GeoParquet data.

Hosting and runtime compatibility remain to be validated.

## 3. Main Components

### Frontend

Responsibilities:
- Render dashboard pages and reusable UI components.
- Collect search criteria and lead updates.
- Display loading, empty, success, and error states.
- Call application endpoints.
- Avoid direct access to Overture datasets.

### Search Service

Responsibilities:
- Validate search criteria.
- Resolve the requested location.
- Map the requested niche to supported Overture categories.
- Execute DuckDB queries.
- Normalize results.
- Apply result limits and pagination.
- Return consistent API responses.

Search runs server-side in `lib/overture/` (`query.ts`, `categories.ts`, `normalize.ts`) and is exposed only through `POST /api/businesses/search` (`app/api/businesses/search/route.ts`). That route is the single canonical search endpoint; there is no `/api/search`.

Implementation status (verified):
- Pinned Overture release: `2026-10-21.0`, using `taxonomy.primary`. The previously planned `2026-08-19.0` is no longer published and the September 2026 schema removed `categories`; no runtime fallback exists, and a schema check fails loudly on mismatch.
- `duckdb-async` is loaded at runtime with `createRequire` and listed in `serverExternalPackages`, because Turbopack cannot trace the native `duckdb` package.
- One in-memory DuckDB database is shared per process, each search gets its own connection, and searches are serialized. A 120-second application timeout does not guarantee hosting-platform support.
- Result limit is 50 (`nextCursor` is always `null`; pagination is not implemented).

Search should run server-side. The implementation must be tested against the selected hosting runtime; only a local Node process has been verified.

### Lead Management Service

Responsibilities:
- Verify the authenticated user.
- Upsert or resolve the appropriate business record.
- Create a lead for the user.
- Prevent duplicate leads.
- Update lead status and contact information.
- Record notes and relevant activities.
- Schedule and complete follow-ups.

Operations that require multiple database writes should be designed to avoid partially completed updates.

### Supabase

Responsibilities:
- Store businesses selected for persistence.
- Store user-specific leads and activity.
- Store profiles, settings, lists, and templates as those features are implemented.
- Enforce access boundaries with RLS.
- Provide authentication.

## 4. Business Search Flow

1. The user submits a niche and location.
2. The frontend calls a server endpoint.
3. The server validates the input.
4. The search service resolves geography and category mappings.
5. DuckDB queries the selected Overture release.
6. Results are normalized into the application's business type.
7. The endpoint returns a limited result set.
8. The dashboard displays the results.
9. The user may choose to save a business as a lead.

Search results should not automatically be inserted into Supabase.

## 5. Save Lead Flow

1. The authenticated user selects Save lead.
2. The server verifies authentication and validates the submitted business identifier and data.
3. The server validates the submitted business payload again and derives ownership
   from the authenticated session (`auth.uid()` in the database function).
4. The server calls `public.save_businesses_as_leads` with the authenticated
   Supabase client. The function is proposed in
   `docs/sql/save_lead_function.sql` and must be applied manually in the
   Supabase SQL Editor; it is not part of the active migration history.
5. The function inserts a shared business only if its `(source, source_id)` does
   not exist. It never updates an existing shared business record, then creates
   the user's lead using the existing `unique (user_id, business_id)` rule.
6. The function returns counts for added, existing, and failed items. The UI
   updates only after the operation succeeds or returns an accurate result.

The RPC is a hardened `SECURITY DEFINER` function with an empty fixed
`search_path`, fully qualified object names, and execution granted only to
`authenticated`. It replaces the previous service-role write path for saving.
It does not prove that a new business payload originated from Overture; that
trust limitation remains documented in `docs/database.md`.

## 6. Lead Management Flow

- My Leads queries the authenticated user's leads.
- Filtered and paginated list reads go through read-only Server Actions; the list
  does not navigate away for search, filter, sort, or page changes.
- The detail drawer reads one owned lead plus its 50 most recent activity rows.
- Lead changes are validated on the server.
- Notes and activities are associated with the correct lead and user.
- Follow-ups use the existing single `next_follow_up_date` date per lead; there is
  no separate follow-up table or parallel task system.
- Overview and analytics use persisted data rather than hard-coded values.

## 7. Proposed Code Organization

Adapt this structure to the existing repository rather than creating unnecessary layers.

- `app/`: routes, layouts, pages, and server endpoints.
- `components/`: shared UI and feature components.
- `lib/`: shared utilities and integrations.
- `lib/supabase/`: Supabase client setup for server and browser contexts, as needed.
- `lib/overture/`: DuckDB setup, query logic, category mapping, and result normalization.
- `lib/validations/`: reusable input validation schemas, if a validation library is adopted.
- `types/`: shared domain and API types.
- `supabase/migrations/`: tracked database migrations.
- `docs/`: project documentation.

Avoid introducing repositories, factories, or service layers everywhere unless the complexity justifies them.

## 8. Security Boundaries

- Keep DuckDB and Overture access server-side.
- Enforce user ownership on lead operations.
- Use RLS for user-specific Supabase data.
- Never expose privileged database keys to the browser.
- Do not trust user IDs supplied by the client.
- Validate all incoming API requests.
- Limit search resource consumption and prevent unbounded queries.

## 9. Deployment Risks

DuckDB and remote GeoParquet queries may have runtime, memory, cold-start, concurrency, and timeout constraints.

Before production deployment, verify:
- Runtime compatibility.
- Remote file access and network requirements.
- Memory and execution limits.
- Query latency under realistic conditions.
- Concurrent search behavior.
- Maximum result sizes and timeout handling.

Do not assume local success proves production compatibility.

## 10. Architecture Decision Rule

Prefer the simplest design that supports the core workflow. Revisit the architecture only when measured performance, security, maintainability, or product requirements justify a change.


## Project Folder Structure


reachly/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── find-businesses/page.tsx
│   │   ├── my-leads/
│   │   │   ├── page.tsx
│   │   │   └── [leadId]/page.tsx
│   │   ├── follow-ups/page.tsx
│   │   ├── lists/
│   │   │   ├── page.tsx
│   │   │   └── [listId]/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── templates/page.tsx
│   │   ├── ai-assistant/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── businesses/
│   │   │   └── search/route.ts
│   │   ├── leads/route.ts
│   │   └── ai/
│   │       ├── qualify/route.ts
│   │       └── draft/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── not-found.tsx
│
├── features/
│   ├── overview/
│   │   ├── components/
│   │   └── queries.ts
│   ├── businesses/
│   │   ├── components/
│   │   ├── schemas.ts
│   │   └── actions.ts
│   ├── leads/
│   │   ├── components/
│   │   ├── actions.ts
│   │   ├── queries.ts
│   │   ├── schemas.ts
│   │   └── types.ts
│   ├── follow-ups/
│   ├── lists/
│   ├── analytics/
│   ├── templates/
│   ├── ai/
│   │   ├── components/
│   │   ├── prompts.ts
│   │   └── scoring.ts
│   └── settings/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── data/
│   └── charts/
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── database.types.ts
│   ├── overture/
│   │   ├── client.ts
│   │   ├── search.ts
│   │   ├── categories.ts
│   │   └── normalize.ts
│   ├── auth/
│   ├── ai/
│   ├── env.ts
│   ├── utils.ts
│   └── constants.ts
│
├── hooks/              # Only shared hooks
├── types/              # Only genuinely global types
├── mocks/              # Temporary development fixtures
├── tests/
├── public/
├── supabase/
│   └── migrations/
├── docs/
├── AGENTS.md
├── PROJECT_BRIEF.md
├── .env.example
├── next.config.ts
├── tsconfig.json
└── package.json
