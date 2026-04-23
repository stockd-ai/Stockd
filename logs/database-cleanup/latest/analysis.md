# Database Cleanup Analysis

- Generated at: 2026-04-22T09:16:17.799Z
- Project ref: ifycpxtpyysuthnknptl
- Business timezone: America/New_York
- Target mode: latest-complete-day
- Proposed shift target: 2026-04-21
- Proposed shift delta: 34 day(s)

## Current State

- Daily orders: 21920 rows (2025-01-26 → 2026-03-19)
- Daily orders subtotal total: 974842.61
- Sales line items: 25447 rows (2025-01-26 → 2026-03-19)
- Sales line items qty total: 55607
- Sales line items net sales total: 899428.83
- Consume inventory transactions: 24370 rows
- Consume inventory qty_delta total: -3306091.25
- Onboarding history window: 2025-01-26 → 2026-03-18

## Kiosk Anomalies

- Kiosk orders found: 36
- Eligible anomalies: 35
- Ambiguous rows: 0

| Order ID | Stored Date | Corrected ET Date | Delta Days | Linked Consume Rows |
| --- | --- | --- | ---: | ---: |
| KIOSK-1770558193482 | 2026-03-05 | 2026-02-08 | 25 | 6 |
| KIOSK-1770561452128 | 2026-03-05 | 2026-02-08 | 25 | 7 |
| KIOSK-1770565137831 | 2026-03-05 | 2026-02-08 | 25 | 7 |
| KIOSK-1770566352639 | 2026-03-05 | 2026-02-08 | 25 | 9 |
| KIOSK-1770567576045 | 2026-03-05 | 2026-02-08 | 25 | 7 |
| KIOSK-1770570269068 | 2026-03-05 | 2026-02-08 | 25 | 7 |
| KIOSK-1770570285366 | 2026-03-05 | 2026-02-08 | 25 | 7 |
| KIOSK-1770571154093 | 2026-03-05 | 2026-02-08 | 25 | 8 |
| KIOSK-1770715251475 | 2026-03-07 | 2026-02-10 | 25 | 7 |
| KIOSK-1770736558202 | 2026-03-07 | 2026-02-10 | 25 | 14 |

## Impacted Rows

- Kiosk correction — daily_orders: 35
- Kiosk correction — sales_line_items: 81
- Kiosk correction — inventory_txns CONSUME: 300
- Forward shift — daily_orders: 21920
- Forward shift — sales_line_items: 25447
- Forward shift — inventory_txns CONSUME: 24370

## Notes

- sales_line_items.source = 'api' is mixed kiosk plus demo-backfill data, so all historical repair work stays per-order.
- RECEIVE and COUNT inventory transactions are excluded from the forward shift because they do not carry business_date and are unrelated to order-day continuity.
