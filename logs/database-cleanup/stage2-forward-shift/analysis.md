# Database Cleanup Analysis

- Generated at: 2026-04-23T04:10:34.432Z
- Project ref: ifycpxtpyysuthnknptl
- Business timezone: America/New_York
- Target mode: latest-complete-day
- Proposed shift target: 2026-04-22
- Proposed shift delta: 35 day(s)

## Current State

- Daily orders: 21920 rows (2025-03-02 → 2026-03-18)
- Daily orders subtotal total: 974842.61
- Sales line items: 25420 rows (2025-01-26 → 2026-03-18)
- Sales line items qty total: 55607
- Sales line items net sales total: 899428.83
- Consume inventory transactions: 24370 rows
- Consume inventory qty_delta total: -3283597.5
- Onboarding history window: 2025-01-26 → 2026-03-18

## Kiosk Anomalies

- Kiosk orders found: 36
- Eligible anomalies: 0
- Ambiguous rows: 0

| Order ID | Stored Date | Corrected ET Date | Delta Days | Linked Consume Rows |
| --- | --- | --- | ---: | ---: |
| none | — | — | — | — |

## Impacted Rows

- Kiosk correction — daily_orders: 0
- Kiosk correction — sales_line_items: 0
- Kiosk correction — inventory_txns CONSUME: 0
- Forward shift — daily_orders: 21920
- Forward shift — sales_line_items: 25420
- Forward shift — inventory_txns CONSUME: 24370

## Notes

- sales_line_items.source = 'api' is mixed kiosk plus demo-backfill data, so all historical repair work stays per-order.
- RECEIVE and COUNT inventory transactions are excluded from the forward shift because they do not carry business_date and are unrelated to order-day continuity.
