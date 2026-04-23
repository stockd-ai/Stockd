# Final Database Cleanup Status

Last updated: April 23, 2026

## 1. What was wrong originally

- The kiosk client was deriving `business_date` from `new Date().toISOString().slice(0, 10)`.
- That used the UTC calendar day instead of the restaurant's local business timezone.
- As a result, some late-night kiosk orders were stored as tomorrow's order.
- Those bad order dates also pushed related consume transactions and sales aggregates onto the wrong day.

## 2. What was fixed in forward-write logic

- The kiosk no longer sends a client-derived `business_date`.
- The backend now computes `business_date` server-side in `America/New_York`.
- The normalization priority is:
  1. `opened_at`
  2. else `closed_at`
  3. else explicit `business_date`
  4. else `timezone('America/New_York', now())::date`

This is the real root-cause fix that prevents future kiosk writes from landing on the wrong day.

## 3. What Stage 1 corrected

Stage 1 was the historical kiosk repair only.

- `35` kiosk orders were corrected in `daily_orders`
- `300` related `inventory_txns` `CONSUME` rows were corrected
- the affected `sales_line_items` aggregates were rebuilt
- Stage 1 post-verification passed with no mismatches
- no ambiguous rows required manual review

After Stage 1, the corrected maximum business date was still `2026-03-18`.

## 4. What Stage 2 shifted

Stage 2 was a separate, intentional continuity/data-curation step after the real bug fix and Stage 1 correction.

- the full order-history timeline was shifted forward by `+35` days
- `21,920` `daily_orders` rows were shifted
- `25,420` `sales_line_items` rows were shifted
- `24,370` `inventory_txns` `CONSUME` rows were shifted
- `app_config.value.history_start_date` and `history_end_date` were moved forward consistently
- `created_at` fields were preserved
- `RECEIVE` and `COUNT` history was not shifted

After Stage 2, the latest business date became `2026-04-22`.

## 5. What verification proved

- Stage 2 fresh pre-verification passed before the shift
- Stage 2 post-verification passed with no mismatches
- totals were preserved:
  - `daily_orders_subtotal = 974842.61`
  - `sales_line_items_net_sales = 899428.83`
  - `sales_line_items_qty = 55607`
  - `inventory_txns_consume_qty_delta = -3283597.5`
- kiosk rows still matched the correct `America/New_York` business date
- DST-sensitive shifted order timestamps were reconciled so local business-time behavior stayed correct

## 6. What remains imperfect

- One interior historical gap still remains in the shifted timeline.
- That is expected and honest: the continuity shift moved real data forward, but it did not invent missing historical days that were not originally present in the dataset.

## 7. How this affects live analytics pages now

- The Sales Analysis page now has truly current recent windows because the data itself now reaches `2026-04-22`.
- The recent daily sales section can use the current 7-day window.
- Traffic surge analysis can use the current 28-day window.
- Dynamic pricing recommendations can use a current item-sales window instead of relying only on fallback behavior.

## Final Interpretation

The database cleanup happened in three clearly separate layers:

1. real bug fix: move `business_date` logic to the server in `America/New_York`
2. real historical correction: fix the actually misdated kiosk rows and related aggregates
3. intentional continuity shift: move the broader order-history timeline forward by `+35` days so the live dataset reaches the latest completed business day

That separation is important for the report because it keeps the engineering story accurate and defensible.
