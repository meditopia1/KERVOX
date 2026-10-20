# KERVOX Medical Insurer Operating Model Reference

**Last updated:** July 11, 2026

This document preserves the useful business and compliance intent from older medical-insurer specification notes. It is a reference document, not a promise that every item is already implemented.

## Current Position

KERVOX is being built as a South African health-insurance operating system, not as a medical scheme.

The system must support member administration, products, brokers, providers, authorization, claims, hospital GOP processing, payments, collections, compliance, reporting, and auditability.

## Important Current Corrections

The older specification notes included some assumptions that are no longer current:

- The active application is the Next.js frontend in `apps/frontend`, not a NestJS backend architecture.
- Netcash is the active payment and collection direction.
- Qsure, PayFast, and generic DebiCheck planning should not be treated as current implementation direction.
- Project “roles” in planning mean dashboard/portal lanes. The canonical list is in [CURRENT_DASHBOARD_ROLES.md](./CURRENT_DASHBOARD_ROLES.md).
- Hospital GOP and hospital claims workspace flows are now central to claims planning.

## Core Business Domains

1. Identity and access
2. Member and policy administration
3. Product and benefit rules
4. Broker management
5. Provider network management
6. Authorization and benefit verification
7. GOP intake and hospital claims workspace
8. Claims processing and adjudication
9. Payments, collections, refunds, and reconciliation
10. Finance ledger and reporting
11. Marketing, leads, and onboarding
12. Compliance, risk, audit, and governance

## Compliance Principles To Keep

- POPIA controls for health and identity data
- Purpose-specific consent capture
- Least-privilege access to sensitive member and health information
- Audit logs for critical access and decisions
- Data subject request workflows
- Breach and incident management workflows
- Separation of duties for sensitive approvals
- Immutable or append-only audit trails where feasible
- Role assignment and permission-change auditability

## Product And Benefit Governance

The system should support controlled creation and maintenance of:

- insurance products
- plan variants
- benefit limits
- waiting periods
- exclusions
- pricing rules
- policy wording and plan documents
- product publication approvals

Sensitive product and benefit-rule changes should not be made and approved by the same person.

## Member And Group Administration

The operating model should support:

- individual member onboarding
- group/employer onboarding
- member number generation
- dependant management
- product/plan assignment
- payment mandate or collection setup
- member status tracking
- policy activation based on rules and waiting periods
- member document storage and verification

## Authorization And GOP

Authorization users need controlled access to verify member status and benefit availability.

The current Authorization dashboard supports:

- Ambulance verification and ambulance benefit checks
- Africa Assist verification and hospital benefit checks
- Africa Assist GOP upload into the hospital claims intake flow

The GOP flow should feed the Claims hospital workspace and notify Claims when a new GOP intake is waiting.

## Claims And Hospital Workspace

The current claims direction separates:

- standard claims queues and adjudication
- hospital claims workspace
- GOP/application intake
- claim form review
- hospital claims register rows
- hospital claims payments, audit, history, and documents

Claim forms often arrive after GOP data has already populated the hospital claims workspace. The system should scan claim forms mainly to flag material differences against the existing claim/register data, then prompt an admin to review the claim document when differences are significant.

Members should eventually be able to upload claim forms from the member dashboard.

## Payments And Collections

Netcash is the current collection direction.

The payment model should support:

- payment groups
- member payment history
- collection batches
- debit order results
- reconciliation
- discrepancies
- refunds
- audit trails
- finance reporting

Current Netcash material lives in [../netcash/README.md](../netcash/README.md).

## Auditability

The system should preserve enough detail to reproduce key decisions, including:

- claim decisions
- benefit-rule changes
- member status changes
- payment and refund decisions
- broker or group changes
- authorization/GOP actions
- access to special personal information

## Reporting Direction

Reporting should cover:

- member and policy counts
- active/suspended/cancelled status
- claims volumes and outcomes
- hospital claims workspace totals
- payment collection results
- refunds and reversals
- broker/group performance
- compliance/audit activity
- operational dashboard summaries

## Use This Document For

- business-scope discussions
- compliance planning
- operating model alignment
- roadmap planning
- checking whether new features fit the KERVOX system shape

Do not use this document as a schema, migration, or exact route map.
