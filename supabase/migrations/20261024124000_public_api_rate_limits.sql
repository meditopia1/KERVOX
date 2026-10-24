begin;

create table if not exists public.api_rate_limits (
  scope text not null,
  subject_hash text not null,
  window_id bigint not null,
  expires_at timestamptz not null,
  hits integer not null default 0,
  primary key (scope, subject_hash, window_id)
);
create index if not exists api_rate_limits_expiry_idx on public.api_rate_limits (expires_at);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_scope text, p_subject_hash text, p_subject_limit integer,
  p_global_limit integer, p_window_seconds integer
) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  v_window bigint;
  v_expires timestamptz;
  v_hits integer;
begin
  if p_scope !~ '^[a-z_]{1,40}$' or p_subject_hash !~ '^[a-f0-9]{64}$'
    or p_subject_limit < 1 or p_global_limit < 1
    or p_window_seconds < 60 or p_window_seconds > 86400 then
    raise exception 'Invalid rate-limit parameters' using errcode = 'P0001';
  end if;
  v_window := floor(extract(epoch from clock_timestamp()) / p_window_seconds)::bigint;
  v_expires := to_timestamp((v_window + 1) * p_window_seconds);

  insert into public.api_rate_limits (scope, subject_hash, window_id, expires_at, hits)
  values (p_scope, p_subject_hash, v_window, v_expires, 1)
  on conflict (scope, subject_hash, window_id)
  do update set hits = public.api_rate_limits.hits + 1
  returning hits into v_hits;
  if v_hits > p_subject_limit then return false; end if;

  insert into public.api_rate_limits (scope, subject_hash, window_id, expires_at, hits)
  values (p_scope, repeat('0', 64), v_window, v_expires, 1)
  on conflict (scope, subject_hash, window_id)
  do update set hits = public.api_rate_limits.hits + 1
  returning hits into v_hits;

  -- Opportunistic cleanup keeps the table bounded without a scheduler.
  if random() < 0.01 then
    delete from public.api_rate_limits where expires_at < now() - interval '1 day';
  end if;
  return v_hits <= p_global_limit;
end; $$;

revoke all on function public.consume_api_rate_limit(text,text,integer,integer,integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text,text,integer,integer,integer)
  to service_role;

commit;
