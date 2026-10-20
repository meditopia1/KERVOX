# KERVOX Provider Workstate

**Last updated:** July 12, 2026

This document replaces the older provider implementation checklist and status-style notes.

## Purpose

Use this file as the current provider reference for what exists now, what is partially wired, and what still belongs in upcoming work.

## Current Position

- Provider data exists in the main Supabase/PostgreSQL database.
- The project already includes provider-facing application routes and provider administration surfaces.
- Provider records are part of the live operational data model and should be treated as production business data, not demo-only scaffolding.

## Current Provider Scope

The provider lane is currently centered on:

- provider data administration
- provider lookup and profile records
- eligibility and verification direction
- future provider-side claims and pre-authorization workflows

## Claims Relationship

Provider work must stay aligned with the broader claims direction:

- hospital claims and GOP intake now flow through the hospital claims workspace
- authorization users handle benefit verification before GOP intake
- provider-facing claims features must not conflict with the hospital claims register model

## What Counts As Current

Treat the following as current provider planning direction:

- provider records are maintained in the database alongside members, brokers, products, and claims-related tables
- provider access and permissions must follow the existing RLS and role model
- provider claims features should plug into real claims data rather than separate mock workflows
- provider documentation should support the active KERVOX architecture, not old one-off build plans

## Near-Term Provider Work

1. Confirm which provider dashboard screens are still active in the app and which are placeholders.
2. Align provider verification and pre-authorization flows with the current authorization and claims model.
3. Keep provider payment expectations separate from Netcash member-collection work unless there is a real shared finance process.
4. Update provider docs only when they reflect actual current routes, tables, and workflows.

## Documentation Rule

Do not create new provider status files with labels like `COMPLETE`, `READY`, or `IN PROGRESS` unless they are temporary working notes that will be folded back into this file or another canonical reference.
