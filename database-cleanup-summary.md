# Database Cleanup Summary

Last updated: April 23, 2026

## What was wrong

- The kiosk app sometimes stamped orders with tomorrow's date because it used a UTC-derived `business_date` instead of the store's local business day.
- The backend trusted that client-supplied date instead of computing the business date server-side.
- Historical kiosk data therefore contained a small but real set of misdated orders that also pushed related consume transactions and sales aggregates onto the wrong day.

## What was fixed live

- The kiosk no longer sends `business_date`.
- The backend now computes `business_date` server-side in `America/New_York`.
- This future-write fix is already live in the linked Supabase project.

## What Stage 1 corrected

Stage 1 applied the safe historical kiosk repair only.

- `35` kiosk orders were corrected in `daily_orders`
- `300` related `inventory_txns` `CONSUME` rows were corrected
- the affected `sales_line_items` aggregates were rebuilt and verified
- post-verification passed with no mismatches
- no ambiguous rows were found
- no manual review was required

After Stage 1, the corrected maximum order date remained `2026-03-18`.

## What Stage 2 did

Stage 2 was later approved and applied intentionally.

- the full order-history timeline was shifted forward by `+35` days
- `21,920` `daily_orders` rows moved forward
- `25,420` `sales_line_items` rows moved forward
- `24,370` `inventory_txns` `CONSUME` rows moved forward
- `app_config.value.history_start_date` and `history_end_date` were moved forward consistently
- `5,585` shifted `daily_orders` timestamps were then corrected so local `America/New_York` wall-clock times stayed consistent across the DST boundary
- `created_at` values were preserved
- `RECEIVE` and `COUNT` transactions were not shifted

After Stage 2, the latest business date became `2026-04-22`, which closed the stale order-history gap up to the latest completed business day in `America/New_York`.

## Report-ready summary

> We identified a real date-handling bug in the kiosk order flow: the kiosk was sending a UTC-derived `business_date`, which caused some late-night orders to be recorded as tomorrow's order. We fixed that by making the server authoritative for `business_date` in `America/New_York`, then safely corrected the already affected kiosk data in Stage 1. In the live database, 35 kiosk orders and 300 related consume transactions were corrected, the affected sales aggregates were rebuilt successfully, and post-verification passed with no manual-review rows. After that root-cause repair was complete, we intentionally applied Stage 2 as a controlled data-curation step, shifting the order-history timeline forward by 35 days so the dataset reached the latest completed business day without changing audit-style `created_at` fields, and then corrected DST-sensitive shifted order timestamps so local business-time behavior remained consistent.
