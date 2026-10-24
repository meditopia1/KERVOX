-- The legacy auth.role() = 'authenticated' policies granted every signed-in
-- account read/write access to every application and dependant. Preserve the
-- already-installed staff role policy for applications, and scope dependants
-- to the same staff roles. Server-role public submission is unaffected.
begin;

alter table public.applications enable row level security;
alter table public.application_dependents enable row level security;

drop policy if exists "Authenticated users can view applications" on public.applications;
drop policy if exists "Authenticated users can update applications" on public.applications;
drop policy if exists "Authenticated users can view dependents" on public.application_dependents;

drop policy if exists "staff read application dependants" on public.application_dependents;
create policy "staff read application dependants"
  on public.application_dependents
  for select
  to authenticated
  using (
    private.current_user_has_role(
      array[
        'admin', 'system_admin', 'operations_manager',
        'call_centre_agent', 'compliance_officer', 'onboarding'
      ]::text[]
    )
  );

-- These security-definer summary views were directly selectable by anon.
-- Staff APIs may still use them through the server role if needed.
revoke select on public.hosp_claim_annual_summary from anon, authenticated;
revoke select on public.hosp_claim_monthly_summary from anon, authenticated;

commit;
