# Current Infrastructure

**Last updated:** July 15, 2026

This document is the current infrastructure reference for KERVOX. It replaces the older Google Cloud / Cloud SQL self-hosting plan.

## Current Reality

- **Application hosting:** Vercel for the Next.js frontend.
- **Primary application:** `apps/frontend`.
- **Database platform:** Supabase/PostgreSQL.
- **Source database:** Day1Main self-hosted Supabase environment.
- **Secondary/clone database:** Separate Supabase project used as a full working clone when needed.
- **Database cloning approach:** Manual dump/restore or table-by-table SQL export/import when a full refresh is needed.

Actual database URLs, anon keys, and service-role keys belong only in environment files and provider dashboards. Do not put secrets in documentation.

## Environment Files

- `apps/frontend/.env` and `apps/frontend/.env.local` may point at different Supabase environments.
- Treat the env files as local configuration, not as canonical public documentation.
- Before changing Vercel or local runtime config, confirm which environment is intended as source, target, staging, or production.

## Removed/Stale Plan

The previous Google Cloud Johannesburg / Cloud SQL / Cloud Run self-hosted Supabase plan is not the active direction and has been removed from active documentation to avoid confusion.

## Operational Notes

- Keep current Supabase schema changes in `supabase/migrations`.
- Keep one-off SQL exports/imports out of Git unless they are promoted to a reviewed migration.
- Keep payment-provider documentation separated by provider. Netcash documentation belongs in `apps/frontend/docs/netcash`.
- Keep claims/GOP documentation under `apps/frontend/docs/claims`.
- The current live data snapshot and cleanup state belong in `apps/frontend/docs/project/CURRENT_DATABASE_SNAPSHOT.md`.
