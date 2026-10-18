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

Read `PROJECT_BRIEF.md` and the relevant documentation in `docs/` before implementing substantial changes.

## 2. Before Making Changes

- Inspect the existing files, package scripts, dependencies, and Git status.
- Read relevant documentation before implementing a feature.
- Understand existing conventions before introducing new ones.
- Preserve working code and the existing dashboard design.
- Do not overwrite user changes or perform destructive operations without approval.
- If the repository differs from the documentation, report the difference and update the documentation when appropriate.

## 3. Architecture and Folder Responsibilities

Use the existing root-level `app/` directory. Do not introduce `src/` unless explicitly requested.

Follow the target architecture described in `docs/ARCHITECTURE.md`.

- `app/`: Next.js pages, layouts, loading/error states, and API Route Handlers.
- `features/`: Feature-specific components, queries, actions, schemas, and types.
- `components/`: Shared, feature-agnostic UI components.
- `lib/supabase/`: Supabase client setup and database types.
- `lib/overture/`: Server-side DuckDB setup, business search, category mapping, and source normalization.
- `lib/ai/`: Shared server-side AI integrations when implemented.
- `hooks/`: Shared React hooks only.
- `types/`: Types genuinely shared across multiple features.
- `supabase/migrations/`: Database migrations.
- `tests/`: Automated tests.
- `docs/`: Product requirements, architecture, API contracts, setup, and roadmap.
- `mocks/`: Temporary development fixtures, never a substitute for production data.

Do not create every proposed folder in advance. Introduce files and abstractions when they are needed.

## 4. Feature Organization

Keep feature-specific code inside its corresponding `features/` directory.

For example, `features/leads/` may contain:
- `components/` for lead-related UI
- `actions.ts` for validated mutations
- `queries.ts` for lead reads
- `schemas.ts` for input validation
- `types.ts` for feature-specific types

Use the same principle for businesses, follow-ups, lists, analytics, templates, and other product areas.

Keep route files thin. Avoid putting complete business workflows inside pages or Route Handlers.

Avoid unnecessary abstraction, duplicated implementations, and generic service layers that add no practical value.

## 5. Server and Client Boundaries

- Keep database access, privileged credentials, DuckDB operations, and AI provider secrets on the server.
- Never expose Supabase service-role credentials or other secrets to browser code.
- Use Server Components by default; add Client Components only when interactivity or browser APIs require them.
- Use Server Actions for appropriate mutations and Route Handlers for HTTP APIs or integrations.
- Validate all untrusted input on the server.
- Authenticate users and authorize every operation that accesses or modifies their private data.
- Never trust a client-provided user ID to establish ownership.
- Use the existing Supabase authentication and Row Level Security design consistently.
- Do not introduce Prisma or another database ORM without explicit agreement.

## 6. Business Search and Overture

- Keep Overture and DuckDB logic isolated inside `lib/overture/`.
- Perform business searches server-side.
- Validate search terms, category filters, geographic inputs, and pagination parameters.
- Normalize external records into stable application-level TypeScript types.
- Treat optional contact details as nullable; do not fabricate missing phone numbers, websites, or emails.
- Do not bulk-import or persist every search result.
- Persist a business record when required by the agreed save-lead workflow.
- Store user-specific notes, statuses, follow-ups, and activities in the application's database.
- Keep Overture release versions, source schemas, and category mappings explicit.
- Do not silently change the data release or query schema.
- Verify DuckDB compatibility, memory usage, query duration, pagination, and deployment-runtime limitations.
- Never claim search performance or deployment compatibility without testing it.

Refer to `docs/OVERTURE_SEARCH.md` for implementation details.

## 7. Database and Data Integrity

- Follow the agreed schema in `docs/DATABASE.md` and the actual applied migrations.
- Use migrations for database schema changes.
- Enforce user isolation through authorization checks and Row Level Security where applicable.
- Prevent duplicate lead creation according to the agreed uniqueness rules.
- Keep lead updates, activities, and follow-ups consistent.
- Do not silently introduce columns, tables, or relationships that conflict with the documented schema.
- Never apply destructive migrations or delete production data without explicit approval.
- Regenerate or update database types when the schema changes, using the project's established workflow.

## 8. UI and Design

- Treat the user's latest approved dashboard design as the visual source of truth.
- Preserve the established design tokens, spacing, typography, colors, and component patterns.
- Reuse shared components from `components/ui/` where appropriate.
- Keep feature-specific components inside their feature directory.
- Avoid unnecessary dependencies and excessive visual effects.
- Do not replace the dashboard design or redesign unrelated pages without being asked.
- Provide appropriate loading, empty, error, and success states.
- Ensure forms, tables, filters, and navigation work correctly on supported screen sizes.
- Avoid browser alerts for ordinary application feedback; use the project's notification or inline feedback patterns.

## 9. Types, Validation, and Errors

- Use TypeScript types that reflect real data contracts.
- Avoid `any` unless justified and isolated.
- Keep API request and response shapes consistent with `docs/API.md`.
- Use the project's established validation library and patterns.
- Return useful, consistent errors without exposing secrets or internal stack traces.
- Handle missing data, unauthorized access, external service failures, and invalid inputs explicitly.
- Do not hide failures behind fake fallback data.

## 10. Testing and Quality

- Inspect available scripts before choosing commands.
- Run relevant linting, type checks, and tests after changes when available.
- Test important business logic, authorization, data isolation, duplicate prevention, and failure cases.
- Test Overture searches with representative niches and locations.
- Use mocks only for intentional development or testing scenarios.
- Never report a test as passed unless it was actually run and passed.
- Clearly state when tests could not be run.

## 11. Scope and Implementation Order

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

Do not build an entire application in one large change. Prefer small, reviewable, testable increments.

## 12. Documentation and Completion Reports

- Update relevant documentation when implementation changes architecture, API contracts, schema, setup, or behavior.
- Distinguish implemented functionality from UI-only, hard-coded, proposed, unverified, and TODO work.
- Never describe mock data as live integration.
- Do not claim a feature is complete merely because its page renders.

At the end of a task, report:
1. What changed.
2. Which files were affected.
3. Tests and checks performed, including failures.
4. Remaining work, assumptions, and risks.