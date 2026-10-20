# KERVOX Technology Stack

**Last updated:** July 12, 2026

This document replaces older project technology notes.

## Frontend

- Framework: Next.js 14 App Router
- Runtime: React 18
- Language: TypeScript
- Styling: Tailwind CSS
- UI patterns: shared sidebar shell, role-specific dashboards, local UI primitives
- Icons: Lucide React and HugeIcons where already used

## Backend

- API layer: Next.js API routes under `apps/frontend/src/app/api`
- Database: Supabase/PostgreSQL
- Auth: custom app auth plus Supabase-backed data access
- Data access: Supabase JS client and server-side helper modules
- Security: role-based app checks, RLS-aware database design, audit tables where applicable

## Document And OCR Processing

- Google Cloud Vision API for OCR where configured
- Tesseract.js fallback where local OCR is needed
- XLSX for spreadsheet imports and exports
- Hospital GOP and claims documents feed the hospital claims workspace workflow

## Payments And Collections

- Netcash is the active payment collection direction.
- Finance and operations workflows use payment groups, payment history, reconciliation, discrepancies, refunds, and batch concepts.
- Qsure is not the active implementation path and should not be used for current planning.

## Data Sources

- Members, brokers, products, providers, claims, hospital claims, payments, roles, and audit data live in Supabase/PostgreSQL.
- Project source spreadsheets and CSV files are kept under `apps/frontend/docs/data` or the relevant business docs folder.

## Local Commands

From `apps/frontend`:

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm test
```

The local dev server uses port `3001` via the frontend `dev` script.

## Current Caveat

`pnpm typecheck` currently reports existing test typing issues around Jest DOM matchers and one missing test import.

## Documentation Rules

- Current project documentation belongs under `apps/frontend/docs`.
- Project-level technical references belong under `apps/frontend/docs/project`.
- Claims/GOP documentation belongs under `apps/frontend/docs/claims`.
- Netcash documentation belongs under `apps/frontend/docs/netcash`.
