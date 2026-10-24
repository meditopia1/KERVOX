-- Apply only after the signed-view API rollout is live. Stored public-format
-- URLs remain durable object identifiers; direct public reads become denied.
set lock_timeout = '5s';

do $$
begin
  if (select count(*) from storage.buckets where id in ('applications', 'call-recordings')) <> 2 then
    raise exception 'Expected both sensitive storage buckets to exist';
  end if;
end;
$$;

update storage.buckets
set public = false
where id in ('applications', 'call-recordings');
