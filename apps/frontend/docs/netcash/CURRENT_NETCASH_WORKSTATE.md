# KERVOX Netcash Workstate

**Last updated:** July 12, 2026

This document is the current Netcash reference for KERVOX.

## Current Direction

Netcash is the active collection and debit-order path for this project.

Qsure is not the active implementation direction and should not be used for current planning.

## What Exists In The App

The current repo contains frontend Netcash-related work under:

- `/operations/debit-orders`
- `/operations/debit-orders/run`
- `apps/frontend/src/app/api/operations/debit-orders/today/route.ts`

That means the active codebase direction is centered on the Operations dashboard and frontend/API route work that lives inside `apps/frontend`.

## What This Folder Should Cover

Use the Netcash docs folder for:

- collection-method rules
- debit-order workflow planning
- Netcash batch and reference design
- webhook handling notes
- refund and transaction-flow planning
- database notes tied to collections and reconciliation

## Current Documentation Rule

Do not treat older docs with labels like `COMPLETE` as canonical just because they contain implementation detail.

If a Netcash document describes:

- a backend app that no longer exists in this repo
- finished implementation that is not reflected in current routes
- old architecture that conflicts with the current frontend-first structure

then it should be treated as historical and removed or rewritten.

## Near-Term Netcash Work

1. Confirm the real current debit-order workflow inside the Operations dashboard.
2. Align Netcash docs with the current database and route structure.
3. Add provider documentation from Netcash only when real API material or business flow confirmation is available.
4. Keep reconciliation, refund, and webhook notes tied to the actual KERVOX implementation path.
