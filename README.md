# Reachly

B2B business prospecting and lightweight CRM.

Find businesses by niche and location, save them as personal leads, record
notes and statuses, and schedule follow-ups — all in one place.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS 4
- Supabase (PostgreSQL, Auth, Row Level Security)
- Overture Maps queried with DuckDB over remote GeoParquet *(not implemented yet)*

## Getting started

```bash
pnpm install
cp .env.example .env   # then fill in your Supabase project values
pnpm dlx supabase db push   # after linking the project — see docs/development.md
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `pnpm dev` – start the development server
- `pnpm build` – production build (also runs the type check)
- `pnpm start` – serve the production build
- `pnpm lint` – run ESLint

## Documentation

| Document | Contents |
|---|---|
| `PROJECT_BRIEF.md` | Product overview, feature status, MVP phases |
| `docs/architecture.md` | Components, search and save-lead flows, folder structure |
| `docs/api.md` | Proposed API contracts and error format |
| `docs/database.md` | Applied schema, constraints, and RLS policies |
| `docs/overture_search.md` | Overture/DuckDB search design and test matrix |
| `docs/roadmap.md` | Phased delivery plan |
| `docs/development.md` | Local setup, Supabase CLI, and auth flow |
| `AGENTS.md` | Instructions for coding agents working in this repo |

## Status

Implemented: authenticated dashboard, live Overture business search, lead
persistence and management, a date-based follow-up queue, and a conversational
AI sales assistant that can analyze recent leads and help plan next steps.
AI chat requires per-discussion context consent and a server-side Groq API key;
see `docs/development.md`.

Lists, templates, settings persistence, and full Analytics remain unfinished.
The AI assistant does not create leads, modify data, or generate arbitrary SQL.

See `PROJECT_BRIEF.md` §11 and `docs/roadmap.md` for the authoritative status.
