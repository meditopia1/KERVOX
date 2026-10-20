# KERVOX Project Structure Summary

**Last updated:** July 12, 2026

This document replaces older project structure notes. The single documentation home is `apps/frontend/docs`.

## Repository Shape

```text
KERVOX/
├── apps/
│   └── frontend/              # Next.js application
├── apps/frontend/docs/        # Single project documentation home
├── package.json               # Root workspace configuration
└── pnpm-lock.yaml             # Workspace lockfile
```

## Frontend Application

```text
apps/frontend/
├── src/
│   ├── app/                   # Next.js App Router pages and API routes
│   ├── components/            # React components
│   ├── contexts/              # Auth and app context providers
│   ├── lib/                   # API clients, Supabase helpers, utilities
│   └── types/                 # Shared TypeScript types
├── docs/                      # Consolidated KERVOX documentation
├── public/                    # Static assets
├── scripts/                   # Data import, OCR, validation, and utility scripts
└── package.json               # Frontend scripts and dependencies
```

## Current Dashboard Roles

In KERVOX planning, a role means a dashboard or portal experience, not a low-level RBAC/database role.

1. Admin
2. Operations
3. Marketing
4. Broker
5. Compliance
6. Finance
7. Claims
8. Provider
9. Call Centre
10. Authorization
11. Member
12. Onboarding

The canonical role reference is [CURRENT_DASHBOARD_ROLES.md](./CURRENT_DASHBOARD_ROLES.md).

## Main Application Areas

- `/admin/*` - administration, members, products, roles, audit, data import
- `/operations/*` - operational controls, members, groups, providers, arrears, reports
- `/marketing/*` - leads, campaigns, landing pages, content, analytics
- `/broker/*` - broker leads, quotes, applications, policies, commissions
- `/compliance/*` - POPIA, data requests, breaches, complaints, compliance reports
- `/finance/*` - ledger, journals, reconciliation, trial balance, payment batches
- `/claims/*` - claims dashboard, queue, fraud, pre-auth, hospital claims workspace
- `/provider/*` - provider dashboard, eligibility, claims, pre-auth, payments
- `/call-centre/*` - member support, member lookup, tickets, knowledge base
- `/authorizations/*` - ambulance and Africa Assist verification, benefit checks, GOP intake
- `/member/*` and `/dashboard` - member-facing portal work

## Documentation Layout

```text
apps/frontend/docs/
├── project/                   # Project-level references, current role definitions, provider workstate
├── claims/                    # Claims, GOP, forms, workflows, hospital claims workspace
├── netcash/                   # Netcash collection, debit order, webhook, refund docs
├── benefits/                  # Benefit rules, waiting periods, limits, exclusions
├── compliance/                # Compliance, CMS, PMB, Medical Schemes Act material
├── operations/                # Operational process documents
├── guides/                    # Current setup and operational guides
├── internal-review/           # Current security/OCR review notes
├── data/                      # Source spreadsheets and CSV files
├── cover plan brochures/      # Product brochures
└── private/                   # Local/private notes
```

## Current Process Notes

- Netcash is the active payment collection path.
- The canonical Netcash status note is `apps/frontend/docs/netcash/CURRENT_NETCASH_WORKSTATE.md`.
- Qsure material has been removed from active documentation.
- Current infrastructure direction is documented in [CURRENT_INFRASTRUCTURE.md](./CURRENT_INFRASTRUCTURE.md).
- Hospital claims are handled through the hospital claims workspace and related GOP intake flow.
- Africa Assist can submit GOP documents through the Authorization dashboard, which feeds the Claims hospital workspace notification flow.

## Rules

1. Keep all project docs under `apps/frontend/docs`.
2. Do not recreate a root `docs/` folder.
3. Keep claims and GOP material under `apps/frontend/docs/claims`.
4. Keep Netcash material under `apps/frontend/docs/netcash`.
5. Treat older external planning/status files as historical unless migrated into this docs tree.
