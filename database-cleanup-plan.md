# Database Cleanup Plan

Last updated: April 23, 2026

## Current Status

- The future-write `business_date` bug is fixed live in the linked Supabase project.
- Stage 1 historical kiosk correction was applied successfully and post-verification passed.
- Stage 2 full forward timeline shift was intentionally applied after the root-cause repair and Stage 1 historical correction.

## Overview

This repair work had two separate goals:

1. Fix the real write-path bug that was placing some kiosk orders on tomorrow's date.
2. Safely correct the existing historical kiosk rows that were already stored on the wrong business day.

The canonical business timezone for this repair is `America/New_York`.

## Root Cause

The kiosk app was sending a client-derived `business_date` based on:

```js
new Date().toISOString().slice(0, 10)
```

That value is the UTC calendar date, not the restaurant's local business date. Near midnight Eastern time, an order could be stored as tomorrow's order even though it was still today locally.

The original `register_order` RPC also trusted the incoming `business_date` instead of resolving the business day server-side from the actual order timestamps.

## Tables and Columns Involved

### Primary repair targets

- `public.daily_orders`
  - `id`
  - `order_id`
  - `business_date`
  - `opened_at`
  - `closed_at`
  - `created_at`
  - `subtotal`
  - `total`
  - `order_source`
  - `voided`
- `public.sales_line_items`
  - `id`
  - `business_date`
  - `menu_item_id`
  - `qty`
  - `net_sales`
  - `source`
- `public.inventory_txns`
  - `id`
  - `business_date`
  - `created_at`
  - `ingredient_id`
  - `qty_delta`
  - `note`
  - `txn_type`
- `public.app_config`
  - `key = 'onboarding'`
  - `value.history_start_date`
  - `value.history_end_date`

### Supporting lookup tables

- `public.menu_items`
- `public.bom`

## Safety Rules

- The analysis script is read-only.
- The repair script refuses to run without both `--analysis <file>` and `--apply`.
- Backup exports are written before any mutation.
- Ambiguous kiosk rows are skipped, never force-repaired.
- `created_at` values are not shifted.
- `RECEIVE` and `COUNT` transactions are not shifted.
- Stage 2 was executed as a separate approved continuity step after the real bug fix and Stage 1 correction; it should not be described as the root-cause fix itself.

## Future-Write Fix

### Kiosk

The kiosk order payload now sends only real timestamps:

- `opened_at`
- `closed_at`

It no longer sends a client-derived `business_date`.

### Server

Migration `20260422000300_business_date_normalization.sql` adds:

- `public.resolve_business_date(...)`

And updates `public.register_order(...)` to resolve `business_date` in this priority order:

1. `opened_at AT TIME ZONE 'America/New_York'`
2. else `closed_at AT TIME ZONE 'America/New_York'`
3. else explicit `business_date`
4. else `timezone('America/New_York', now())::date`

This keeps the backend contract unchanged while making the server authoritative.

### Live Validation

- The normalization migration was pushed to the linked Supabase project.
- The kiosk write path now relies on server-side normalization instead of UTC client date math.
- `npm run test:database` passed after the change.

## Stage 1: Historical Kiosk Correction

### Result

Stage 1 was applied successfully and fixed only the validated historical kiosk rows.

- `35` kiosk orders corrected in `daily_orders`
- `300` related `inventory_txns` `CONSUME` rows corrected
- `sales_line_items` repaired with:
  - `26` updated rows
  - `14` inserted rows
  - `41` deleted zeroed rows
  - `3` conservative one-day fallback resolutions
- `0` ambiguous rows
- `0` manual-review rows required

### Backup and Verification Artifacts

Stage 1 outputs were written to:

- `logs/database-cleanup/stage1-kiosk-repair/backup/affected-kiosk-daily-orders.json`
- `logs/database-cleanup/stage1-kiosk-repair/backup/affected-kiosk-consume-transactions.json`
- `logs/database-cleanup/stage1-kiosk-repair/backup/affected-sales-line-items.json`
- `logs/database-cleanup/stage1-kiosk-repair/apply-summary.json`
- `logs/database-cleanup/stage1-kiosk-repair/apply-summary.md`
- `logs/database-cleanup/stage1-kiosk-repair/post-verification-stage1-kiosk.json`
- `logs/database-cleanup/stage1-kiosk-repair/post-verification-stage1-kiosk.md`

### Stage 1 Commands Used

```bash
set -a; source .vercel/.env.production.local; set +a
node scripts/database-cleanup-apply.mjs --analysis logs/database-cleanup/latest/analysis.json --stage kiosk-only --apply --output-dir logs/database-cleanup/stage1-kiosk-repair
node scripts/database-cleanup-verify.mjs --analysis logs/database-cleanup/latest/analysis.json --mode post --stage kiosk-only --output-dir logs/database-cleanup/stage1-kiosk-repair
```

### Stage 1 Verification Result

- verification status: `PASS`
- `current_kiosk_max_business_date = 2026-03-18`
- `current_max_business_date = 2026-03-18`
- `mismatches = []`

That means the historical kiosk correction succeeded without applying any broader timeline shift.

## Stage 2: Full Forward Timeline Shift

Stage 2 remained intentionally separate from the real bug fix and the real historical kiosk correction, but it was later approved and applied as a controlled data-curation step to close the stale gap in the order-history timeline.

### Fresh Stage 2 Analysis Result

- fresh analysis generated from the repaired live state in `logs/database-cleanup/stage2-forward-shift/analysis.json`
- `corrected_max_order_date = 2026-03-18`
- `shift_target_date = 2026-04-22`
- `shift_delta_days = +35`
- `eligible kiosk anomalies = 0`
- `ambiguous rows = 0`

### Stage 2 Backups and Execution

- `logs/database-cleanup/stage2-forward-shift/backup/full-shift-daily-orders.json`
- `logs/database-cleanup/stage2-forward-shift/backup/full-shift-sales-line-items.json`
- `logs/database-cleanup/stage2-forward-shift/backup/full-shift-consume-transactions.json`
- `logs/database-cleanup/stage2-forward-shift/backup/app-config-onboarding.json`
- `logs/database-cleanup/stage2-forward-shift/backup/remaining-unshifted-bulk-close-consume-transactions.json`
- `logs/database-cleanup/stage2-forward-shift/backup/dst-sensitive-daily-orders-before-correction.json`
- `logs/database-cleanup/stage2-forward-shift/bulk-close-completion.json`
- `logs/database-cleanup/stage2-forward-shift/dst-sensitive-daily-orders-correction.json`
- `logs/database-cleanup/stage2-forward-shift/post-verification-stage2-shift.json`
- `logs/database-cleanup/stage2-forward-shift/post-verification-stage2-shift.md`

### Stage 2 Final Result

- `21,920` `daily_orders` rows shifted forward by `+35` days
- `25,420` `sales_line_items` rows shifted forward by `+35` days
- `24,370` `inventory_txns` `CONSUME` rows shifted forward by `+35` days
- `1` onboarding config row updated in `app_config`
- `3,121` bulk-close `CONSUME` rows were reconciled after fixing a pagination bug in the Stage 2 script
- `5,585` `daily_orders` timestamp fields were corrected to preserve local `America/New_York` wall-clock behavior across the DST boundary
- `created_at` fields were left unchanged
- `RECEIVE` and `COUNT` transactions were not shifted

### Stage 2 Verification Result

- post-verification status: `PASS`
- `current_max_business_date = 2026-04-22`
- `current_kiosk_max_business_date = 2026-04-22`
- `mismatches = []`
- totals preserved:
  - `daily_orders_subtotal = 974842.61`
  - `sales_line_items_net_sales = 899428.83`
  - `sales_line_items_qty = 55607`
  - `inventory_txns_consume_qty_delta = -3283597.5`

### Commands Used

```bash
set -a; source .vercel/.env.production.local; set +a
node scripts/database-cleanup-analyze.mjs --timezone America/New_York --target-mode latest-complete-day --output-dir logs/database-cleanup/stage2-forward-shift
node scripts/database-cleanup-verify.mjs --analysis logs/database-cleanup/stage2-forward-shift/analysis.json --mode pre
node scripts/database-cleanup-apply.mjs --analysis logs/database-cleanup/stage2-forward-shift/analysis.json --stage shift-only --apply --output-dir logs/database-cleanup/stage2-forward-shift
node scripts/database-cleanup-verify.mjs --analysis logs/database-cleanup/stage2-forward-shift/analysis.json --mode post --stage shift-only --output-dir logs/database-cleanup/stage2-forward-shift
```

These commands were used for the approved Stage 2 rollout after a fresh Stage 2 analysis and pre-verification:

```bash
set -a; source .vercel/.env.production.local; set +a
node scripts/database-cleanup-analyze.mjs --timezone America/New_York --target-mode latest-complete-day --output-dir logs/database-cleanup/stage2-forward-shift
node scripts/database-cleanup-verify.mjs --analysis logs/database-cleanup/stage2-forward-shift/analysis.json --mode pre --output-dir logs/database-cleanup/stage2-forward-shift
node scripts/database-cleanup-apply.mjs --analysis logs/database-cleanup/stage2-forward-shift/analysis.json --stage shift-only --apply --output-dir logs/database-cleanup/stage2-forward-shift
node scripts/database-cleanup-verify.mjs --analysis logs/database-cleanup/stage2-forward-shift/analysis.json --mode post --stage shift-only --output-dir logs/database-cleanup/stage2-forward-shift
```

Additional reconciliation work was required during Stage 2:

- the first shift-only run exposed a pagination bug in the repair script for bulk-close `CONSUME` rows because the fetch was paged only by `created_at`
- the script was corrected to use deterministic pagination with a secondary `id` sort, the already-shifted `daily_orders` slice was restored from backup, and the Stage 2 shift was rerun successfully
- a follow-up timestamp correction was then applied to `5,585` `daily_orders` rows so `opened_at` and `closed_at` preserved the same `America/New_York` local wall-clock time across the DST boundary

## Analysis and Verification Tooling

### Analysis Script

- file: `scripts/database-cleanup-analyze.mjs`
- purpose: read-only audit of date ranges, kiosk anomalies, impacted rows, and the computed forward-shift delta

### Verification Script

- file: `scripts/database-cleanup-verify.mjs`
- `pre` mode checks that the saved analysis still matches live data
- `post` mode checks that the requested repair stage applied exactly once and preserved totals and relationships

### Repair Script

- file: `scripts/database-cleanup-apply.mjs`
- supports staged execution so kiosk-only correction and shift-only correction can be run separately
- uses deterministic pagination and a collision-safe two-step shift for `sales_line_items`

## Manual Review Policy

Rows are marked ambiguous and skipped if any of the following are true:

- no linked order consume rows exist
- menu name lookup is ambiguous
- BOM is missing
- inferred quantities disagree across ingredient rows
- reconstructed subtotal does not match the stored order subtotal within tolerance

For the current Stage 1 run, no rows met those conditions.

## Remaining Imperfection

The Stage 2 continuity shift moved the dataset forward, but it did not invent missing historical days. One interior historical gap still exists in the shifted order timeline, so the data is now current to `2026-04-22` without pretending that every missing historical day originally existed.

## Live Analytics Impact

Because the underlying order-history dataset now reaches `2026-04-22`, the Sales Analysis page can use truly current recent windows instead of relying on a latest-available fallback. The current 7-day sales window, 28-day traffic window, and pricing window all populate from real post-shift data.
