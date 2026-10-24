begin;

-- EFT files contain payment instructions. Never serve this bucket publicly.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('eft-files', 'eft-files', false, 10485760, array['text/plain'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "deny_direct_eft_access" on storage.objects;
create policy "deny_direct_eft_access" on storage.objects
as restrictive for all to anon, authenticated
using (bucket_id <> 'eft-files')
with check (bucket_id <> 'eft-files');

create or replace function public.process_payment_batch(
  p_batch_id uuid, p_user_id uuid, p_eft_path text
) returns public.payment_batches
language plpgsql security invoker set search_path = '' as $$
declare v_batch public.payment_batches%rowtype;
begin
  if p_eft_path !~ '^batches/[A-Za-z0-9_-]+\.txt$' then
    raise exception 'Invalid EFT path' using errcode = 'P0001';
  end if;
  select * into v_batch from public.payment_batches where id = p_batch_id for update;
  if not found then raise exception 'Batch not found' using errcode = 'P0002'; end if;
  if v_batch.status <> 'approved' then
    raise exception 'Batch is not approved' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.claim_payments where payment_batch_id = p_batch_id) then
    raise exception 'Batch has no payments' using errcode = 'P0001';
  end if;
  update public.claim_payments set payment_status = 'processing', updated_at = now()
  where payment_batch_id = p_batch_id;
  update public.payment_batches set status = 'processing',
    eft_file_generated = true, eft_file_url = p_eft_path,
    eft_file_generated_at = now(), processed_by = p_user_id,
    processed_at = now(), updated_at = now()
  where id = p_batch_id returning * into v_batch;
  return v_batch;
end; $$;

create or replace function public.cancel_payment_batch(p_batch_id uuid)
returns public.payment_batches
language plpgsql security invoker set search_path = '' as $$
declare v_batch public.payment_batches%rowtype;
begin
  select * into v_batch from public.payment_batches where id = p_batch_id for update;
  if not found then raise exception 'Batch not found' using errcode = 'P0002'; end if;
  if v_batch.status not in ('draft', 'approved') then
    raise exception 'Batch cannot be cancelled' using errcode = 'P0001';
  end if;
  update public.claim_payments set payment_status = 'cancelled', updated_at = now()
  where payment_batch_id = p_batch_id;
  update public.payment_batches set status = 'cancelled', updated_at = now()
  where id = p_batch_id returning * into v_batch;
  return v_batch;
end; $$;

revoke all on function public.process_payment_batch(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.cancel_payment_batch(uuid) from public, anon, authenticated;
grant execute on function public.process_payment_batch(uuid, uuid, text) to service_role;
grant execute on function public.cancel_payment_batch(uuid) to service_role;

commit;
