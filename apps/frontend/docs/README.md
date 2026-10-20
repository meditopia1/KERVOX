# KERVOX Documentation

This is the single documentation home for the KERVOX project.

## Start Here

- [project/CURRENT_DASHBOARD_ROLES.md](./project/CURRENT_DASHBOARD_ROLES.md) - current dashboard role definition
- [project/CURRENT_DATABASE_SNAPSHOT.md](./project/CURRENT_DATABASE_SNAPSHOT.md) - current live member, dependant, broker, and cleanup snapshot
- [project/CURRENT_INFRASTRUCTURE.md](./project/CURRENT_INFRASTRUCTURE.md) - current hosting, database, and environment direction
- [project/MEDICAL_INSURER_OPERATING_MODEL_REFERENCE.md](./project/MEDICAL_INSURER_OPERATING_MODEL_REFERENCE.md) - current medical-insurer operating model reference
- [project/STRUCTURE_IMPLEMENTATION_SUMMARY.md](./project/STRUCTURE_IMPLEMENTATION_SUMMARY.md) - current project structure summary
- [project/TECH_STACK.md](./project/TECH_STACK.md) - current technology stack
- [project/CURRENT_PROVIDER_WORKSTATE.md](./project/CURRENT_PROVIDER_WORKSTATE.md) - current provider documentation baseline
- [claims/workspace/CLAIMS_WORKSPACE_EXCEL_PLUS_DESIGN.md](./claims/workspace/CLAIMS_WORKSPACE_EXCEL_PLUS_DESIGN.md) - hospital claims workspace plan and current flow
- [netcash/README.md](./netcash/README.md) - Netcash collection and payment processing
- [netcash/CURRENT_NETCASH_WORKSTATE.md](./netcash/CURRENT_NETCASH_WORKSTATE.md) - current Netcash implementation baseline

## Current Dashboard Roles

In KERVOX planning, a **role** means a unique dashboard or portal experience with its own sidebar and workflow.

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

## Folder Structure

### `project/`

Project-level references, system setup, dashboard roles, plans, member filters, import templates, and current provider workstate.

### `data/`

Source data files such as member and provider spreadsheets/CSVs.

### `claims/`

Claims forms, GOP/pre-authorization templates, tariffs, workflows, and hospital claims workspace documentation.

### `netcash/`

Netcash debit order, transaction, refund, webhook, and reconciliation documentation.

### `benefits/`

Benefit limits, waiting periods, exclusions, and benefit configuration references.

### `compliance/`

Compliance, CMS, PMB, and Medical Schemes Act documentation.

### `operations/`

Operational training, SLAs, provider contracts, and process documents.

### `guides/`

Current setup notes, operational guides, and narrow implementation references. Old status reports, completion notes, and stale copy-paste SQL snippets should not live here.

### `internal-review/`

Security/OCR review notes that are still useful. Historical implementation-complete notes should be removed once superseded by current project docs.

### `cover plan brochures/`

Plan brochures and public-facing product PDFs.

### `private/`

Local/private notes that should not be treated as public product documentation.

## Documentation Rules

1. Keep all project documentation under this folder.
2. Do not create a second root `docs/` folder.
3. Use dashboard-role terminology from `project/CURRENT_DASHBOARD_ROLES.md`.
4. Put provider-specific payment docs in their own folder. Netcash remains under `netcash/`.
5. Keep claims and GOP material under `claims/`.

## Last Updated

July 15, 2026
