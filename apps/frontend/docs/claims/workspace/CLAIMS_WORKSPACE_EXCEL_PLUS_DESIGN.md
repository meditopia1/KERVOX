# Day1 Hospital Claims Workspace (Excel++ Design)

## Codex Build Instructions

## Project Objective

Build a modern web-based **Hospital Claims Workspace** for KERVOX.

**This is NOT a completely new claims system.**

The objective is to reproduce the existing hospital claims Excel register almost exactly so that existing claims staff feel immediately comfortable using it.

The interface should resemble an upgraded Excel spreadsheet while being powered entirely by a PostgreSQL database.

The philosophy is:

> **"Don't replace Excel. Build the best Excel they've ever used."**

Training time should be close to zero because the workflow remains familiar.

---

## Core Principles

- Preserve the existing Day1 hospital claims register layout.
- Keep the existing column order unless absolutely necessary.
- Users should feel they are working inside Excel.
- Add modern functionality without changing the workflow.
- Every feature should reduce manual administration.

---

## Current Implemented Hospital Claims Process

The Hospital Claims workspace is backed by Supabase hospital-claim tables and the imported 2026 Excel hospital claims register.

Current live flow:

```txt
Existing Excel hospital claims register
→ Import into hospital_claims_register
→ Match rows to members where member_number or ID number exists
→ Display rows in Hospital Claims Workspace
→ Group rows by workbook month section
→ Show monthly subtotal rows below the correct month
→ Allow claims staff to edit claim/register fields from the drawer
→ Save edits back to hospital_claims_register
```

Implemented tables:

```txt
hospital_claim_intakes
hospital_claims_register
hosp_claims
hosp_claim_documents
hosp_claim_payments
hosp_claim_audit
hosp_claim_history
hosp_claim_calculation_rules
```

Implemented summary views:

```txt
hosp_claim_monthly_summary
hosp_claim_annual_summary
```

Import and display rules:

- Old imported register rows do not receive generated HCR claim numbers.
- New GOP/application rows will receive generated HCR claim numbers.
- Member number is sourced from the workbook member-number value and matched to `members.member_number`.
- Province is stored in the `province` column, not the ICD10 column.
- Date strings previously appearing under the workbook Beneficiary area are payment dates and must import into `payment_date`.
- Monthly subtotal rows remain in the register and display under the month they summarize.
- Workbook section month controls grouping when a row date appears in a later month but belongs to the current Excel section.
- Notes such as `Acc Day1` are kept as notes and must not be parsed as Rand amounts.
- Columns with any real data stay visible at full width; only completely empty columns may collapse horizontally.

---

## Main Hospital Claims Workspace

The dashboard is essentially a powerful spreadsheet.

The workspace must display existing hospital claims from `hospital_claims_register`. Do not populate the workspace with dummy claims. If no real claims are available, show an empty state and import/upload prompts.

Features include:

- Sticky column headers
- Horizontal scrolling without forced frozen columns
- Horizontal scrolling
- Fast filtering
- Multi-column sorting
- Global search
- Column width compression only for completely empty columns
- Hide/show columns
- Save personal layouts
- Export to Excel
- Export to PDF
- Pagination
- Keyboard navigation
- Editable drawer fields with save back to `hospital_claims_register`

---

## Month Sections

Instead of one enormous list, claims are grouped.

Example:

```txt
▼ April 2026 (241 Claims)
▼ May 2026 (188 Claims)
▶ June 2026 (315 Claims)
```

Users can collapse or expand each month independently.

Month folders should start collapsed. Users can expand/collapse each month independently.

Subtotal rows must appear below the correct month. Example:

```txt
January 2026 claims
January 2026 subtotal row

February 2026 claims
February 2026 subtotal row
```

Do not move January totals into February or February totals into March. The workbook section, not only the raw date cell, controls where imported rows belong.

---

## Status Colour Coding

Each claim row should be colour coded.

```txt
Green  - Paid
Yellow - Pending Documentation
Orange - Awaiting GOP
Blue   - Currently Admitted
Purple - Under Review
Red    - Overdue
Grey   - Repudiated
```

Colours should be configurable later.

---

## Right Claims Summary Panel

The summary panel sits on the right of the hospital claims workspace and can collapse into a compact sidebar-style icon button. This gives claims staff more horizontal spreadsheet space while keeping the summary one click away.

Displays:

- Open Claims
- Today's Claims
- Outstanding Value
- Awaiting Documentation
- Ready for Payment
- Claims Paid Today
- Hospital Claims
- Total Incurred

The collapsed icon must follow the global sidebar icon style: compact square button, subtle border, active green tint, and right-edge glow/accent.

---

## OCR Powered GOP Capture

This is one of the major features.

A user clicks **New GOP/Application** and browses for a GOP PDF or claims application/form.

Immediately:

- OCR/text extraction begins automatically.
- Extract every possible field.
- No manual typing.
- Show the scanned field information in a review panel before anything is written to the hospital claims register.
- Claims-side uploads use **Add to claims** to place the scanned information into the working hospital claims workspace.
- Africa Assist uploads use **Submit to Hospital Claims Intake**, then claims users review the queued intake and click **Accept and insert into workspace**.
- Claim forms are different from GOPs. They should match against an existing HCR claim first, show only major differences, and prompt the claims admin to open and review the claim form personally before making any changes.
- Member dashboard claim-form upload is a future source only. The comparison and review flow is being prepared now, but the member dashboard upload entry point is not live yet.

Current intake uses embedded PDF/DOCX text extraction first. Google Vision OCR should be wired as a fallback for image-only scanned documents where embedded text is not available.

---

## GOP/Application Intake Flow

The hospital claims workspace remains the primary register for imported and current hospital claims.

New claims enter through two explicit intake actions:

```txt
Claims Workspace Fast-Add
→ New GOP/Application
→ Browse/upload GOP or application
→ Scan/OCR document
→ Show extracted fields for review
→ Auto lookup member/provider/policy data
→ Claims user confirms by clicking Add to claims
→ Add to the working hospital claims workspace

Africa Assist Intake Queue
→ Hospital Benefit Check
→ GOP Intake upload/submit
→ Save to hospital_claim_intakes
→ Show item in New Intake Queue
→ Claims user opens Review source
→ Claims user confirms by clicking Accept and insert into workspace
→ Insert into hospital_claims_register
→ Create audit/timeline entries

Future Member Claim Form Intake
→ Member dashboard claim-form upload
→ Save to hospital_claim_intakes
→ Match against existing HCR claim
→ Show only major differences in review drawer
→ Claims admin opens claim form and reviews personally
→ Open matched claim drawer for controlled edits
```

No uploaded GOP/application should silently create a final claim row without claims review.

Hospital Claims Register claim numbers use:

```txt
HCRYYMMDD0000001
```

Example:

```txt
HCR2607030000001
```

---

## GOP/Application OCR Fields

Extract:

- Hospital Name
- Hospital Practice Number
- Casualty Name
- Casualty Practice Number
- Radiology Provider
- Radiology Practice Number
- Africa Assist Reference
- Policy Number
- Policy Valid
- Waiting Period Complete
- Policy Inception Date
- Member Name
- Patient Name
- Member ID
- Patient ID
- Authorisation Number
- Admission Date
- Diagnosis
- Benefit Type
- Authorised Amount
- Maximum GOP Amount
- Medical Aid Status
- Consent Status
- Case Manager
- Manager
- Issue Date
- Any claim/application fields present on the submitted form

Store the original PDF permanently.

For manual validation, see:

- [Hospital Claims Test Scenarios](./HOSPITAL_CLAIMS_TEST_SCENARIOS.md)

The scan review should keep only the strongest/best value for duplicated labels and should not treat provider name fragments as member numbers.

---

## Intelligent Database Lookup

This is the real intelligence.

Once OCR completes, perform automatic database searches.

Use extracted fields like:

- Policy Number
- Member Number
- Patient ID
- Authorisation Number
- Africa Assist Reference
- Admission Date
- Hospital Practice Number

These trigger automatic lookup of related information.

Populate remaining claim fields automatically.

Examples:

- Member details
- Plan
- Group
- Broker
- Employer
- Benefit structure
- Waiting periods
- Member status
- Policy status
- Previous claims
- Outstanding claims
- Hospital profile
- Provider details
- Benefit limits
- Internal notes
- Preferred contact details

Everything possible should be populated automatically.

The claims processor should only review and correct the information rather than typing it.

---

## Add To Claims

After OCR and lookup, the user reviews the scanned information and confirms it in the appropriate flow.

The system then:

- Places the claim into the working workspace flow.
- Generates the next available HCR Claim Number.
- Auto-fills every possible register field using scanned data and database lookups.
- Assigns an initial live register status such as Open, Awaiting Documentation, Currently Admitted, or Under Review.

Link:

- Member
- Policy
- Hospital
- Provider
- GOP
- Authorisation

Create complete audit record.

Current build now supports both:

- Africa Assist GOP submissions persisting into `hospital_claim_intakes`
- Claims review and acceptance from the `New Intake Queue` into `hospital_claims_register`
- Claim-form intake comparison against existing HCR claims, showing only major differences and requiring admin review before edits
- Editable drawer updates saving back to `hospital_claims_register`

The claims-side `New GOP/Application` fast-add flow remains available for direct claims-side scan review and working-register entry.

---

## Duplicate Detection

Before creating a claim check for:

- Existing Claim Number
- Authorisation Number
- Africa Assist Reference
- Same Member
- Same Admission Date
- Same Hospital

Warn the user before duplicates occur.

---

## OCR Validation

Display confidence score.

Example:

```txt
OCR Confidence
98%
```

Highlight uncertain fields.

Allow manual correction before saving.

---

## Claim Drawer

Selecting a row opens a side panel.

The drawer is editable at all times for register fields that claims staff need to correct.

Current editable drawer sections:

- Register Details
- Financials
- Member and Patient

Important editable financial fields:

- Total Claims Incurred
- Finalised Paid To Date
- Claims Outstanding
- Actual Costs
- Member Costs
- Accident
- Illness
- Casualty
- Ex-Gratia
- Repudiation

Edits save through the hospital register API and update `hospital_claims_register`.

Future drawer content:

- Full Member Details
- Full Claim Details
- GOP Viewer
- Invoices
- Documents
- Clinical Notes
- Internal Notes
- Timeline
- Audit Trail
- Payment History
- Attachments
- Communication History
- Provider Details

No page navigation required.

Everything opens from the drawer.

---

## Timeline

Every event recorded.

Examples:

- Claim Created
- GOP Uploaded
- OCR Completed
- User Edited
- Invoice Received
- Claim Washed
- Approved
- Paid
- Repudiated

Every action stores:

- Date
- Time
- User
- Action
- Old Value
- New Value

---

## Document Management

Each claim supports:

- GOP PDFs
- Invoices
- Medical Reports
- Discharge Summaries
- Radiology
- Pathology
- Emails
- Other Attachments

Preview documents without downloading.

---

## Smart Alerts

Show warnings when:

- Duplicate claim
- Duplicate GOP
- Benefit exceeded
- Policy inactive
- Waiting period active
- Outstanding documentation
- Claim overdue
- Large variance
- Authorisation mismatch

---

## Proposed Africa Assist Direct GOP Intake

This remains a proposed direct intake option if Africa Assist agrees to add an **Add GOP** button to their desktop/application.

The goal is to let Africa Assist send GOP documents directly into the Day1 Hospital Claims intake queue instead of relying on manual attachment handling.

Recommended flow:

```txt
Africa Assist Add GOP button
→ Secure Day1 GOP intake API
→ Store original GOP document
→ Scan/extract GOP fields
→ Auto lookup member/provider/policy data
→ Create New Intake notification in Hospital Claims workspace
→ Claims officer reviews scan
→ Claims officer reviews source
→ Claims officer clicks Accept and insert into workspace
```

Africa Assist should send the GOP into an intake endpoint only. They should not write directly into the final claims table.

Proposed endpoint:

```txt
POST /api/integrations/africa-assist/gop-intake
```

Expected payload:

- GOP PDF or document attachment
- Africa Assist reference
- Authorisation number
- Policy number
- Member or patient identifiers if available
- Hospital name and practice number if available
- Admission date if available
- Contact or case manager details if available

Security requirements:

- API key, signed token, or OAuth client credentials
- Strict file type and size validation
- Duplicate detection before creating an intake item
- Full audit record for every submitted GOP
- Original document stored permanently

Workspace behavior:

- Create a new intake item, not a final claim.
- Mark it as new/unreviewed.
- Show a notification count in the Hospital Claims workspace.
- Run the same GOP scanning, validation, database lookup, and claims review flow before final register insertion.

If Africa Assist does not agree to this integration, remove this section and continue with a controlled manual upload/import approach for GOP documents received outside the portal.

---

## Authorization Portal Split

The public login page should show **Authorizations** instead of **Ambulance**. The system then routes users by database role after login.

Current demo roles:

```txt
ambulance_operator
africa_assist_authorization
```

Current demo accounts:

```txt
ambu@out.com  → ambulance_operator
afri@out.com  → africa_assist_authorization
```

These are temporary demo logins only. Replace with real company user details once Ambulance and Africa Assist access is confirmed.

Both roles use the same Authorization workspace shell and member/policy verification pattern, but each role sees a different sidebar and benefit check.

Implemented routes:

```txt
/authorizations/dashboard
/authorizations/member-verification
/authorizations/gop-intake
/authorizations/history
```

The single `/authorizations/member-verification` route is the active verification and benefit check page. It changes label/output by role:

```txt
ambulance_operator → Ambulance Benefit Check
africa_assist_authorization → Hospital Benefit Check
```

Legacy benefit routes may redirect back to `/authorizations/member-verification`.

Legacy route support:

```txt
/ambulance/dashboard → redirects to /authorizations/dashboard
```

Ambulance sidebar:

```txt
Authorization Dashboard
Ambulance Benefit Check
Verification History
```

The Ambulance Benefit Check must answer:

- Is the member active?
- What plan are they on?
- Does the plan include ambulance benefit?
- Is the ambulance benefit active now?
- Are there waiting periods, limits, or exclusions?
- Can ambulance authorization proceed?

Africa Assist sidebar:

```txt
Authorization Dashboard
Hospital Benefit Check
GOP Intake
Verification History
```

The Hospital Benefit Check must answer:

- Is the member active?
- What plan are they on?
- Does the plan include hospital benefit?
- Is the hospital benefit active now?
- Are there waiting periods, limits, or exclusions?
- Can hospital pre-auth / GOP proceed?

Africa Assist can submit or upload a GOP only after verification. Submitted GOPs must enter the Hospital Claims intake/review flow and should not directly create final claim rows.

Authorization users should receive only the minimum data needed to verify cover and benefit status. Do not expose unrelated member, financial, or claims information in this portal.

Role isolation:

- `ambulance_operator` sees the unified verification page as Ambulance Benefit Check.
- `africa_assist_authorization` sees the unified verification page as Hospital Benefit Check and can access GOP Intake.
- A user typing the other partner's route directly should see an access-restricted state.
- Neither demo role should receive broad claims, member, finance, or admin permissions.

Current authorization dashboard state:

- Authorization Dashboard is live for demo authorization roles.
- Unified Member Verification / Benefit Check page is live and uses the secure member lookup endpoint for role-limited checks.
- GOP Intake page is live for Africa Assist.
- Verification History page is live as a controlled demo screen.
- GOP submission persists into `hospital_claim_intakes`, appears in the Hospital Claims `New Intake Queue`, and can be accepted into `hospital_claims_register` by claims users.
- Claim forms can also persist into `hospital_claim_intakes`, but they should open a controlled comparison/review path instead of silently inserting a second live claim row.

---

## Future Claims Washing Integration

The Hospital Claims workspace stays separate from primary-plan claims washing. Hospital claims, GOPs, and hospital claim forms remain in the hospital register and hospital claim tables. Primary-plan claims washing must use its own workflow/table structure and may later reference hospital claims where needed.

This dashboard should expose hospital claim data in a way that future validation and washing modules can plug in without redesigning the hospital claims interface.

Future features include:

- Automatic ICD validation
- Procedure validation
- Tariff validation
- Duplicate billing detection
- Benefit validation
- Hospital rule validation
- Clinical validation
- AI fraud detection
- Auto adjudication
- Exception queue

The dashboard must already be designed so these modules can plug in later without redesigning the interface.

---

## User Experience Goal

The claims processor should feel like they are still using the familiar Day1 Excel register, but with modern intelligence.

The system should eliminate repetitive typing through OCR and automatic database lookups, reduce errors, provide instant access to supporting documents, and prepare the platform for the future AI-powered Claims Washer.

**Design philosophy:**

> **Familiar on the surface. Intelligent underneath.**
