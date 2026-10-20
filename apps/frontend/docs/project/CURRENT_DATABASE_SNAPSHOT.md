# Current Database Snapshot

**Last updated:** July 15, 2026

This document records the current live database state after the July 15, 2026 cleanup work on the active Supabase project used by `apps/frontend/.env.local`.

## Current Live Counts

- `members`: `1068`
- `member_dependants`: `985`
- Combined member admin total (`members + member_dependants`): `2053`
- `brokers`: `17`

## Cleanup Changes Applied

### Member removals

- Deleted all `members` rows whose `member_number` started with `DAY1`.
- Removed linked records that were tied to those `DAY1` members during cleanup, including dependent and hospital-claims rows that blocked deletion.

### Plan-name normalization

- Removed the literal word `DAY1` from `members.plan_name` wherever it appeared.
- `903` member rows were updated in place.
- Example changes:
  - `DAY1 VALUE PLUS PLAN` -> `VALUE PLUS PLAN`
  - `DAY1 EXECUTIVE PLAN` -> `EXECUTIVE PLAN`
  - `DAY1 OPTION 3` -> `OPTION 3`

### Targeted test-account removals

- Removed `TEST-GOP-001`
- Removed `TEST-AMBU-001`
- Verified that no linked dependant, pre-authorization, auth-user, application, or contact records remained for those two accounts after cleanup.

### Broker removals

- Removed broker `NAV / Day1 Navigator`
- Removed broker `DAY1 / Day1Health Direct`
- Removed the remaining orphan rows that still used those prefixes in:
  - `member_dependants`
  - `hospital_claims_register`

## Current Broker Reality

The live `brokers` table no longer contains `NAV` or `DAY1`.

Current broker examples include:

- `PAR` - `Parabellum`
- `MAM` - `Mamela`
- `AXS` - `Accsure`
- `MED` - `Medi-Safu Brokers`
- `MBM` - `Medi-Safu Brokers Montana`

## Current Plan Examples

Current common `members.plan_name` values include:

- `VALUE PLUS PLAN`
- `EXECUTIVE PLAN`
- `SENIOR COMPREHENSIVE PLAN`
- `PLATINUM OPTION 3`
- `VALUE PLUS UMBRELLA`

## Documentation Rule

When another document needs a current live member count, dependant count, broker total, or cleanup status, use this file as the current reference instead of older inline numbers.
