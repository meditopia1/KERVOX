# RLS Containment Plan

Date: 2026-06-01

This document translates the verified security findings into an immediate containment plan that matches the actual Day1 data model.

## Current verified state

Live testing confirmed that `anon` access can read rows from sensitive tables including:

- `members`
- `member_dependants`
- `claims`
- `providers`
- `users`

This means the current problem is not just "RLS not verified." Sensitive business data is readable through low-trust API access today.

## What the live data model allows us to do right now

### Staff access can be tied to authentication

The app authenticates department users through Supabase Auth, then maps them into the custom `users` table by email in [apps/frontend/src/lib/auth-server.ts](../../../../apps/frontend/src/lib/auth-server.ts:1).

Live data confirms:

- `users` exists and is populated
- `roles` exists and is populated
- `user_roles` exists and is populated

This means staff-facing RLS can be implemented now by mapping the authenticated user email to the internal `users` and `user_roles` tables.

### Provider access is only partially linkable

The provider auth path expects `providers.user_id = auth.uid()` in [apps/frontend/src/lib/auth-server.ts](../../../../apps/frontend/src/lib/auth-server.ts:54).

Live data confirms:

- `providers`: 1,916 total rows
- only 1 row currently has `user_id` populated

This means provider-specific RLS is only safely enforceable for linked provider accounts right now.

### Member self-access is not yet linkable

Members are still using a custom email and PIN login flow in [apps/frontend/src/app/api/member/login/route.ts](../../../../apps/frontend/src/app/api/member/login/route.ts:1).

Live data confirms:

- `members`: 2,330 total rows
- 0 rows have `user_id` populated
- only 1 row has `mobile` populated

This means member self-service RLS cannot be implemented cleanly yet because there is no reliable identity linkage from authenticated user to member row.

## Immediate containment goals

### Goal 1: Block `anon` reads on sensitive tables

This is the highest priority.

Target tables:

- `members`
- `member_dependants`
- `claims`
- `providers`
- `users`
- `user_roles`
- `roles`
- `role_permissions`
- `permissions`
- `applications`

Expected effect:

- direct public reads stop working
- access becomes explicit instead of accidental

### Goal 2: Preserve staff functionality through authenticated policies

Staff routes should keep working under authenticated access while `anon` is blocked.

This requires:

- authenticated users can read their own `users` row
- authenticated users can read their own role mappings
- staff roles such as `admin`, `system_admin`, `operations_manager`, `claims`, `finance_manager`, `call_centre_agent`, and `compliance_officer` can read the operational data they need

### Goal 3: Keep provider and member portals working only where identity is trustworthy

For providers:

- allow linked provider accounts to read their own provider row and claims where linkage exists
- do not assume broad provider self-service access until `providers.user_id` is populated consistently

For members:

- do not attempt member self-service RLS yet
- first establish a real member identity link such as `members.user_id`

## Immediate route-level blockers

RLS alone will not fix every current exposure because some routes still use `service_role` without strong user binding.

### High-risk member routes

- [apps/frontend/src/app/api/member/profile/route.ts](../../../../apps/frontend/src/app/api/member/profile/route.ts:1)
- [apps/frontend/src/app/api/member/claims/route.ts](../../../../apps/frontend/src/app/api/member/claims/route.ts:1)

Problems:

- they use `service_role`
- they are not bound to a trusted authenticated member identity
- one route still accepts `member_id` from the query string

These routes should be treated as insecure until member identity linkage is implemented.

### Provider claims route

This was previously trusting caller-supplied `provider_id`.

Status:

- patched to require provider auth and derive `providerId` from the authenticated user

Relevant files:

- [apps/frontend/src/app/api/provider/claims/route.ts](../../../../apps/frontend/src/app/api/provider/claims/route.ts:1)
- [apps/frontend/src/app/provider/dashboard/page.tsx](../../../../apps/frontend/src/app/provider/dashboard/page.tsx:1)
- [apps/frontend/src/app/provider/claims/history/page.tsx](../../../../apps/frontend/src/app/provider/claims/history/page.tsx:1)

## Recommended containment phases

### Phase A: Emergency database containment

Apply RLS to sensitive tables and remove `anon` read access.

Recommended draft for first apply:

- [supabase/migrations/20260601_phase1_anon_block_containment.sql](../../../../supabase/migrations/20260601_phase1_anon_block_containment.sql:1)
- Verification script: [supabase/verify-phase1-rls.js](../../../../supabase/verify-phase1-rls.js:1)

Broader follow-up draft:

- [supabase/migrations/20260601_emergency_rls_containment.sql](../../../../supabase/migrations/20260601_emergency_rls_containment.sql:1)

Success condition:

- public unauthenticated reads stop returning rows from the sensitive tables

Suggested rollout sequence:

1. Run `node supabase/verify-phase1-rls.js` before any SQL changes to capture the current exposure.
2. Apply `20260601_phase1_anon_block_containment.sql` in the target environment.
3. Run `node supabase/verify-phase1-rls.js` again.
4. Confirm:
   - `anon` can no longer read the sensitive tables
   - `service_role` still works
   - authenticated staff still works if `RLS_TEST_STAFF_BEARER_TOKEN` is supplied

Current verification status as of 2026-06-01:

- `anon` verification passed: sensitive tables returned 0 rows
- `service_role` verification passed: privileged backend access still works
- authenticated staff spot check passed using `admin@day1main.com`
  - `users`, `roles`, `user_roles`, `permissions`, and `role_permissions` returned the caller's scoped rows
  - `members`, `member_dependants`, `claims`, and `providers` remained readable for the authenticated admin role

### Phase B: Staff-safe policies

Add policies that let authenticated staff users continue to read operational data based on the role mappings already present in `users`, `user_roles`, and `roles`.

Success condition:

- admin, operations, finance, claims, call centre, and compliance routes still work with authenticated tokens

### Phase C: Provider linkage cleanup

Populate `providers.user_id` for real provider accounts and then enforce provider-specific RLS for claims, pre-auth, and provider profile data.

Success condition:

- provider-facing data access no longer relies only on route-level filtering

### Phase D: Member identity migration

Introduce a real member-to-auth linkage such as `members.user_id`, migrate member accounts, and only then replace insecure member self-service routes.

Success condition:

- member profile and claim access can be enforced at the database layer

## Practical SQL design guidance

### Staff policies should be based on authenticated identity

Because the app already maps authenticated users to internal staff records by email, the initial policy layer should use authenticated identity to locate the internal `users` row and role mappings.

### Avoid pretending members are ready for self-service RLS

Do not write "member can view own row" policies until the database has a trustworthy member identity column linked to auth.

### Avoid broad authenticated access

Do not use policies like:

```sql
TO authenticated USING (true)
```

on sensitive tables.

## Next actions

1. Block `anon` reads on the sensitive tables.
2. Add authenticated staff policies for operational roles.
3. Verify that staff routes still work with real tokens.
4. Keep member self-service routes flagged as insecure until member identity linkage exists.
5. Backfill `providers.user_id` before relying on provider RLS for broad production access.
