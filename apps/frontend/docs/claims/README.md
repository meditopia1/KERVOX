# Claims Documentation

This folder contains the active claims reference material for KERVOX, including hospital claims workspace planning, GOP/pre-authorization source documents, claim forms, and claims decision support material.

## Current Scope

- `workspace/` - canonical hospital claims workspace design and test scenarios
- `forms/` - member and provider claim forms
- `pre-authorization/` - GOP and pre-authorization source documents
- `procedures/` - operational claim-processing procedures
- `guidelines/` - adjudication and decision-making references
- `tariffs/` - tariff, pricing, and related coding references
- `rejection-codes/` - rejection-code references
- `workflows/` - process maps and workflow notes

## Usage

Use this folder together with:

- [workspace/CLAIMS_WORKSPACE_EXCEL_PLUS_DESIGN.md](./workspace/CLAIMS_WORKSPACE_EXCEL_PLUS_DESIGN.md)
- [workspace/HOSPITAL_CLAIMS_TEST_SCENARIOS.md](./workspace/HOSPITAL_CLAIMS_TEST_SCENARIOS.md)
- [../project/MEDICAL_INSURER_OPERATING_MODEL_REFERENCE.md](../project/MEDICAL_INSURER_OPERATING_MODEL_REFERENCE.md)

## Current Flow Notes

- GOPs can enter from the Claims hospital workspace or from Africa Assist through the Authorization dashboard.
- Africa Assist GOP submissions must land in `hospital_claim_intakes` first and only move into `hospital_claims_register` after claims review.
- Claim forms usually arrive after GOP data is already in the hospital claims workspace. They should primarily be used to flag major differences against existing claim data and prompt admin review.
- Member-side claim-form upload is planned, but that entry point is not live yet.

## Last Updated

July 12, 2026
