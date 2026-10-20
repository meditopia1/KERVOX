# KERVOX Current Dashboard Roles

## Definition

In KERVOX planning, a **role** means a unique dashboard or portal experience with its own sidebar, permissions surface, and day-to-day workflow.

This is different from low-level RBAC/database roles. The database may contain extra technical roles for permissions, testing, or access control, but executive planning should use the dashboard roles below.

## Current Dashboard Roles

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

## Authorization Split

Authorization is one dashboard role with different sidebar layouts depending on the user type.

- Ambulance users use the authorization dashboard for member verification and ambulance benefit checks.
- Africa Assist users use the authorization dashboard for member verification, hospital benefit checks, and GOP intake.

## Current Rule

When discussing project roles, roadmap scope, testing, or launch readiness, count the 12 dashboard roles above.

When discussing database permissions, RLS, or backend access checks, use RBAC/database role names explicitly so they are not confused with dashboard roles.
