# Supabase Folder Structure

**Last updated:** July 12, 2026

This folder contains database migrations, schema support scripts, and Supabase/Postgres operational helpers. It is not the place for secrets, database dumps, or one-off import files.

## Structure

```text
supabase/
├── INDEX.md
├── FOLDER_STRUCTURE.md
├── config.toml
├── migrations/
├── *.js
└── *.sql
```

## What Belongs Here

- Reviewed migrations under `migrations/`
- Safe inspection and maintenance scripts that do not hardcode secrets
- Reviewed reusable SQL snippets that remain current

## What Does Not Belong Here

- Database dumps
- Passwords or full connection strings
- One-off SQL files generated during a manual clone/import
- Old provider/setup plans that point at retired infrastructure

## Current Environment Rule

Runtime environment values live in:

- `apps/frontend/.env`
- `apps/frontend/.env.local`
- Vercel environment variables
- Supabase dashboards

Confirm the intended source, target, staging, or production database before running migration, import, or clone commands.
