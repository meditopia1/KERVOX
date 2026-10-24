-- Direct browser access to legacy contact data and upload objects was broader
-- than the server's role-checked API. All intended writes now use server-side
-- clients. Keep this migration separate from any bucket-privacy transition:
-- public bucket download URLs remain public until consumers use signed access.
begin;

alter table public.contacts enable row level security;
alter table public.contact_interactions enable row level security;
alter table public.popia_audit_log enable row level security;

drop policy if exists "Anyone can create contacts" on public.contacts;
drop policy if exists "Authenticated users can view contacts" on public.contacts;
drop policy if exists "Authenticated users can update contacts" on public.contacts;
drop policy if exists "Authenticated users can manage interactions" on public.contact_interactions;
drop policy if exists "Authenticated users can view audit log" on public.popia_audit_log;
drop policy if exists "System can insert audit log" on public.popia_audit_log;

revoke all on public.contacts from anon, authenticated;
revoke all on public.contact_interactions from anon, authenticated;
revoke all on public.popia_audit_log from anon, authenticated;
do $$
begin
  if to_regclass('public.marketing_contacts') is not null then
    execute 'revoke all on public.marketing_contacts from anon, authenticated';
  end if;
end;
$$;

-- The old setup guide created public INSERT/SELECT/UPDATE/DELETE storage
-- policies. Remove them and ensure no other permissive policy can grant
-- browser-token CRUD on these sensitive buckets. Service-role uploads through
-- /api/upload continue to work because service_role bypasses RLS.
drop policy if exists "Allow public uploads" on storage.objects;
drop policy if exists "Allow public reads" on storage.objects;
drop policy if exists "Allow public updates" on storage.objects;
drop policy if exists "Allow public deletes" on storage.objects;

drop policy if exists "Browser tokens cannot manage KERVOX private uploads" on storage.objects;
create policy "Browser tokens cannot manage KERVOX private uploads"
  on storage.objects
  as restrictive
  for all
  to anon, authenticated
  using (bucket_id not in ('applications', 'call-recordings'))
  with check (bucket_id not in ('applications', 'call-recordings'));

commit;
