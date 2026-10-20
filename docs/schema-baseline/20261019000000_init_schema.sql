-- Reachly — initial schema
--
-- Idempotent and safe for both fresh databases and the already-provisioned
-- hosted project. All statements use IF NOT EXISTS, drop-before-create, or
-- explicit name reconciliation so they can be re-applied without duplicating
-- policies, triggers, or indexes.
--
-- Conventions:
--   * uuid primary keys generated with gen_random_uuid() (pgcrypto, preinstalled in Supabase).
--   * timestamptz everywhere except leads.next_follow_up_date, which is a date.
--   * user_id columns default to auth.uid().
--   * Row Level Security is enabled on every table.
--   * Businesses are read only when the user has saved them as a lead. Writes to
--     the shared businesses table are performed by server-side privileged
--     operations, not through client RLS.

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------
-- Member order is preserved from the hosted project so ORDER BY semantics do
-- not change if the type is ever recreated.

do $$
begin
  create type public.lead_status as enum (
    'new',
    'to_contact',
    'contacted',
    'interested',
    'not_interested',
    'follow_up'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.activity_kind as enum (
    'saved',
    'note',
    'status_change',
    'follow_up_scheduled',
    'follow_up_completed',
    'follow_up_cleared'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.template_channel as enum (
    'whatsapp',
    'email',
    'call_script'
  );
exception
  when duplicate_object then null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one row per authenticated user
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  workspace_name text not null default 'Personal workspace',
  default_search_location text not null default '',
  default_lead_status public.lead_status not null default 'new',
  auto_follow_up boolean not null default true,
  icp_niches text[] not null default '{}',
  icp_cities text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'User profile, workspace defaults, and ideal-customer-profile preferences.';

-- ---------------------------------------------------------------------------
-- businesses — normalized records sourced from business discovery (Overture)
-- ---------------------------------------------------------------------------

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'overture',
  source_id text not null,
  name text not null,
  category text,
  address text,
  city text,
  latitude double precision
    constraint businesses_latitude_valid
    check (latitude is null or (latitude >= -90 and latitude <= 90)),
  longitude double precision
    constraint businesses_longitude_valid
    check (longitude is null or (longitude >= -180 and longitude <= 180)),
  phone text,
  website text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_source_identity_unique unique (source, source_id)
);

comment on table public.businesses is
  'Business records persisted on demand when a user saves a search result as a lead. Shared across users; never bulk-imported. Contact fields stay NULL when the source has no value. Read through RLS only when the user has a lead for the business; writes happen through privileged server operations.';

-- ---------------------------------------------------------------------------
-- leads — a user's saved business
-- ---------------------------------------------------------------------------

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete restrict,
  status public.lead_status not null default 'new',
  last_contacted_at timestamptz,
  next_follow_up_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_user_business_unique unique (user_id, business_id),
  -- Redundant with the primary key; required as the target of the composite
  -- ownership foreign keys on lead_activities / list_leads below.
  constraint leads_id_user_unique unique (id, user_id)
);

comment on table public.leads is
  'A user-owned lead. One row per (user, business); the unique constraint prevents duplicate saves. next_follow_up_date is a date, not a timestamp.';

-- ---------------------------------------------------------------------------
-- lead_activities — notes and activity history for a lead
-- ---------------------------------------------------------------------------

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null,
  user_id uuid not null default auth.uid(),
  kind public.activity_kind not null,
  body text,
  metadata jsonb not null default '{}'::jsonb
    constraint activities_metadata_is_object
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  -- Composite ownership key: an activity's user_id must be the owner of its
  -- lead. Postgres cannot enforce this as two separate keys because
  -- leads.user_id is not unique on its own.
  constraint activities_lead_owner_fk
    foreign key (lead_id, user_id) references public.leads (id, user_id) on delete cascade
);

comment on table public.lead_activities is
  'Append-only activity log for a lead (notes, status changes, follow-up events).';

-- ---------------------------------------------------------------------------
-- lists — optional user-created groupings of leads
-- ---------------------------------------------------------------------------

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null
    constraint lists_name_check
    check (length(trim(both from name)) >= 1 and length(trim(both from name)) <= 100),
  created_at timestamptz not null default now(),
  -- Composite ownership key target, as above.
  constraint lists_id_user_unique unique (id, user_id),
  -- A user cannot have two lists with the same name.
  constraint lists_user_name_unique unique (user_id, name)
);

comment on table public.lists is 'User-created lead lists.';

create table if not exists public.list_leads (
  list_id uuid not null,
  lead_id uuid not null,
  user_id uuid not null default auth.uid(),
  added_at timestamptz not null default now(),
  primary key (list_id, lead_id),
  constraint list_items_owner_fk
    foreign key (list_id, user_id) references public.lists (id, user_id) on delete cascade,
  constraint list_items_lead_owner_fk
    foreign key (lead_id, user_id) references public.leads (id, user_id) on delete cascade
);

comment on table public.list_leads is
  'Association between lists and leads. Both sides must belong to the same user.';

-- ---------------------------------------------------------------------------
-- message_templates — reusable outreach templates
-- ---------------------------------------------------------------------------

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null
    constraint message_templates_name_check
    check (length(trim(both from name)) >= 1 and length(trim(both from name)) <= 100),
  channel public.template_channel not null,
  body text not null
    constraint message_templates_body_check
    check (length(trim(both from body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.message_templates is 'Reusable, user-owned outreach message templates.';

-- ---------------------------------------------------------------------------
-- lead_stats — overview metrics for the dashboard
-- ---------------------------------------------------------------------------
-- A regular view over the user's own leads. RLS on leads enforces isolation,
-- so the view only counts rows the caller owns.

create or replace view public.lead_stats as
select
  user_id,
  count(*) as saved_leads,
  count(*) filter (where last_contacted_at >= (now() - '7 days'::interval)) as contacted_this_week,
  count(*) filter (where status = 'interested'::lead_status) as interested,
  count(*) filter (where next_follow_up_date <= current_date) as follow_ups_due
from public.leads
where user_id = (select auth.uid())
group by user_id;

comment on view public.lead_stats is
  'Dashboard overview metrics derived from the authenticated user\'s leads.';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
-- Drop both the canonical names and any previously-created names from the
-- hosted project so we never end up with duplicate triggers.

drop trigger if exists profiles_updated_at on public.profiles;
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists businesses_updated_at on public.businesses;
drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

drop trigger if exists leads_updated_at on public.leads;
drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

drop trigger if exists message_templates_updated_at on public.message_templates;
drop trigger if exists message_templates_set_updated_at on public.message_templates;
create trigger message_templates_set_updated_at
  before update on public.message_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profile bootstrap: create a profile row for every new auth user
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.lists enable row level security;
alter table public.list_leads enable row level security;
alter table public.message_templates enable row level security;

-- Drop every known policy name (canonical and legacy) so the final set is
-- explicit and non-overlapping. PostgreSQL ORs permissive policies, so stale
-- policies with different names would silently widen access.

-- profiles ------------------------------------------------------------------

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- businesses ----------------------------------------------------------------
-- Shared reference data: a user may read only the businesses they have saved
-- as leads. This protects business records from being browsed by users who
-- have not saved them, while still allowing a user to see the business details
-- attached to their own leads. Inserts, updates, and deletes are performed by
-- server-side privileged operations, not through client RLS.

drop policy if exists businesses_read_saved on public.businesses;
drop policy if exists businesses_select_saved on public.businesses;
drop policy if exists businesses_select_authenticated on public.businesses;
drop policy if exists businesses_insert_authenticated on public.businesses;

create policy businesses_select_saved on public.businesses
  for select to authenticated
  using (
    exists (
      select 1 from public.leads l
      where l.business_id = businesses.id and l.user_id = (select auth.uid())
    )
  );

-- leads ---------------------------------------------------------------------

drop policy if exists leads_select_own on public.leads;
drop policy if exists leads_insert_own on public.leads;
drop policy if exists leads_update_own on public.leads;
drop policy if exists leads_delete_own on public.leads;

create policy leads_select_own on public.leads
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy leads_insert_own on public.leads
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy leads_update_own on public.leads
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy leads_delete_own on public.leads
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- lead_activities -----------------------------------------------------------
-- Reads and writes are restricted to the owner of the parent lead. The insert
-- policy adds an explicit lead-ownership check as defense-in-depth alongside
-- the composite ownership foreign key.

drop policy if exists activities_select_own on public.lead_activities;
drop policy if exists activities_insert_own on public.lead_activities;
drop policy if exists activities_update_own on public.lead_activities;
drop policy if exists activities_delete_own on public.lead_activities;
drop policy if exists lead_activities_select_own on public.lead_activities;
drop policy if exists lead_activities_insert_own on public.lead_activities;
drop policy if exists lead_activities_update_own on public.lead_activities;
drop policy if exists lead_activities_delete_own on public.lead_activities;

create policy lead_activities_select_own on public.lead_activities
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy lead_activities_insert_own on public.lead_activities
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.leads l
      where l.id = lead_id and l.user_id = (select auth.uid())
    )
  );

create policy lead_activities_update_own on public.lead_activities
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy lead_activities_delete_own on public.lead_activities
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- lists ---------------------------------------------------------------------

drop policy if exists lists_select_own on public.lists;
drop policy if exists lists_insert_own on public.lists;
drop policy if exists lists_update_own on public.lists;
drop policy if exists lists_delete_own on public.lists;

create policy lists_select_own on public.lists
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy lists_insert_own on public.lists
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy lists_update_own on public.lists
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy lists_delete_own on public.lists
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- list_leads ----------------------------------------------------------------
-- A list may only contain leads owned by the same user as the list. The insert
-- policy adds explicit list and lead ownership checks as defense-in-depth
-- alongside the composite ownership foreign keys.

drop policy if exists list_leads_select_own on public.list_leads;
drop policy if exists list_leads_insert_own on public.list_leads;
drop policy if exists list_leads_delete_own on public.list_leads;

create policy list_leads_select_own on public.list_leads
  for select to authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_id and l.user_id = (select auth.uid())
    )
  );

create policy list_leads_insert_own on public.list_leads
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.lists l
      where l.id = list_id and l.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.leads ld
      where ld.id = lead_id and ld.user_id = (select auth.uid())
    )
  );

create policy list_leads_delete_own on public.list_leads
  for delete to authenticated
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_id and l.user_id = (select auth.uid())
    )
  );

-- message_templates ---------------------------------------------------------

drop policy if exists templates_select_own on public.message_templates;
drop policy if exists templates_insert_own on public.message_templates;
drop policy if exists templates_update_own on public.message_templates;
drop policy if exists templates_delete_own on public.message_templates;
drop policy if exists message_templates_select_own on public.message_templates;
drop policy if exists message_templates_insert_own on public.message_templates;
drop policy if exists message_templates_update_own on public.message_templates;
drop policy if exists message_templates_delete_own on public.message_templates;

create policy message_templates_select_own on public.message_templates
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy message_templates_insert_own on public.message_templates
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy message_templates_update_own on public.message_templates
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy message_templates_delete_own on public.message_templates
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Unique indexes are created by the table constraints above. This section adds
-- supporting non-unique indexes and reconciles names with the hosted project.

-- Rename the legacy index from the hosted project to the canonical name.
alter index if exists activities_lead_created_idx
  rename to lead_activities_lead_created_idx;

-- Add any missing supporting indexes. IF NOT EXISTS guards against a future
-- re-run; the renamed index above covers the existing hosted object.
create index if not exists businesses_category_idx on public.businesses (category);
create index if not exists businesses_city_idx on public.businesses (city);
create index if not exists businesses_name_trgm_idx on public.businesses using gin (name gin_trgm_ops);

create index if not exists leads_user_created_idx on public.leads (user_id, created_at desc);
create index if not exists leads_business_id_idx on public.leads (business_id);
create index if not exists leads_user_status_idx on public.leads (user_id, status);
create index if not exists leads_user_follow_up_idx
  on public.leads (user_id, next_follow_up_date)
  where next_follow_up_date is not null;

create index if not exists lead_activities_lead_created_idx
  on public.lead_activities (lead_id, created_at desc);
create index if not exists activities_user_created_idx on public.lead_activities (user_id, created_at desc);

create index if not exists list_leads_lead_idx on public.list_leads (lead_id);

create index if not exists message_templates_user_idx on public.message_templates (user_id);

-- ---------------------------------------------------------------------------
-- Function hardening
-- ---------------------------------------------------------------------------
-- These trigger helpers are not meant to be called directly via the PostgREST
-- API. Revoke EXECUTE from the API roles while leaving the auth trigger able
-- to invoke them (triggers run with the function owner's privileges).
-- ---------------------------------------------------------------------------

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.set_updated_at() from anon, authenticated;
