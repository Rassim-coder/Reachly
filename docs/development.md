p# Reachly — Development Setup

## 1. Prerequisites

- Node.js 20+ (developed against Node 24)
- pnpm 11 (`package.json` pins `packageManager`)
- A Supabase project (hosted is enough; the local Docker stack is optional)
- Docker Desktop — only if you want `supabase start` locally

## 2. Install

```bash
pnpm install
```

## 3. Environment variables

Copy `.env.example` to `.env` and fill it in from
Supabase Dashboard → Project Settings → API:

| Variable                               | Scope           | Notes                                                                                                                                                                                                                                                                 |
| -------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | client + server | Project URL                                                                                                                                                                                                                                                           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client + server | Publishable key; safe in the browser, RLS enforces access                                                                                                                                                                                                             |
| `NEXT_PUBLIC_SITE_URL`                 | server          | Canonical site URL; preferred over request Origin for auth redirects                                                                                                                                                                                                  |
| `SUPABASE_SERVICE_ROLE_KEY`            | **server only** | Optional for other privileged server operations. Not required by the current lead-saving path, which uses the authenticated `save_businesses_as_leads` RPC. Never prefix with `NEXT_PUBLIC_`. `lib/supabase/admin.ts` remains available but is unused by lead saving. |

`.env` is git-ignored; `.env.example` is committed.

AI Assistant requires a GroqCloud API key in `GROQ_API_KEY`. Keep it
server-only; do not use a `NEXT_PUBLIC_` prefix. `GROQ_MODEL` optionally
overrides the model ID (default: `openai/gpt-oss-20b`). At the beginning of
each discussion, the user confirms once that the current chat, target
niches/cities, default location, and up to 100 recent leads (business name,
category, city, status, and dates) may be sent to Groq. That consent is
remembered for the discussion and restored after reloading the same tab.
Starting a new chat asks again. Notes and contact details are excluded. Chat
history is stored in the current browser tab's `sessionStorage`, not Supabase.

## 4. Supabase CLI

The CLI is not installed as a dependency. Run it through pnpm:

```bash
pnpm dlx supabase --version
```

`supabase/config.toml` already exists (`supabase init` has been run), so
commands can be run from the repository root.

### Link to the hosted project

```bash
pnpm dlx supabase login
pnpm dlx supabase link --project-ref <project-ref>
```

Find `<project-ref>` in the Supabase dashboard URL
(`https://supabase.com/dashboard/project/<project-ref>`).

### Database schema

The hosted Supabase project is the source of truth. The database already has
the required tables, enums, RLS policies, triggers, indexes, and the
`lead_stats` view, so **do not run migrations against it unless you are
declaring a brand-new schema change**.

To refresh `lib/supabase/database.types.ts` from the hosted schema:

```bash
pnpm dlx supabase gen types typescript --project-id <project-ref> --schema public \
  > lib/supabase/database.types.ts
```

Find `<project-ref>` in the Supabase dashboard URL
(`https://supabase.com/dashboard/project/<project-ref>`). This command is
read-only and does not modify the database.

If you later need to make a deliberate schema change, create a new migration
in `supabase/migrations/` and apply it with `pnpm dlx supabase db push` after
reviewing it against the hosted project.

### Optional: full local stack

Requires Docker Desktop:

```bash
pnpm dlx supabase start   # runs Postgres, Auth, Studio, etc. locally
pnpm dlx supabase db reset
```

When running the local stack, use the local API URL and keys printed by
`supabase start` in `.env` instead of the hosted project values.

## 5. Run the app

```bash
pnpm dev        # http://localhost:3000
pnpm build      # production build (also runs the type check)
pnpm start      # serve the production build
pnpm lint       # ESLint
pnpm typecheck  # tsc --noEmit
pnpm test       # unit tests (offline; no database required)
```

See `docs/testing.md` for unit coverage, integration-test candidates, and the
safe Supabase test-environment strategy.

## 6. Authentication flow

- `proxy.ts` (Next.js 16's replacement for `middleware.ts`) refreshes the
  Supabase session cookie on every request via `lib/supabase/session.ts`.
- `app/(dashboard)/layout.tsx` enforces authentication and redirects to
  `/login`; `app/(auth)/layout.tsx` bounces signed-in users to `/overview`.
- `/` (`app/(marketing)/page.tsx`) is the public marketing homepage. Signed-in
  visitors are sent to `/overview`. Get started opens `/login?mode=signup`;
  Sign in opens `/login`.
- `lib/supabase/{client,server}.ts` provide the browser and server clients.
  Server code always creates a new client per request.
- Login and sign-up are Server Actions in `lib/auth/actions.ts`.
- `/login` (`app/(auth)/login/login-screen.tsx`) submits the form to those
  actions through `useActionState`; client-side validation blocks invalid
  submits, and server/authentication errors render in an inline banner.
- Sign-up passes the full name as `full_name` metadata, which the
  `handle_new_user` trigger copies into `profiles.full_name`.
- Password reset is not implemented yet: the "Forgot password?" control only
  shows an informational banner and sends no email. "Remember me" does not
  change the session cookie lifetime.
- `/auth/callback` exchanges the email-confirmation code for a session.

Auth routes are marked `export const instant = false` so Next.js 16 cache
components lets them block on cookies instead of prerendering.

## 7. Project structure

```
app/            routes, layouts, and API route handlers
features/       feature-specific components, queries, actions, schemas
components/     shared UI (ui/), layout chrome (layout/), data/ and charts/
lib/            supabase/, overture/, auth/, ai/ and shared utilities
hooks/          shared React hooks only
types/          types genuinely shared across features
supabase/       config.toml and migrations/
docs/           product, architecture, API, database, roadmap
```

Empty directories are held with a `.gitkeep` until they contain real code.

## 8. Current status

Implemented: repository structure, Supabase client/auth wiring, initial schema
migration, dashboard shell with auth guard, Overture business search with
reload-safe temporary result restoration, saving businesses as leads, and My
Leads with filters, pagination, a detail drawer, status updates, notes, activity
history, follow-up dates, page-scoped row selection, bulk status/follow-up
changes, and authorized bulk deletion.

Not implemented: a dedicated Follow-ups queue, lists, templates, settings
persistence, analytics, and AI. The remaining placeholder pages state this
explicitly and render no mock data.

See `PROJECT_BRIEF.md` §11 and `docs/roadmap.md` for the authoritative status.
