-- Reachly — secure lead saving (manual execution only)
--
-- DO NOT run this automatically. Apply it in the Supabase SQL Editor after reviewing it.
-- The currently connected hosted project contains this function as of 2026-10-30;
-- do not reapply it as part of normal setup.
--
-- Why this exists
-- ---------------
-- The previous application code used the service-role key to upsert shared
-- `businesses` rows with client-supplied values. That could overwrite another
-- user's saved contact information and bypassed RLS. This function replaces that
-- path with a narrow, auditable operation that:
--
--   * derives ownership from auth.uid() and rejects unauthenticated callers;
--   * never updates an existing shared business row;
--   * inserts a business only when its (source, source_id) does not exist;
--   * creates at most one lead per (user, business);
--   * validates types, lengths, and coordinate ranges again in SQL;
--   * returns predictable counts for saved, existing, and failed items.
--
-- Security model
-- --------------
-- This is a SECURITY DEFINER function, which is privileged code, not a magic
-- security boundary. It is hardened by:
--   * an empty fixed search_path and fully qualified object names;
--   * explicit EXECUTE grants only to `authenticated`;
--   * no dynamic SQL and no client-provided user id;
--   * insert-only handling for shared businesses.
--
-- Remaining trust limitation: a well-formed payload still cannot be proven to
-- have originated from Overture. A user can still create a new fabricated shared
-- business row by submitting an unused source id. This function prevents
-- tampering with existing shared records, but source authenticity requires a
-- separate verification design. Do not claim that this script solves it.
--
-- Usage from the server: supabase.rpc('save_businesses_as_leads', { p_businesses: [...] })
-- Return shape:
--   { "ok": true, "added": n, "existing": n, "failed": n, "total": n }
-- Malformed payloads return:
--   { "ok": false, "message": "..." }
-- Unauthenticated calls raise SQLSTATE 42501 instead of returning an object.

create or replace function public.save_businesses_as_leads(p_businesses jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_source_id text;
  v_name text;
  v_category text;
  v_address text;
  v_phone text;
  v_website text;
  v_email text;
  v_latitude double precision;
  v_longitude double precision;
  v_business_id uuid;
  v_lead_id uuid;
  v_added integer := 0;
  v_existing integer := 0;
  v_failed integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_businesses is null or jsonb_typeof(p_businesses) <> 'array' then
    return jsonb_build_object('ok', false, 'message', 'The business list is invalid.');
  end if;

  if jsonb_array_length(p_businesses) > 500 then
    return jsonb_build_object('ok', false, 'message', 'Select 500 businesses or fewer at a time.');
  end if;

  for v_item in select value from jsonb_array_elements(p_businesses)
  loop
    begin
      -- Reset per-item identifiers so a no-op INSERT cannot reuse an earlier id.
      v_business_id := null;
      v_lead_id := null;

      if v_item is null or jsonb_typeof(v_item) <> 'object' then
        v_failed := v_failed + 1;
        continue;
      end if;

      -- Required string fields. JSON null is not accepted for these.
      if jsonb_typeof(v_item -> 'sourceId') is distinct from 'string'
         or jsonb_typeof(v_item -> 'name') is distinct from 'string' then
        v_failed := v_failed + 1;
        continue;
      end if;

      -- Optional fields must be JSON strings or JSON null when present.
      if (v_item ? 'category' and jsonb_typeof(v_item -> 'category') not in ('string', 'null'))
         or (v_item ? 'address' and jsonb_typeof(v_item -> 'address') not in ('string', 'null'))
         or (v_item ? 'phone' and jsonb_typeof(v_item -> 'phone') not in ('string', 'null'))
         or (v_item ? 'website' and jsonb_typeof(v_item -> 'website') not in ('string', 'null'))
         or (v_item ? 'email' and jsonb_typeof(v_item -> 'email') not in ('string', 'null')) then
        v_failed := v_failed + 1;
        continue;
      end if;

      -- Coordinates must be finite JSON numbers or JSON null when present.
      if (v_item ? 'latitude' and jsonb_typeof(v_item -> 'latitude') not in ('number', 'null'))
         or (v_item ? 'longitude' and jsonb_typeof(v_item -> 'longitude') not in ('number', 'null')) then
        v_failed := v_failed + 1;
        continue;
      end if;

      v_source_id := nullif(trim(both ' ' from (v_item ->> 'sourceId')), '');
      v_name := nullif(trim(both ' ' from (v_item ->> 'name')), '');
      v_category := nullif(trim(both ' ' from (v_item ->> 'category')), '');
      v_address := nullif(trim(both ' ' from (v_item ->> 'address')), '');
      v_phone := nullif(trim(both ' ' from (v_item ->> 'phone')), '');
      v_website := nullif(trim(both ' ' from (v_item ->> 'website')), '');
      v_email := nullif(trim(both ' ' from (v_item ->> 'email')), '');

      if v_source_id is null or length(v_source_id) > 200
         or v_name is null or length(v_name) > 300 then
        v_failed := v_failed + 1;
        continue;
      end if;

      if (v_category is not null and length(v_category) > 500)
         or (v_address is not null and length(v_address) > 500)
         or (v_phone is not null and length(v_phone) > 500)
         or (v_website is not null and length(v_website) > 500)
         or (v_email is not null and length(v_email) > 500) then
        v_failed := v_failed + 1;
        continue;
      end if;

      v_latitude := case
        when jsonb_typeof(v_item -> 'latitude') = 'number'
          then (v_item ->> 'latitude')::double precision
        else null
      end;
      v_longitude := case
        when jsonb_typeof(v_item -> 'longitude') = 'number'
          then (v_item ->> 'longitude')::double precision
        else null
      end;

      -- JSON cannot express NaN or Infinity, and PostgreSQL reports numeric
      -- overflow during the cast above. Reject non-finite results explicitly
      -- as a defense-in-depth check.
      if (v_latitude is not null and (
            v_latitude = 'NaN'::double precision
            or v_latitude = 'Infinity'::double precision
            or v_latitude = '-Infinity'::double precision
          ))
         or (v_longitude is not null and (
            v_longitude = 'NaN'::double precision
            or v_longitude = 'Infinity'::double precision
            or v_longitude = '-Infinity'::double precision
          )) then
        v_failed := v_failed + 1;
        continue;
      end if;

      if (v_latitude is not null and (v_latitude < -90 or v_latitude > 90))
         or (v_longitude is not null and (v_longitude < -180 or v_longitude > 180)) then
        v_failed := v_failed + 1;
        continue;
      end if;

      -- Insert only. Existing shared business records are never overwritten.
      -- ON CONFLICT also closes the race between two users saving the same id.
      insert into public.businesses (
        source,
        source_id,
        name,
        category,
        address,
        city,
        phone,
        website,
        email,
        latitude,
        longitude
      )
      values (
        'overture',
        v_source_id,
        v_name,
        v_category,
        v_address,
        null,
        v_phone,
        v_website,
        v_email,
        v_latitude,
        v_longitude
      )
      on conflict (source, source_id) do nothing
      returning id into v_business_id;

      if v_business_id is null then
        select id
        into v_business_id
        from public.businesses
        where source = 'overture'
          and source_id = v_source_id
        limit 1;
      end if;

      if v_business_id is null then
        v_failed := v_failed + 1;
        continue;
      end if;

      -- The unique (user_id, business_id) constraint is the duplicate rule.
      insert into public.leads (user_id, business_id)
      values (v_user_id, v_business_id)
      on conflict (user_id, business_id) do nothing
      returning id into v_lead_id;

      if v_lead_id is not null then
        v_added := v_added + 1;
      else
        v_existing := v_existing + 1;
      end if;
    exception
      when check_violation
        or not_null_violation
        or foreign_key_violation
        or unique_violation
        or invalid_text_representation
        or numeric_value_out_of_range then
        -- Keep one bad item from failing the rest of a bulk selection.
        -- Unexpected errors propagate so configuration faults stay visible.
        v_failed := v_failed + 1;
    end;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'added', v_added,
    'existing', v_existing,
    'failed', v_failed,
    'total', v_added + v_existing + v_failed
  );
end;
$$;

-- Replace-or-create does not change ownership. Make the privileged owner explicit.
alter function public.save_businesses_as_leads(jsonb) owner to postgres;

revoke all on function public.save_businesses_as_leads(jsonb) from public;
revoke all on function public.save_businesses_as_leads(jsonb) from anon;
revoke all on function public.save_businesses_as_leads(jsonb) from authenticated;
grant execute on function public.save_businesses_as_leads(jsonb) to authenticated;

-- Verification (run manually after applying):
select
  format(
    '%I.%I(%s)',
    n.nspname,
    p.proname,
    pg_get_function_identity_arguments(p.oid)
  ) as function_identity,
  pg_get_function_result(p.oid) as returns,
  pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as security_definer,
  coalesce(array_to_string(p.proconfig, ', '), '(not set)') as function_settings,
  case
    when a.grantee = 0 then 'PUBLIC'
    else pg_get_userbyid(a.grantee)
  end as grantee_name,
  a.privilege_type,
  a.is_grantable
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(
  coalesce(p.proacl, acldefault('f', p.proowner))
) as a
where p.oid = to_regprocedure('public.save_businesses_as_leads(jsonb)')
order by grantee_name, a.privilege_type;
