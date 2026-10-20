-- Emergency RLS containment for Day1Health
-- Date: 2026-06-01
--
-- Purpose:
-- 1. Block anon reads on sensitive tables that are currently publicly readable.
-- 2. Preserve authenticated staff access using the existing users/user_roles/roles model.
-- 3. Allow provider self-access only where providers.user_id is linked to auth.uid().
--
-- Important:
-- - This migration is intentionally conservative.
-- - It does NOT attempt member self-service RLS yet because members.user_id is not populated.
-- - Review and test in a safe environment before applying to production.

begin;

create schema if not exists private;

create or replace function private.current_staff_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, private
as $$
  select u.id
  from public.users u
  where lower(u.email) = lower((select auth.jwt() ->> 'email'))
    and u.is_active = true
  limit 1;
$$;

create or replace function private.current_user_has_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.users u on u.id = ur.user_id
    where u.id = private.current_staff_user_id()
      and r.name = any(required_roles)
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.current_staff_user_id() to authenticated;
grant execute on function private.current_user_has_role(text[]) to authenticated;

-- Enable RLS on staff identity and permission tables.
alter table if exists public.users enable row level security;
alter table if exists public.roles enable row level security;
alter table if exists public.user_roles enable row level security;
alter table if exists public.permissions enable row level security;
alter table if exists public.role_permissions enable row level security;

-- Enable RLS on sensitive operational tables.
alter table if exists public.members enable row level security;
alter table if exists public.member_dependants enable row level security;
alter table if exists public.claims enable row level security;
alter table if exists public.providers enable row level security;
alter table if exists public.applications enable row level security;

-- Optional defense in depth for table owners.
alter table if exists public.users force row level security;
alter table if exists public.roles force row level security;
alter table if exists public.user_roles force row level security;
alter table if exists public.permissions force row level security;
alter table if exists public.role_permissions force row level security;
alter table if exists public.members force row level security;
alter table if exists public.member_dependants force row level security;
alter table if exists public.claims force row level security;
alter table if exists public.providers force row level security;
alter table if exists public.applications force row level security;

-- Block anon across sensitive identity and operational tables.
drop policy if exists "deny anon users" on public.users;
create policy "deny anon users"
  on public.users
  as restrictive
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "deny anon roles" on public.roles;
create policy "deny anon roles"
  on public.roles
  as restrictive
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "deny anon user_roles" on public.user_roles;
create policy "deny anon user_roles"
  on public.user_roles
  as restrictive
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "deny anon permissions" on public.permissions;
create policy "deny anon permissions"
  on public.permissions
  as restrictive
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "deny anon role_permissions" on public.role_permissions;
create policy "deny anon role_permissions"
  on public.role_permissions
  as restrictive
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "deny anon members" on public.members;
create policy "deny anon members"
  on public.members
  as restrictive
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "deny anon member_dependants" on public.member_dependants;
create policy "deny anon member_dependants"
  on public.member_dependants
  as restrictive
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "deny anon claims" on public.claims;
create policy "deny anon claims"
  on public.claims
  as restrictive
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "deny anon providers" on public.providers;
create policy "deny anon providers"
  on public.providers
  as restrictive
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists "deny anon applications" on public.applications;
create policy "deny anon applications"
  on public.applications
  as restrictive
  for select
  to anon
  using (false);

-- Staff identity policies.
drop policy if exists "staff can view own user row" on public.users;
create policy "staff can view own user row"
  on public.users
  for select
  to authenticated
  using (id = private.current_staff_user_id());

drop policy if exists "staff can view own user role links" on public.user_roles;
create policy "staff can view own user role links"
  on public.user_roles
  for select
  to authenticated
  using (user_id = private.current_staff_user_id());

drop policy if exists "staff can view own roles" on public.roles;
create policy "staff can view own roles"
  on public.roles
  for select
  to authenticated
  using (
    id in (
      select ur.role_id
      from public.user_roles ur
      where ur.user_id = private.current_staff_user_id()
    )
  );

drop policy if exists "staff can view own role permissions" on public.role_permissions;
create policy "staff can view own role permissions"
  on public.role_permissions
  for select
  to authenticated
  using (
    role_id in (
      select ur.role_id
      from public.user_roles ur
      where ur.user_id = private.current_staff_user_id()
    )
  );

drop policy if exists "staff can view own permissions" on public.permissions;
create policy "staff can view own permissions"
  on public.permissions
  for select
  to authenticated
  using (
    id in (
      select rp.permission_id
      from public.role_permissions rp
      join public.user_roles ur on ur.role_id = rp.role_id
      where ur.user_id = private.current_staff_user_id()
    )
  );

-- Operational staff roles with broad read access for containment.
-- These match current high-trust internal roles already enforced in route code.
drop policy if exists "staff can read members" on public.members;
create policy "staff can read members"
  on public.members
  for select
  to authenticated
  using (
    private.current_user_has_role(
      array[
        'admin',
        'system_admin',
        'operations_manager',
        'finance_manager',
        'claims',
        'call_centre_agent',
        'compliance_officer'
      ]::text[]
    )
  );

drop policy if exists "staff can read member_dependants" on public.member_dependants;
create policy "staff can read member_dependants"
  on public.member_dependants
  for select
  to authenticated
  using (
    private.current_user_has_role(
      array[
        'admin',
        'system_admin',
        'operations_manager',
        'finance_manager',
        'claims',
        'call_centre_agent',
        'compliance_officer'
      ]::text[]
    )
  );

drop policy if exists "staff can read claims" on public.claims;
create policy "staff can read claims"
  on public.claims
  for select
  to authenticated
  using (
    private.current_user_has_role(
      array[
        'admin',
        'system_admin',
        'operations_manager',
        'finance_manager',
        'claims',
        'call_centre_agent',
        'compliance_officer'
      ]::text[]
    )
  );

drop policy if exists "staff can read providers" on public.providers;
create policy "staff can read providers"
  on public.providers
  for select
  to authenticated
  using (
    private.current_user_has_role(
      array[
        'admin',
        'system_admin',
        'operations_manager',
        'finance_manager',
        'claims',
        'call_centre_agent',
        'compliance_officer'
      ]::text[]
    )
  );

drop policy if exists "staff can read applications" on public.applications;
create policy "staff can read applications"
  on public.applications
  for select
  to authenticated
  using (
    private.current_user_has_role(
      array[
        'admin',
        'system_admin',
        'operations_manager',
        'call_centre_agent',
        'compliance_officer',
        'onboarding'
      ]::text[]
    )
  );

-- Provider self-service access where user_id linkage exists.
drop policy if exists "linked providers can view own provider row" on public.providers;
create policy "linked providers can view own provider row"
  on public.providers
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "linked providers can view own claims" on public.claims;
create policy "linked providers can view own claims"
  on public.claims
  for select
  to authenticated
  using (
    provider_id in (
      select p.id
      from public.providers p
      where p.user_id = (select auth.uid())
    )
  );

commit;
