# Money Collection Methods

## Overview

The system supports three distinct payment collection methods to accommodate different member types and business arrangements.

---

## Method 1: Debit Orders via Netcash - Business Groups

The system uses Netcash for debit order collection planning and processing.

- 1 debit order per group (covers all members in that group)
- 11 groups total
- Group company pays total amount for all members
- Example: Day1 Health (Pty) Ltd - 7 members, total R4789.00

---

## Method 2: EFT Collections – Group Members (34 Groups)

Direct EFT payments from individual group members.

- Members get notified to pay on an agreed date
- Each member has an agreed EFT payment date
- 34 groups total

---

## Method 3: Debit Orders via Netcash - Retail Members

The system uses Netcash for individual debit order collections.

- Individual debit orders (not grouped)
- Each member has their own debit order

---

## System Implementation

### Admin Dashboard - Group Setup

- Register company groups (add/edit/delete)
- Configure company information
- Assign members to groups
- Set payment terms and banking details
- Configure collection method per group

### Operations Dashboard - Group Management

- Daily operations and monitoring
- View group payment status
- Process group collections
- Handle failed payments
- Generate group invoices

### Netcash Operations

- Generate Netcash debit order batches
- Submit or export Netcash-compliant collection files
- Track successful, failed, and rejected collections
- Feed payment status into member payment history
- Reconcile collection outcomes in Operations and Finance dashboards

## Database Column Mapping

(To be documented - which columns in the members table manage each collection method)

## Database Schema Requirements

### New Tables Needed:

1. `payment_groups` - Store company group information
2. `group_members` - Link members to groups
3. Group-specific payment tracking
