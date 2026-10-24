-- Historical setup instructions granted every browser direct CRUD access to
-- application documents. Do not recreate those policies. Uploads now pass
-- through /api/upload, which validates destination, size, type and staff role
-- before using a server-only key. The current security migration removes the
-- old public policies and blocks direct browser-token writes to these buckets:
-- supabase/migrations/20261024114528_restrict_contact_and_storage_access.sql

-- Read-only verification in Supabase SQL Editor:
select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
