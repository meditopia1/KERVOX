# Dashboard Role Navigation Reference

This guide records the current role-based navigation model. In KERVOX planning, a **role** means a unique dashboard or portal lane with its own sidebar and workflow. RBAC and database roles may be more granular.

Current dashboard role reference: `apps/frontend/docs/project/CURRENT_DASHBOARD_ROLES.md`

Use this file as a route and sidebar reference, not as a temporary fix note.

## Navigation by Role

### 1. System Admin (`system_admin`)
**Sidebar Menu:**
- Admin Dashboard → `/admin/dashboard`
- Members → `/admin/members`
- Policies → `/admin/policies`
- Products → `/admin/products`
- Claims → `/admin/claims`
- Providers → `/admin/providers`
- Finance → `/admin/finance`
- Brokers → `/admin/brokers`

**Purpose:** Full system administration and oversight

---

### 2. Member (`member`)
**Sidebar Menu:**
- Dashboard → `/dashboard`
- My Policies → `/policies`
- My Claims → `/claims`
- Payments → `/payments`
- Documents → `/documents`
- Profile → `/profile`

**Purpose:** Personal account management for scheme members

---

### 3. Broker (`broker`)
**Sidebar Menu:**
- Dashboard → `/broker/dashboard`
- My Clients → `/broker/clients`
- Policies → `/broker/policies`
- Commissions → `/broker/commissions`
- Profile → `/profile`

**Purpose:** Manage clients and track commissions

---

### 4. Claims Assessor (`claims_assessor`)
**Sidebar Menu:**
- Dashboard → `/claims-assessor/dashboard`
- Hospital Claims → `/claims/hospital`
- Claims Queue → `/claims-assessor/queue`
- My Claims → `/claims-assessor/my-claims`
- Profile → `/profile`

**Purpose:** Review, edit, and adjudicate claims. Hospital Claims opens the DB-backed Excel-style hospital register with monthly subtotal rows, GOP/Application intake review, and editable drawer fields.

---

### 5. Finance Manager (`finance_manager`)
**Sidebar Menu:**
- Dashboard → `/finance/dashboard`
- Payments → `/finance/payments`
- Reconciliations → `/finance/reconciliations`
- Reports → `/finance/reports`
- Profile → `/profile`

**Purpose:** Financial management and reporting

---

### 6. Compliance Officer (`compliance_officer`)
**Sidebar Menu:**
- Dashboard → `/dashboard` (default member view for now)
- My Policies → `/policies`
- My Claims → `/claims`
- Payments → `/payments`
- Documents → `/documents`
- Profile → `/profile`

**Purpose:** Compliance monitoring (uses default member navigation)

---

### 7. Authorization Users (`ambulance_operator`, `africa_assist_authorization`)
**Public Login Tile:**
- Authorizations

**Shared Routes:**
- Dashboard → `/authorizations/dashboard`
- Unified verification / benefit check → `/authorizations/member-verification`
- Verification History → `/authorizations/history`

**Ambulance Operator Sidebar:**
- Dashboard → `/authorizations/dashboard`
- Ambulance Benefit Check → `/authorizations/member-verification`
- Verification History → `/authorizations/history`

**Africa Assist Authorization Sidebar:**
- Dashboard → `/authorizations/dashboard`
- Hospital Benefit Check → `/authorizations/member-verification`
- GOP Intake → `/authorizations/gop-intake`
- Verification History → `/authorizations/history`

**Purpose:** External authorization users verify member/policy status and confirm the relevant benefit before transport, hospital pre-auth, or GOP intake proceeds. These dashboards must expose only the minimum information needed for verification.

Africa Assist GOP Intake must feed Hospital Claims intake/review. It must not create final claim rows directly.

---

## How It Works

The `SidebarLayout` component now includes a `getNavigationForRole()` function that:

1. Checks the user's roles from `user?.roles` array
2. Determines which role takes precedence
3. Returns the appropriate navigation items for that role
4. Dynamically renders the sidebar menu

## Test Accounts

Use approved test accounts for the target environment. Obtain credentials from the administrator; do not store passwords in documentation.

| Role | Account |
| --- | --- |
| Admin | `admin@system.com` |
| Member | `member@system.com` |
| Broker | `broker@system.com` |
| Claims | `claims@system.com` |
| Finance | `finance@system.com` |
| Compliance | `compliance@system.com` |
| Ambulance test | `ambu@out.com` |
| Africa Assist test | `afri@out.com` |

## Implementation Location

- `apps/frontend/src/components/layout/sidebar-layout.tsx`
  - dynamic sidebar selection by role

## Expected Behavior

✅ **Different users see different menus** based on their role
✅ **Admin sees admin-specific pages** (Members, Products, Providers, etc.)
✅ **Members see member-specific pages** (My Policies, My Claims, etc.)
✅ **Brokers see broker-specific pages** (My Clients, Commissions, etc.)
✅ **Each role has appropriate access** to their functional areas
✅ **User info still displays correctly** (name, email, avatar initials)

This file should be updated only when a route, sidebar, or dashboard-role grouping actually changes.
