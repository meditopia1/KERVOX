-- Phase 1 emergency containment for Day1Health
-- Date: 2026-06-01
--
-- Goal:
-- - Stop anon/public reads on sensitive tables immediately.
-- - Keep authenticated staff reads working through the existing roles model.
-- - Avoid broader behavioral changes until post-deploy verification is complete.
--
-- Safer than the broader emergency draft because it:
-- - focuses on SELECT containment first
-- - does not add provider-specific self-service policies yet
-- - does not attempt member self-service RLS
-- - avoids UPDATE/INSERT/DELETE policy changes in phase 1
--
-- Review and test before applying to production.

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
    where ur.user_id = private.current_staff_user_id()
      and r.name = any(required_roles)
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.current_staff_user_id() to authenticated;
grant execute on function private.current_user_has_role(text[]) to authenticated;

-- Enable RLS on identity, authorization, and sensitive operational tables.
alter table if exists public.users enable row level security;
alter table if exists public.roles enable row level security;
alter table if exists public.user_roles enable row level security;
alter table if exists public.permissions enable row level security;
alter table if exists public.role_permissions enable row level security;
alter table if exists public.members enable row level security;
alter table if exists public.member_dependants enable row level security;
alter table if exists public.claims enable row level security;
alter table if exists public.providers enable row level security;
alter table if exists public.applications enable row level security;

-- Explicit anon/public read denial.
drop policy if exists "phase1 deny anon users" on public.users;
create policy "phase1 deny anon users"
  on public.users
  as restrictive
  for select
  to anon
  using (false);

drop policy if exists "phase1 deny anon roles" on public.roles;
create policy "phase1 deny anon roles"
  on public.roles
  as restrictive
  for select
  to anon
  using (false);

drop policy if exists "phase1 deny anon user_roles" on public.user_roles;
create policy "phase1 deny anon user_roles"
  on public.user_roles
  as restrictive
  for select
  to anon
  using (false);

drop policy if exists "phase1 deny anon permissions" on public.permissions;
create policy "phase1 deny anon permissions"
  on public.permissions
  as restrictive
  for select
  to anon
  using (false);

drop policy if exists "phase1 deny anon role_permissions" on public.role_permissions;
create policy "phase1 deny anon role_permissions"
  on public.role_permissions
  as restrictive
  for select
  to anon
  using (false);

drop policy if exists "phase1 deny anon members" on public.members;
create policy "phase1 deny anon members"
  on public.members
  as restrictive
  for select
  to anon
  using (false);

drop policy if exists "phase1 deny anon member_dependants" on public.member_dependants;
create policy "phase1 deny anon member_dependants"
  on public.member_dependants
  as restrictive
  for select
  to anon
  using (false);

drop policy if exists "phase1 deny anon claims" on public.claims;
create policy "phase1 deny anon claims"
  on public.claims
  as restrictive
  for select
  to anon
  using (false);

drop policy if exists "phase1 deny anon providers" on public.providers;
create policy "phase1 deny anon providers"
  on public.providers
  as restrictive
  for select
  to anon
  using (false);

drop policy if exists "phase1 deny anon applications" on public.applications;
create policy "phase1 deny anon applications"
  on public.applications
  as restrictive
  for select
  to anon
  using (false);

-- Staff can read their own identity and authorization rows.
drop policy if exists "phase1 staff read own user row" on public.users;
create policy "phase1 staff read own user row"
  on public.users
  for select
  to authenticated
  using (id = private.current_staff_user_id());

drop policy if exists "phase1 staff read own user_roles" on public.user_roles;
create policy "phase1 staff read own user_roles"
  on public.user_roles
  for select
  to authenticated
  using (user_id = private.current_staff_user_id());

drop policy if exists "phase1 staff read own roles" on public.roles;
create policy "phase1 staff read own roles"
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

drop policy if exists "phase1 staff read own role_permissions" on public.role_permissions;
create policy "phase1 staff read own role_permissions"
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

drop policy if exists "phase1 staff read own permissions" on public.permissions;
create policy "phase1 staff read own permissions"
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

-- Broad internal staff read access for continuity during containment.
drop policy if exists "phase1 staff read members" on public.members;
create policy "phase1 staff read members"
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

drop policy if exists "phase1 staff read member_dependants" on public.member_dependants;
create policy "phase1 staff read member_dependants"
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

drop policy if exists "phase1 staff read claims" on public.claims;
create policy "phase1 staff read claims"
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

drop policy if exists "phase1 staff read providers" on public.providers;
create policy "phase1 staff read providers"
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

drop policy if exists "phase1 staff read applications" on public.applications;
create policy "phase1 staff read applications"
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

commit;
