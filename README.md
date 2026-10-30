# Reachly

B2B business prospecting and lightweight CRM.

Find businesses by niche and location, save them as personal leads, record
notes and statuses, and schedule follow-ups — all in one place.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS 4
- Supabase (PostgreSQL, Auth, Row Level Security)
- Overture Maps queried server-side with DuckDB over remote GeoParquet (implemented; production-host compatibility still needs verification)

## Getting started

```bash
pnpm install
cp .env.example .env   # fill in Supabase values; add GROQ_API_KEY to enable AI
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `pnpm dev` – start the development server
- `pnpm build` – production build (also runs the type check)
- `pnpm start` – serve the production build
- `pnpm lint` – run ESLint
- `pnpm typecheck` – run TypeScript validation
- `pnpm test` – run offline unit tests

## Documentation

| Document | Contents |
|---|---|
| `PROJECT_BRIEF.md` | Product overview, feature status, MVP phases |
| `docs/architecture.md` | Components, search and save-lead flows, folder structure |
| `docs/API.md` | Implemented and proposed API contracts and error format |
| `docs/database.md` | Applied schema, constraints, and RLS policies |
| `docs/overture_search.md` | Overture/DuckDB search design and test matrix |
| `docs/roadmap.md` | Phased delivery plan |
| `docs/development.md` | Local setup, Supabase CLI, and auth flow |
| `AGENTS.md` | Instructions for coding agents working in this repo |

## Status

Implemented in the repository: authenticated search, lead management, notes,
follow-ups, lists, templates, settings persistence, Overview, Analytics, and the
read-only AI sales assistant. AI features require a server-side `GROQ_API_KEY`;
chat also requires per-discussion context consent. See `docs/development.md`.

Automated tests are unit-level. Hosted RLS isolation, complete authenticated
workflows, email delivery, and Overture/DuckDB compatibility on the production
host have not been verified. The AI assistant cannot modify CRM data or run SQL.

See `PROJECT_BRIEF.md` §11 and `docs/roadmap.md` for the authoritative status.
