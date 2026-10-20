# Netcash Collection Documentation

This folder is the single source of truth for KERVOX Netcash collection, debit order, transaction, refund, and webhook documentation.

## Current Project Direction

Netcash is the active payment integration path for this project.

Use this folder when working on:

- debit order batch generation
- Netcash collection files
- Netcash account references
- broker group collection reporting
- failed payment handling
- transaction status tracking
- refunds
- webhook/payment-status processing
- Operations and Finance reconciliation flows

## Documents

- [CURRENT_NETCASH_WORKSTATE.md](./CURRENT_NETCASH_WORKSTATE.md) - current Netcash implementation direction and scope
- [MONEY_COLLECTION_METHODS.md](./MONEY_COLLECTION_METHODS.md) - collection methods and operational overview
- [WEBHOOK_TESTING_GUIDE.md](./WEBHOOK_TESTING_GUIDE.md) - Netcash webhook testing and handling
- [DAY1HEALTH_DATABASE_SCHEMA.md](./DAY1HEALTH_DATABASE_SCHEMA.md) - payment/debit-order schema notes

## Build Rule

Do not add Qsure or unrelated payment-provider planning into this folder. If a future payment provider is considered, it must go into its own clearly named folder so Netcash remains clean.
