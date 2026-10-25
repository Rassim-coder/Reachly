-- Reachly — recovered production schema (schema-only)
--
-- Source: production Supabase project qhihmtxsbyeoenqdtmai, inspected read-only
-- through the Supabase MCP server on 2026-10-25.
--
-- Target: reachly-dev, for manual review and manual application only.
--
-- This file contains:
--   * application tables, columns, defaults, nullability, constraints, and indexes
--   * enums and application functions
--   * the lead_stats view
--   * triggers, RLS settings, and policies
--   * schema/table/view/function grants and production default privileges
--
-- This file does not contain:
--   * table data, auth users, leads, or secrets
--   * the save_businesses_as_leads function (it does not exist in production)
--   * changes to supabase/migrations or application code
--
-- Apply as the postgres role. The script is one-shot and intentionally fails if
-- application objects already exist, rather than silently adopting mismatched
-- definitions. It is wrapped in a transaction.
--
-- Assumes a standard Supabase project: the auth schema, auth.uid(), and the
-- postgres, anon, authenticated, and service_role roles must already exist.
--
-- To validate without persisting on reachly-dev, replace the final COMMIT with
-- ROLLBACK, run the whole file, then restore COMMIT and run it again.
--
-- Review the recovery notes at the end before applying.

begin;

-- ---------------------------------------------------------------------------
-- Dependencies
-- ---------------------------------------------------------------------------
-- Production has pgcrypto 1.3 in the extensions schema and pg_trgm 1.6 in the
-- public schema. Versions are not pinned so the target's supported versions can
-- be used. pg_trgm may already be installed in the extensions schema; the
-- local search_path below allows gin_trgm_ops to resolve in either location.

create schema if not exists extensions;
grant usage, create on schema extensions to postgres;

set local search_path = public, extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema public;

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------

create type public.lead_status as enum (
  'new',
  'to_contact',
  'contacted',
  'interested',
  'not_interested',
  'follow_up'
);

create type public.activity_kind as enum (
  'saved',
  'note',
  'status_change',
  'follow_up_scheduled',
  'follow_up_completed',
  'follow_up_cleared'
);

create type public.template_channel as enum (
  'whatsapp',
  'email',
  'call_script'
);

-- ---------------------------------------------------------------------------
-- Tables and constraints
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid not null,
  full_name text not null default '',
  workspace_name text not null default 'Personal workspace',
  default_search_location text not null default '',
  default_lead_status public.lead_status not null default 'new',
  auto_follow_up boolean not null default true,
  icp_niches text[] not null default '{}'::text[],
  icp_cities text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id)
    references auth.users (id) on delete cascade
);

create table public.businesses (
  id uuid not null default gen_random_uuid(),
  source text not null default 'overture',
  source_id text not null,
  name text not null,
  category text,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  phone text,
  website text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_pkey primary key (id),
  constraint businesses_source_identity_unique unique (source, source_id),
  constraint businesses_latitude_valid check (
    (latitude is null)
    or (
      (latitude >= ('-90'::integer)::double precision)
      and (latitude <= (90)::double precision)
    )
  ),
  constraint businesses_longitude_valid check (
    (longitude is null)
    or (
      (longitude >= ('-180'::integer)::double precision)
      and (longitude <= (180)::double precision)
    )
  )
);

create table public.leads (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  business_id uuid not null,
  status public.lead_status not null default 'new',
  last_contacted_at timestamptz,
  next_follow_up_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_pkey primary key (id),
  constraint leads_user_business_unique unique (user_id, business_id),
  constraint leads_id_user_unique unique (id, user_id),
  constraint leads_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete cascade,
  constraint leads_business_id_fkey foreign key (business_id)
    references public.businesses (id) on delete restrict
);

create table public.lead_activities (
  id uuid not null default gen_random_uuid(),
  lead_id uuid not null,
  user_id uuid not null default auth.uid(),
  kind public.activity_kind not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint lead_activities_pkey primary key (id),
  constraint activities_metadata_is_object
    check (jsonb_typeof(metadata) = 'object'::text),
  constraint activities_lead_owner_fk
    foreign key (lead_id, user_id)
    references public.leads (id, user_id) on delete cascade
);

create table public.lists (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  created_at timestamptz not null default now(),
  constraint lists_pkey primary key (id),
  constraint lists_id_user_unique unique (id, user_id),
  constraint lists_user_name_unique unique (user_id, name),
  constraint lists_name_check check (
    (length(trim(both from name)) >= 1)
    and (length(trim(both from name)) <= 100)
  ),
  constraint lists_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete cascade
);

create table public.list_leads (
  list_id uuid not null,
  lead_id uuid not null,
  user_id uuid not null default auth.uid(),
  added_at timestamptz not null default now(),
  constraint list_leads_pkey primary key (list_id, lead_id),
  constraint list_items_lead_owner_fk
    foreign key (lead_id, user_id)
    references public.leads (id, user_id) on delete cascade,
  constraint list_items_owner_fk
    foreign key (list_id, user_id)
    references public.lists (id, user_id) on delete cascade
);

create table public.message_templates (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  channel public.template_channel not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_templates_pkey primary key (id),
  constraint message_templates_name_check check (
    (length(trim(both from name)) >= 1)
    and (length(trim(both from name)) <= 100)
  ),
  constraint message_templates_body_check check (
    (length(trim(both from body)) > 0)
  ),
  constraint message_templates_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Constraint-backed indexes are created by the primary key and unique
-- constraints above. These are the standalone production indexes.
--
-- Production does not have leads_business_id_idx; it is intentionally absent
-- here and should be evaluated as a separate performance change.

create index businesses_category_idx
  on public.businesses using btree (category);

create index businesses_city_idx
  on public.businesses using btree (city);

create index businesses_name_trgm_idx
  on public.businesses using gin (name gin_trgm_ops);

create index activities_lead_created_idx
  on public.lead_activities using btree (lead_id, created_at desc);

create index activities_user_created_idx
  on public.lead_activities using btree (user_id, created_at desc);

create index leads_user_created_idx
  on public.leads using btree (user_id, created_at desc);

create index leads_user_follow_up_idx
  on public.leads using btree (user_id, next_follow_up_date)
  where next_follow_up_date is not null;

create index leads_user_status_idx
  on public.leads using btree (user_id, status);

create index list_leads_lead_idx
  on public.list_leads using btree (lead_id);

create index message_templates_user_idx
  on public.message_templates using btree (user_id);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );

  return new;
end;
$function$;

-- ---------------------------------------------------------------------------
-- View
-- ---------------------------------------------------------------------------

create view public.lead_stats
with (security_invoker = true)
as
select
  user_id,
  count(*) as saved_leads,
  count(*) filter (
    where last_contacted_at >= (now() - '7 days'::interval)
  ) as contacted_this_week,
  count(*) filter (
    where status = 'interested'::public.lead_status
  ) as interested,
  count(*) filter (
    where next_follow_up_date <= current_date
  ) as follow_ups_due
from public.leads
where user_id = (select auth.uid())
group by user_id;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger businesses_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create trigger message_templates_updated_at
  before update on public.message_templates
  for each row execute function public.set_updated_at();

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

-- Profiles ------------------------------------------------------------------

create policy profiles_select_own on public.profiles
  as permissive
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy profiles_insert_own on public.profiles
  as permissive
  for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  as permissive
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Businesses ----------------------------------------------------------------

create policy businesses_read_saved on public.businesses
  as permissive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.leads l
      where l.business_id = businesses.id
        and l.user_id = (select auth.uid())
    )
  );

-- Leads ---------------------------------------------------------------------

create policy leads_select_own on public.leads
  as permissive
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy leads_insert_own on public.leads
  as permissive
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy leads_update_own on public.leads
  as permissive
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy leads_delete_own on public.leads
  as permissive
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Lead activities -----------------------------------------------------------
-- Parent-lead ownership is enforced by activities_lead_owner_fk. Production
-- deliberately relies on that composite foreign key here.

create policy activities_select_own on public.lead_activities
  as permissive
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy activities_insert_own on public.lead_activities
  as permissive
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy activities_update_own on public.lead_activities
  as permissive
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy activities_delete_own on public.lead_activities
  as permissive
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Lists ---------------------------------------------------------------------

create policy lists_select_own on public.lists
  as permissive
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy lists_insert_own on public.lists
  as permissive
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy lists_update_own on public.lists
  as permissive
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy lists_delete_own on public.lists
  as permissive
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- List leads ----------------------------------------------------------------
-- Parent list and lead ownership is enforced by list_items_owner_fk and
-- list_items_lead_owner_fk. Production deliberately relies on those composite
-- foreign keys here.

create policy list_leads_select_own on public.list_leads
  as permissive
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy list_leads_insert_own on public.list_leads
  as permissive
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy list_leads_delete_own on public.list_leads
  as permissive
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Message templates ---------------------------------------------------------

create policy templates_select_own on public.message_templates
  as permissive
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy templates_insert_own on public.message_templates
  as permissive
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy templates_update_own on public.message_templates
  as permissive
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy templates_delete_own on public.message_templates
  as permissive
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Ownership
-- ---------------------------------------------------------------------------
-- Production owns all application objects with postgres. This script must be
-- run as postgres for these statements to succeed.

alter type public.lead_status owner to postgres;
alter type public.activity_kind owner to postgres;
alter type public.template_channel owner to postgres;

alter table public.profiles owner to postgres;
alter table public.businesses owner to postgres;
alter table public.leads owner to postgres;
alter table public.lead_activities owner to postgres;
alter table public.lists owner to postgres;
alter table public.list_leads owner to postgres;
alter table public.message_templates owner to postgres;

alter view public.lead_stats owner to postgres;

alter function public.set_updated_at() owner to postgres;
alter function public.handle_new_user() owner to postgres;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public
  to PUBLIC, postgres, anon, authenticated, service_role;

grant usage on schema extensions
  to anon, authenticated, service_role;

grant all privileges on table
  public.profiles,
  public.businesses,
  public.leads,
  public.lead_activities,
  public.lists,
  public.list_leads,
  public.message_templates
  to postgres, anon, authenticated, service_role;

grant all privileges on table public.lead_stats
  to postgres, anon, authenticated, service_role;

grant execute on function public.set_updated_at()
  to PUBLIC, anon, authenticated, service_role;

grant execute on function public.handle_new_user()
  to PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Default privileges
-- ---------------------------------------------------------------------------
-- Production default privileges for postgres in public. These affect future
-- objects, not the objects created above. The supabase_admin/platform defaults
-- are intentionally not reproduced.

alter default privileges for role postgres in schema public
  grant all privileges on tables
  to postgres, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant select, update, usage on sequences
  to postgres, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant execute on functions
  to postgres, anon, authenticated, service_role;

commit;

-- ---------------------------------------------------------------------------
-- Recovery notes and review warnings
-- ---------------------------------------------------------------------------
-- Recovered from the production catalog:
--   * 7 tables, 1 view, 3 enums, 2 application functions, 5 triggers
--   * 23 RLS policies
--   * 26 constraints and 22 indexes
--   * no sequences, no table or column comments, no custom domains/composite types
--
-- Intentionally not included:
--   * save_businesses_as_leads: absent from production
--   * leads_business_id_idx: absent from production
--   * uuid-ossp, pg_stat_statements, and supabase_vault: installed in production
--     but not required by the application schema
--   * the platform dashboard_user grant on the extensions schema and the
--     supabase_admin default privileges
--
-- Production security details preserved:
--   * RLS is enabled on every table; FORCE RLS is false.
--   * lead_stats uses security_invoker=true.
--   * Public schema owner is pg_database_owner; extensions is platform-managed.
--     Schema-level grants are additive and do not change schema ownership, so
--     grantor metadata on public may differ while effective privileges match.
--   * Table and view ACLs grant all privileges to postgres, anon,
--     authenticated, and service_role.
--   * Function ACLs grant EXECUTE to PUBLIC, anon, authenticated, and
--     service_role.
--   * Default privileges for postgres in public grant ALL on tables,
--     SELECT/UPDATE/USAGE on sequences, and EXECUTE on functions to postgres,
--     anon, authenticated, and service_role.
--
-- Review warnings:
--   * The broad table grants include TRUNCATE. RLS does not protect TRUNCATE.
--     These grants are preserved for production fidelity; harden them in a
--     separate reviewed change if desired.
--   * The functions are executable by PUBLIC and anon in production. This is
--     preserved, not fixed.
--   * handle_new_user() has no ON CONFLICT and does not fall back to the email
--     local-part. If a profile already exists for an auth user, the trigger can
--     fail. This is exact production behavior.
--   * No profiles are backfilled for existing auth users. handle_new_user only
--     runs for future auth.users inserts, so reachly-dev users that already
--     exist will need a separate, reviewed backfill if profiles are required.
--   * The on_auth_user_created trigger requires the Supabase auth schema and
--     permission to create triggers on auth.users.
--   * pg_trgm is owned by supabase_admin in production. If this script installs
--     it, the extension will be owned by postgres; Supabase normally
--     preinstalls pg_trgm. The trigram index resolves it from public or
--     extensions through the local search_path.
--   * reachly-dev was not inspected through MCP. If application objects already
--     exist there, this one-shot script will fail rather than overwrite them.
--   * The application's local database.types.ts includes the manually declared
--     save_businesses_as_leads RPC. That function is not part of this recovered
--     schema and must be installed separately when needed.
