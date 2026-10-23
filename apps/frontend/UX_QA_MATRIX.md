# KERVOX frontend UI/UX QA matrix

This is an implementation tracker, not a claim that every route has passed browser QA. The application currently contains 145 `page.tsx` routes. A static check of 82 literal sidebar/onboarding destinations found 0 missing page routes after the navigation fixes. Dynamic links, redirects, role authorization, and visual behavior still need browser verification with test accounts.

| Account area | Representative routes | Static destination check | Desktop / tablet / mobile | Four themes | Workflow and live-data QA |
| --- | --- | --- | --- | --- | --- |
| System administration | `/admin/dashboard`, `/admin/applications`, `/admin/members`, `/admin/claims`, `/admin/roles` | Pass | Pending | Pending | Pending |
| Operations | `/operations/dashboard`, `/operations/members`, `/operations/claims`, `/operations/reports` | Pass | Pending | Pending | Pending |
| Broker | `/broker/dashboard`, `/broker/leads`, `/broker/commissions` | Pass | Pending | Pending | Commissions: honest unavailable state; live feed needed |
| Claims | `/claims/dashboard`, `/claims/queue`, `/claims/hospital`, `/claims/preauth` | Pass | Pending | Pending | Pending |
| Finance | `/finance/dashboard`, `/finance/ledger`, `/finance/reconciliation`, `/finance/payment-batches` | Pass | Pending | Pending | Pending |
| Marketing | `/marketing/dashboard`, `/marketing/leads`, `/marketing/landing-pages`, `/marketing/reports` | Pass | Pending | Pending | Leads use the existing live endpoint; reports need a live service |
| Compliance | `/compliance/dashboard`, `/compliance/popia`, `/compliance/breaches` | Pass | Pending | Pending | Pending |
| Provider | `/provider/dashboard`, `/provider/claims`, `/provider/payments` | Pass | Pending | Pending | Payments: honest unavailable state; live feed needed |
| Call centre | `/call-centre/dashboard`, `/call-centre/members`, `/call-centre/tickets` | Pass | Pending | Pending | Pending |
| Authorizations | `/authorizations/dashboard`, `/authorizations/member-verification`, `/authorizations/gop-intake` | Pass | Pending | Pending | Pending |
| Member | `/member/dashboard`, `/member/claims`, `/member/settings` | Pass | Pending | Pending | Existing member and medical workflows remain accessible |
| Onboarding | `/onboarding/applications`, `/onboarding/settings` | Pass | Pending | Pending | Dead stats/calls links removed; mobile drawer and persistent collapse added |
| Public marketplace | `/lp/server-marketplace` and the legacy alias | Existing route retained | Pending | Curated public brand; verify logos | Inquiry/listing flow must remain functional |
| KER01 funnel | `/ker01` | Public funnel | Pending | Product enquiry and seller listing | Active |

## Completed in this slice

- Removed two onboarding sidebar destinations that had no page route; corrected the member claims link to `/member/claims`.
- Made shared button variants use semantic theme colors.
- Added reusable unavailable, error, and not-found states.
- Replaced fixed marketing report totals and scheduled-report records with honest connection states.
- Connected the marketing leads UI to the existing GET endpoint with search, status filtering, pagination, and retry; removed the unwired creation button.
- Removed example provider-payment and broker-commission records and simulated download alerts from their production views.
- Added an explicit error and retry state to provider claims history so a failed request is not presented as an empty live history.
- Updated stale home, dashboard, and sidebar tests to reflect the current KERVOX interface.

## Remaining product and QA work

1. Browser-test every account role at desktop, tablet, and mobile widths, including keyboard navigation, focus order, screen-reader names, long tables, dialogs, and form errors. Capture before/after screenshots for representative routes in all four themes.
2. Audit the remaining marketing and operational screens for sample figures and buttons without handlers. Mark previews honestly; connect only to existing APIs. Do not invent data or silently remove real workflows.
3. Inventory and consolidate legacy hard-coded color classes in page components. Keep public marketplace styling curated unless a separate global-theme requirement is approved.
4. Profile route changes, INP, LCP, and CLS before changing polling, caching, or animation behavior. The sidebar currently schedules periodic badge refreshes for some roles.
5. Decide whether `/test-connection` and `/test-icons` should exist in a production build. The connection test displays example member identifiers.
6. Obtain approved product names, descriptions, and specifications before replacing the intentionally temporary `Product 1–4` and lorem ipsum marketplace copy.

## Backend-dependent capabilities (not implemented in this frontend-only phase)

- Live report generation, scheduling, and distribution.
- Verified provider payments and downloadable remittance advice.
- Verified broker commission statements and downloads.
- Manual marketing lead creation, unless an existing authorized write endpoint is identified.

## Validation notes

- Production frontend build completed, with existing Supabase Edge Runtime and static-render warnings from API code outside this phase.
- Focused leads, sidebar, marketing dashboard, landing-page, marketplace, and theme tests pass.
- Full Jest suite: 21 suites passed, 1 stale suite failed to load; 71 tests passed. The remaining `api-client.test.ts` targets a missing `src/lib/api-client` module.
- Typecheck is blocked by that same stale test and its invalid `Response` cast.
- Lint is blocked by a root ESLint plugin dependency that is configured but not installed.
