# AGENTS.md — Reachly

## 1. Project Context

Reachly is a B2B prospecting and lightweight CRM SaaS.

Core workflow:
1. Search for businesses by niche and location.
2. Review available business information.
3. Save interesting businesses as personal leads.
4. Contact businesses externally.
5. Record notes, track lead status, and schedule follow-ups.

Tech stack:
- Next.js App Router
- React
- TypeScript
- Supabase (PostgreSQL and authentication)
- Overture Maps data queried using DuckDB and remote GeoParquet
- Tailwind CSS, following the existing project configuration

Read `PROJECT_BRIEF.md` and relevant files in `docs/` before substantial changes. Use the actual filenames and casing present in the repository.

## 2. Non-Negotiable Scope Rules

- Implement only what the current task requests. Do not expand scope without asking.
- Inspect relevant files first. Do not conduct a repository-wide audit for a focused task.
- Do not repeat work already completed or investigate unrelated infrastructure.
- Do not refactor working code, change architecture, or add dependencies unless necessary for the requested feature.
- Prefer the smallest complete implementation over generalized frameworks or abstractions.
- Do not create speculative folders, services, interfaces, utilities, or future features in advance.
- Do not use mocks, placeholders, or hard-coded results to pretend real functionality works.
- If blocked, explain the specific blocker and propose the smallest resolution.
- Ask for approval before destructive operations, hosted database changes, applying migrations, deployment changes, or unrelated scope expansion.
- Do not commit or push unless explicitly asked.
- At completion, briefly report what works, what remains unfinished, changed files, and checks actually performed.

### Current Implementation Status

- Supabase authentication includes sign-in, sign-up, password recovery, and session handling.
- Overture search, lead saving and management, follow-ups, lists, templates, settings, Overview, Analytics, and AI endpoints have implementations in this repository.
- Unit tests and local build checks do not verify hosted database authorization, email delivery, Overture runtime compatibility, or deployed-provider behavior; report those limits explicitly.
- The hosted Supabase database is the schema source of truth. There are no active schema migrations; do not apply or recreate schema as part of normal feature work.
- Some work remains, including multiple follow-ups per lead, editing saved business/contact fields, AI usage accounting, and production-host verification. Inspect the relevant feature and docs instead of assuming a page is a placeholder.

## 3. Before Making Changes

- Inspect relevant files, package scripts, dependencies, and Git status.
- Read relevant documentation before implementing a feature.
- Understand existing conventions before introducing new ones.
- Preserve working code, user changes, and the existing dashboard design.
- Do not overwrite user changes or perform destructive operations without approval.
- If the repository differs from the documentation, report the difference and update documentation when appropriate.

## 4. Architecture and Folder Responsibilities

Use the existing root-level `app/` directory. Do not introduce `src/` unless explicitly requested.

Follow the architecture described in `docs/architecture.md`.

- `app/`: Next.js pages, layouts, loading/error states, and API Route Handlers.
- `features/`: Feature-specific components, queries, actions, schemas, and types.
- `components/`: Shared, feature-agnostic UI components.
- `lib/supabase/`: Supabase client setup and database types.
- `lib/overture/`: Server-side DuckDB setup, business search, category mapping, and source normalization.
- `lib/ai/`: Shared server-side AI integrations when implemented.
- `hooks/`: Shared React hooks only.
- `types/`: Types genuinely shared across multiple features.
- `supabase/migrations/`: Active database migrations only.
- `tests/`: Automated tests.
- `docs/`: Product requirements, architecture, API contracts, setup, and roadmap.
- `mocks/`: Fixtures for intentional development or testing, never a substitute for production data.

Do not create every proposed folder in advance. Introduce files and abstractions when needed. Reuse existing shared UI components where available; do not assume a component directory exists without checking.

## 5. Feature Organization

Keep feature-specific code inside its corresponding `features/` directory.

For example, `features/leads/` may contain:
- `components/` for lead-related UI
- `actions.ts` for validated mutations
- `queries.ts` for lead reads
- `schemas.ts` for input validation
- `types.ts` for feature-specific types

Use the same principle for businesses, follow-ups, lists, analytics, templates, and other product areas.

Keep route files thin. Avoid putting complete business workflows inside pages or Route Handlers. Avoid unnecessary abstraction, duplicated implementations, and generic service layers that add no practical value.

## 6. Server and Client Boundaries

- Keep database access, privileged credentials, DuckDB operations, and AI provider secrets on the server.
- Never expose Supabase service-role credentials or other secrets to browser code.
- Use Server Components by default; add Client Components only when interactivity or browser APIs require them.
- Use Server Actions for appropriate mutations and Route Handlers for HTTP APIs or integrations.
- Validate all untrusted input on the server.
- Authenticate users and authorize every operation that accesses or modifies private data.
- Never trust a client-provided user ID to establish ownership.
- Use the existing Supabase authentication and Row Level Security (RLS) design consistently.
- Do not introduce Prisma or another database ORM without explicit agreement.

## 7. Business Search and Overture

- Keep Overture and DuckDB logic isolated inside `lib/overture/`.
- Perform business searches server-side.
- Validate search terms, category filters, geographic inputs, and pagination parameters.
- Normalize external records into stable application-level TypeScript types.
- Treat optional contact details as nullable; never fabricate missing phone numbers, websites, or emails.
- Do not bulk-import or persist every search result.
- Persist a business record when required by the agreed save-lead workflow.
- Store user-specific notes, statuses, follow-ups, and activities in the application's database.
- Keep Overture release versions, source schemas, and category mappings explicit.
- Do not silently change the data release or query schema.
- Verify DuckDB compatibility, memory usage, query duration, pagination, and deployment-runtime limitations when relevant to the task.
- Never claim search performance or deployment compatibility without testing it.

Refer to `docs/overture_search.md` for implementation details.

## 8. Database and Data Integrity

- The existing hosted Supabase database is the schema source of truth. Inspect its existing generated types, documented schema, and RLS policies before implementing database access.
- Use the existing schema for normal feature work; do not recreate it or add an initial-schema migration as a substitute for inspecting it.
- The archived schema baseline is documentation/history, not an active migration. Do not move it back into the active migrations directory or apply it.
- A genuine schema change may require a migration. Explain the need and proposed change first, and get explicit approval before applying migrations or changing the hosted database.
- Never run `supabase db push` or alter the hosted database without explicit approval.
- Enforce user isolation through authorization checks and RLS where applicable.
- Prevent duplicate lead creation according to the agreed uniqueness rules.
- Keep lead updates, activities, and follow-ups consistent.
- Do not silently introduce columns, tables, or relationships that conflict with the existing schema.
- Never apply destructive migrations or delete production data without explicit approval.
- Regenerate or update database types when an approved schema change requires it, using the project's established workflow.

Refer to `docs/database.md` for the database workflow.

## 9. UI and Design

- Treat the user's latest approved dashboard design as the visual source of truth.
- Preserve established design tokens, spacing, typography, colors, and component patterns.
- Reuse existing shared components where appropriate; keep feature-specific components inside their feature directory.
- Avoid unnecessary dependencies and excessive visual effects.
- Do not replace the dashboard design or redesign unrelated pages without being asked.
- Provide appropriate loading, empty, error, and success states.
- Ensure forms, tables, filters, and navigation work correctly on supported screen sizes.
- Avoid browser alerts for ordinary application feedback; use the project's notification or inline feedback patterns.

## 10. Types, Validation, and Errors

- Use TypeScript types that reflect real data contracts.
- Avoid `any` unless justified and isolated.
- Keep API request and response shapes consistent with `docs/API.md`.
- Use the project's established validation library and patterns.
- Return useful, consistent errors without exposing secrets or internal stack traces.
- Handle missing data, unauthorized access, external service failures, and invalid inputs explicitly.
- Do not hide failures behind fake fallback data.

## 11. Testing and Quality

- Inspect available scripts before choosing commands.
- Run relevant linting, type checks, and tests after changes when appropriate.
- Test important business logic, authorization, data isolation, duplicate prevention, and failure cases when relevant.
- Test Overture searches with representative niches and locations when changing search behavior.
- Use mocks only for intentional development or testing scenarios.
- Never report a test as passed unless it was actually run and passed.
- Clearly state when tests could not be run.

## 12. Scope and Implementation Order

Prioritize the core workflow:
1. Project setup and architecture.
2. Supabase schema, authentication, and access control.
3. Overture business search.
4. Search UI connected to the real API.
5. Save lead and display personal leads.
6. Lead details, notes, and status updates.
7. Follow-ups.
8. Overview metrics and analytics based on real data.
9. Lists, templates, and settings.
10. AI-assisted features.

Do not implement AI features before the core prospecting and CRM workflow works unless explicitly requested.

Do not build the entire application in one large change. Prefer small, reviewable, testable increments.

## 13. Documentation and Completion Reports

- Update relevant documentation when implementation changes architecture, API contracts, schema, setup, or behavior.
- Distinguish implemented functionality from UI-only, hard-coded, proposed, unverified, and TODO work.
- Never describe mock data as a live integration.
- Do not claim a feature is complete merely because its page renders.

At the end of a task, report:
1. What changed.
2. Which files were affected.
3. Tests and checks performed, including failures.
4. Remaining work, assumptions, and risks.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
