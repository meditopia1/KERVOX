-- Count failed PIN attempts atomically; the old read-then-write route allowed
-- concurrent requests to overwrite each other's counters.
begin;

create or replace function public.record_member_login_failure(p_member_id uuid)
returns table(attempts integer, lock_expires_at timestamp without time zone)
language sql
security invoker
set search_path = ''
as $$
  update public.members
  set failed_login_attempts = coalesce(failed_login_attempts, 0) + 1,
      locked_until = case
        when coalesce(failed_login_attempts, 0) + 1 >= 5
          then (now() at time zone 'utc') + interval '30 minutes'
        else locked_until
      end
  where id = p_member_id
    and (locked_until is null or locked_until <= (now() at time zone 'utc'))
  returning failed_login_attempts, locked_until;
$$;

revoke all on function public.record_member_login_failure(uuid) from public, anon, authenticated;
grant execute on function public.record_member_login_failure(uuid) to service_role;

commit;
