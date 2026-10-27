# Reachly — Database Schema

## 1. Status

**The hosted Supabase project is the source of truth.**

This document describes the schema as it exists in the hosted database. The
file `supabase/migrations/20261019000000_init_schema.sql` is an inactive
historical baseline; it is not applied to the hosted project and is not part of
the active development workflow. See the proposal in the completion report for
how to remove it safely.

`lib/supabase/database.types.ts` is generated directly from the hosted schema
(`pnpm dlx supabase gen types typescript --project-id <ref> --schema public`).
If this document and the generated types disagree, the generated types are the
source of truth.

## 2. Tables

| Table | Purpose | Owner |
|---|---|---|
| `profiles` | User profile, workspace defaults, ICP preferences | Single user (`id`) |
| `businesses` | Normalized business records from the discovery source | Shared reference data |
| `leads` | A user's saved business, status, and follow-up date | `user_id` |
| `lead_activities` | Notes and lead activity history | `user_id` |
| `lists` | Optional user-created lead lists | `user_id` |
| `list_leads` | Association between leads and lists | List owner |
| `message_templates` | Reusable outreach templates | `user_id` |

### 2.1 Enumerated types

| Enum | Members (in database order) |
|---|---|
| `lead_status` | `new`, `to_contact`, `contacted`, `interested`, `not_interested`, `follow_up` |
| `activity_kind` | `saved`, `note`, `status_change`, `follow_up_scheduled`, `follow_up_completed`, `follow_up_cleared` |
| `template_channel` | `whatsapp`, `email`, `call_script` |

The member *order* affects `ORDER BY` on the column. The order above matches
the hosted project as of 2026-10-20.

⚠ `lead_status` has **no `replied`, `won`, or `lost`** value. `PROJECT_BRIEF.md`
describes a "Replied" filter chip and a "deals won" metric that this enum cannot
express. Either the brief or the enum needs to change — see §7.

⚠ `template_channel` has no plain `call` value; the hosted project uses
`call_script` instead. The "Call script" template in `PROJECT_BRIEF.md` should
use `channel = 'call_script'`.

### 2.2 `profiles`

Created for every new `auth.users` row by the `handle_new_user()` trigger
(security definer, `on conflict (id) do nothing`).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | References `auth.users (id)`, cascade delete |
| `full_name` | `text` | Not null, default `''` |
| `workspace_name` | `text` | Not null, default `'Personal workspace'` |
| `default_search_location` | `text` | Not null, default `''` |
| `default_lead_status` | `lead_status` | Not null, default `'new'` |
| `auto_follow_up` | `boolean` | Not null, default `true` |
| `icp_niches` | `text[]` | Not null, default `{}` |
| `icp_cities` | `text[]` | Not null, default `{}` |
| `created_at`, `updated_at` | `timestamptz` | `updated_at` maintained by trigger |

### 2.3 `businesses`

Shared reference data. Records are persisted **only** when a user explicitly saves a search result as a lead — individually or through an explicit bulk selection. Search results are never imported into `businesses` wholesale, and discovery happens via Overture rather than by reading the `businesses` table, so the table is readable only for business records a user has already saved as a lead.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `source` | `text` | Not null, default `'overture'` |
| `source_id` | `text` | Stable identifier from the source |
| `name` | `text` | Not null |
| `category` | `text` | Nullable |
| `address` | `text` | Nullable |
| `city` | `text` | Nullable |
| `latitude`, `longitude` | `double precision` | Nullable; checked to `[-90, 90]` / `[-180, 180]` |
| `phone`, `website`, `email` | `text` | Nullable — never fabricated |
| `created_at`, `updated_at` | `timestamptz` | |

Constraints and indexes:

- `unique (source, source_id)` — the canonical business identity used by the
  lead-saving function to avoid duplicate records without updating existing ones.
- `businesses_category_idx`, `businesses_city_idx`, `businesses_name_trgm_idx`
  support search and filtering.

### 2.4 `leads`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | Not null, default `auth.uid()`, references `auth.users`, cascade delete |
| `business_id` | `uuid` | Not null, references `businesses (id)`, `on delete restrict` |
| `status` | `lead_status` | Not null, default `'new'` |
| `last_contacted_at` | `timestamptz` | Nullable |
| `next_follow_up_date` | `date` | Nullable — drives the follow-up queue |
| `created_at`, `updated_at` | `timestamptz` | |

Constraints and indexes:

- **`unique (user_id, business_id)`** — one lead per user per business; this is
  the duplicate-prevention rule. The lead-saving function inserts with
  `on conflict do nothing` on this key.
- `unique (id, user_id)` — redundant with the primary key; required as the
  target of the composite ownership foreign keys on `lead_activities` and
  `list_leads`.
- Indexes on `(user_id, created_at desc)`, `business_id`, `(user_id, status)`,
  and a partial index on `(user_id, next_follow_up_date) where next_follow_up_date is not null`.
- Deleting a lead cascades its `lead_activities` and `list_leads` rows. The
  `leads.business_id` restriction applies in the other direction, so deleting a
  lead never deletes the shared `businesses` record. The active bulk-delete
  action relies on this behavior without adding a migration.

⚠ `next_follow_up_date` is a **`date`**, not a timestamp: follow-ups have a day
but no time of day. The follow-up queue must not assume a time.

There is no separate follow-up row or completion column. The current workflow
marks the one pending follow-up complete by clearing `next_follow_up_date` and
appending a `follow_up_completed` activity. A null date is the persisted
outstanding-state signal; the activity is the completion history entry.

**Open design decision:** follow-ups are a single pending date per lead. There is
no `follow_ups` table, so a lead cannot hold multiple scheduled tasks — see
`docs/API.md` §5. The current My Leads workflow uses this single-date model.

### 2.5 `lead_activities`

History: `saved`, `note`, `status_change`, `follow_up_scheduled`,
`follow_up_completed`, `follow_up_cleared`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `lead_id` | `uuid` | Not null; part of the composite ownership FK |
| `user_id` | `uuid` | Not null, default `auth.uid()`; part of the composite ownership FK |
| `kind` | `activity_kind` | Not null, no default |
| `body` | `text` | Nullable |
| `metadata` | `jsonb` | Not null, default `{}`, checked to be a JSON object |
| `created_at` | `timestamptz` | |

The table declares a **composite** foreign key
`(lead_id, user_id) → leads (id, user_id) on delete cascade`, so an activity's
`user_id` must be the owner of its lead. Postgres cannot enforce the two
separate keys listed in the hosted schema dump (`lead_id → leads(id)` and
`user_id → leads(user_id)`) because `leads.user_id` is not unique on its own.
The insert policy enforces the same rule a second time.

`status_change` rows are written by the authenticated status actions with a body
such as `Status changed to Contacted.`. Single-lead status updates now skip
unchanged values; bulk updates already skipped them. These rows support
historical counts of leads **marked** Contacted or Interested, but they do not
verify delivery of an external call, email, or message. Activity inserts happen
after the lead update and are best-effort, so failed history writes can make
activity analytics undercount. No separate contact-event kind is present in the
schema.

### 2.6 `lists` and `list_leads`

- `lists`: `user_id`, a `name` checked to 1–100 trimmed characters, and
  `created_at`. There is **no `description` and no `updated_at`**. A user cannot
  have two lists with the same name (`unique (user_id, name)`).
- `list_leads`: `list_id`, `lead_id`, `user_id` (default `auth.uid()`), and
  `added_at`; composite PK `(list_id, lead_id)`.
- Both sides use the composite ownership pattern (`list_leads → lists (id, user_id)`
  and `→ leads (id, user_id)`, cascade delete), and the insert policy requires
  **both** the list and the lead to belong to the caller, so a user cannot
  attach someone else's lead.

### 2.7 `message_templates`

- `channel` is `template_channel` (`whatsapp`, `email`, or `call_script`),
  **not null and with no default** — every insert must supply it.
- `name` is checked to 1–100 trimmed characters; `body` must be non-blank.
- `body` is the raw template text; `{name}` / `{business}` / `{city}`
  placeholders are not interpolated yet.

### 2.8 `lead_stats` view

A regular view over `leads` that returns these legacy per-user metrics:

| Column | Derived from |
|---|---|
| `saved_leads` | `count(*)` of the user's leads |
| `contacted_this_week` | Leads with `last_contacted_at >= now() - interval '7 days'` |
| `interested` | Leads with `status = 'interested'` |
| `follow_ups_due` | Leads with `next_follow_up_date <= current_date` |

The view includes `where user_id = auth.uid()`, and RLS on `leads` further
restricts rows to those owned by the caller.

The current application status actions do not write `last_contacted_at`, so
`contacted_this_week` may reflect only legacy or externally populated values.
The current Overview and Analytics implementations therefore do not use this
view for Contacted metrics; they use timestamped `status_change` activity rows
for leads marked Contacted. Overview derives its other counts and breakdowns
from the authenticated user's persisted lead rows.

## 3. Triggers

| Trigger | Table | Purpose |
|---|---|---|
| `profiles_set_updated_at` | `profiles` | Sets `updated_at = now()` on update |
| `businesses_set_updated_at` | `businesses` | " |
| `leads_set_updated_at` | `leads` | " |
| `message_templates_set_updated_at` | `message_templates` | " |
| `on_auth_user_created` | `auth.users` | Inserts the matching `profiles` row after signup |

`lists` has no `updated_at` column and therefore no trigger.

The migration drops legacy trigger names (e.g. `profiles_updated_at`) before
creating the canonical names, so applying it to the hosted project does not
produce duplicate triggers.

## 4. Row Level Security

RLS is **enabled on every table**.

| Table | Policies |
|---|---|
| `profiles` | select / insert / update where `id = auth.uid()` |
| `businesses` | select only when the user has a lead for the business; **no client insert / update / delete** |
| `leads` | select / insert / update / delete where `user_id = auth.uid()` |
| `lead_activities` | owner-scoped, plus explicit lead ownership on insert |
| `lists` | select / insert / update / delete where `user_id = auth.uid()` |
| `list_leads` | select through owned list; insert requires owned list and owned lead |
| `message_templates` | select / insert / update / delete where `user_id = auth.uid()` |

Notes:

- Policies are scoped `to authenticated`; `anon` has no access to any table.
- `(select auth.uid())` is used instead of a direct `auth.uid()` call so the
  value is evaluated once per statement instead of per row.
- `businesses` has **no client-side write policies**. Shared business records can
  only be inserted through the narrowly scoped `save_businesses_as_leads`
  database function described below.
- RLS is the second line of defense. Server-side operations must still verify
  the session — never trust a client-supplied user id.

### 4.1 Lead-saving function (proposed, not applied)

`docs/sql/save_lead_function.sql` contains a complete standalone script for manual
execution in the Supabase SQL Editor. It is **not** in `supabase/migrations/` and
has **not** been applied to the hosted project as part of this change.

The function:

- derives the user from `auth.uid()` and rejects unauthenticated callers;
- validates the JSON array, field types, lengths, and coordinate ranges;
- inserts a new `businesses` row only when `(source, source_id)` is unused, using
  `on conflict do nothing` so an existing shared record is never overwritten;
- creates a lead with `on conflict (user_id, business_id) do nothing`;
- returns deterministic `added`, `existing`, `failed`, and `total` counts;
- runs as `SECURITY DEFINER` with `search_path = ''`, fully qualified names, and
  an explicit `postgres` owner;
- revokes execution from `PUBLIC`, `anon`, and `authenticated`, then grants it
  only to `authenticated`.

**Remaining trust limitation:** SQL validation does not prove that a new business
payload came from Overture. A user can still create a previously unseen
fabricated shared business row. The function prevents overwriting existing
shared contact details, but source authenticity requires a separate design.

Until the script is applied, save actions return a configuration message and
will not write. The application type declaration for the RPC was added manually
to `lib/supabase/database.types.ts`; regenerate types after applying the
function.

## 5. Type generation

`lib/supabase/database.types.ts` is generated directly from the hosted schema.
Regenerate it whenever the schema changes:

```bash
pnpm dlx supabase gen types typescript --project-id <ref> --schema public \
  > lib/supabase/database.types.ts
```

## 6. Verification status

Inspection was read-only, through the Supabase MCP server and PostgREST with the
publishable key (2026-10-19 to 2026-10-20). The business/lead tables were empty,
so every structural probe was safe.

**Current implementation note (2026-10-24):** the
`save_businesses_as_leads` function and its type declaration are proposed/local
only. The function has not been applied to the hosted database, and no live save
or RLS-isolation test has been run.

**Verified against the hosted project:**

- All seven tables exist and every column in §2 exists with the documented type.
- The three enum types and their full member sets, including `follow_up_cleared`
  (in `activity_kind`) and `call_script` (in `template_channel`). Member order
  was recovered from the live type metadata.
- Unique constraints and composite ownership foreign keys (`leads (id, user_id)`,
  `lists (id, user_id)`, `lead_activities → leads (id, user_id)`,
  `list_leads → lists/leads (id, user_id)`).
- The `lead_stats` view is present and exposes the columns used by the dashboard
  overview.
- RLS policies (23 in total) and their semantics are as documented in §4.
- `updated_at` triggers exist on `profiles`, `businesses`, `leads`, and
  `message_templates` under the legacy `<table>_updated_at` naming; `lists` has
  no `updated_at` column and therefore no trigger.
- The `handle_new_user()` function and `on_auth_user_created` trigger exist.

**Still to verify in the running app:**

- RLS isolation between two accounts, tested with two real users.
- That `profiles` is created on signup via the trigger.
- That the `businesses` SELECT policy allows a user to read only businesses they
  have saved as leads.
- That `lib/supabase/database.types.ts` (generated from the hosted schema)
  compiles cleanly with the rest of the codebase.

## 7. Open schema decisions

1. **`lead_status` does not match the product brief.** The brief's filter chips
   (Replied) and analytics (deals won) need values the enum does not have. This
   must be resolved before the leads or analytics features are built — adding an
   enum member later requires `alter type ... add value`.
2. **`template_channel` includes `call_script`.** The brief's "Call script"
   template should use `channel = 'call_script'`.
3. **No `follow_ups` table.** Multiple follow-ups per lead are not representable
   beyond the `leads.next_follow_up_date` field and activity log entries.
4. **`businesses` has no `user_id`.** It is shared, but the RLS policy restricts
   reads to business records the user has saved as a lead. This protects
   business records from being browsed by users who have not saved them, while
   still allowing a user to see details for their own leads.
