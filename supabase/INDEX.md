# Supabase Folder Index

**Last updated:** July 12, 2026

This folder is for database migrations, schema support scripts, and Supabase/Postgres operational helpers.

## Current Rule

Do not treat hardcoded historical project refs in old notes as current. The current Supabase environments are defined by runtime environment files and provider dashboards:

- `apps/frontend/.env`
- `apps/frontend/.env.local`
- Vercel environment variables
- Supabase dashboards

Do not commit passwords, service-role secrets, database URLs with passwords, or one-off dump files.

## Important Folders

- `migrations/` - reviewed schema migrations that belong in Git
- root `supabase/*.js` - operational helpers and inspection scripts
- root `supabase/*.sql` - only keep reviewed SQL that is still useful and not a stale one-off

## Related Current Docs

- `apps/frontend/docs/project/CURRENT_INFRASTRUCTURE.md`
- `apps/frontend/docs/project/TECH_STACK.md`
- `apps/frontend/docs/project/STRUCTURE_IMPLEMENTATION_SUMMARY.md`
- `apps/frontend/docs/claims/workspace/CLAIMS_WORKSPACE_EXCEL_PLUS_DESIGN.md`
- `apps/frontend/docs/netcash/README.md`
