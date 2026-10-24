-- Complete the batch, claim payments, and linked claims in one database
-- transaction. A row lock serializes concurrent completion attempts.
begin;

create or replace function public.complete_payment_batch(p_batch_id uuid)
returns public.payment_batches
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_batch public.payment_batches%rowtype;
  v_payment record;
  v_claim_number text;
  v_payment_date date := (now() at time zone 'utc')::date;
  v_reference text;
begin
  select * into v_batch
  from public.payment_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'Payment batch not found' using errcode = 'P0002';
  end if;
  if v_batch.status <> 'processing' then
    raise exception 'Payment batch is not processing' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.claim_payments where payment_batch_id = p_batch_id
  ) then
    raise exception 'Payment batch has no payments' using errcode = 'P0001';
  end if;

  for v_payment in
    select id, claim_id
    from public.claim_payments
    where payment_batch_id = p_batch_id
    order by id
    for update
  loop
    select claim_number into v_claim_number
    from public.claims
    where id = v_payment.claim_id
    for update;
    if not found then
      raise exception 'Payment is missing its claim' using errcode = 'P0001';
    end if;

    v_reference := 'PAY-' || v_claim_number || '-' || to_char(v_payment_date, 'YYYYMMDD');
    update public.claim_payments
    set payment_status = 'paid',
        payment_date = v_payment_date,
        payment_reference = v_reference,
        updated_at = now()
    where id = v_payment.id;

    update public.claims
    set paid_date = now(),
        payment_reference = v_reference,
        updated_at = now()
    where id = v_payment.claim_id;
  end loop;

  update public.payment_batches
  set status = 'completed', completed_at = now(), updated_at = now()
  where id = p_batch_id
  returning * into v_batch;

  return v_batch;
end;
$$;

revoke all on function public.complete_payment_batch(uuid) from public, anon, authenticated;
grant execute on function public.complete_payment_batch(uuid) to service_role;

commit;
