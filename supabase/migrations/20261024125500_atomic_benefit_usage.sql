begin;

create or replace function public.increment_benefit_usage(
  p_member_id uuid, p_benefit_type text, p_year integer, p_amount numeric
) returns public.benefit_usage
language plpgsql security invoker set search_path = '' as $$
declare v_usage public.benefit_usage%rowtype;
begin
  if p_amount is null or p_amount <= 0 or p_amount > 1000000000
    or p_year < 2000 or p_year > 2100
    or length(p_benefit_type) < 1 or length(p_benefit_type) > 80 then
    raise exception 'Invalid benefit usage increment' using errcode = 'P0001';
  end if;
  update public.benefit_usage
  set used_amount = coalesce(used_amount, 0) + p_amount,
      used_count = coalesce(used_count, 0) + 1,
      remaining_amount = case when total_limit_amount is null then null
        else greatest(total_limit_amount - coalesce(used_amount, 0) - p_amount, 0) end,
      remaining_count = case when total_limit_count is null then null
        else greatest(total_limit_count - coalesce(used_count, 0) - 1, 0) end,
      last_claim_date = (now() at time zone 'utc')::date,
      updated_at = now()
  where member_id = p_member_id and benefit_type = p_benefit_type and year = p_year
  returning * into v_usage;
  return v_usage;
end; $$;

revoke all on function public.increment_benefit_usage(uuid,text,integer,numeric)
  from public, anon, authenticated;
grant execute on function public.increment_benefit_usage(uuid,text,integer,numeric)
  to service_role;

commit;
