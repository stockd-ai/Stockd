# Sales Analysis Fix

Last updated: April 22, 2026

## Root Cause by Section

### Recent Daily Sales

- The page was querying only the last 7 calendar days relative to the current date.
- After the business-date cleanup, the real historical dataset still ends on `2026-03-18` because the optional global forward shift was intentionally not applied.
- That meant the current-date-relative 7-day query returned no rows, so the section rendered an empty or unhelpful state even though valid historical sales still existed.

### Traffic Surge Patterns

- The traffic card was querying only the last 28 calendar days relative to the current date.
- With the live dataset still ending on `2026-03-18`, that 28-day window was empty.
- The chart also interpreted `opened_at` using the browser's local timezone instead of the canonical business timezone, which made the day-of-week and hour logic less reliable than it should be.

### Dynamic Price Recommendations

- The pricing card was querying only the last 7 calendar days relative to the current date.
- Since that window had no `sales_line_items`, the recommendation engine had no real item-performance data to analyze.
- The recommendation logic itself was still valid, but it lacked a fallback to the latest meaningful sales window in the database.

## What Changed

- Added a latest-available analysis-window fallback for the Sales Analysis page.
- The page now first checks the current relative window:
  - 7 days for Recent Daily Sales
  - 28 days for Traffic Surge Patterns
  - 7 days for Dynamic Price Recommendations
- If that current window is empty, the page now falls back to the latest available `business_date` window at or before the current Eastern business date.
- Added a subtle page-level note and section-level notes when fallback mode is active so the analytics remain honest and understandable.
- Updated the traffic analysis to read weekday/hour values in `America/New_York` instead of the browser's local timezone.
- Added helper functions in `Frontend/js/database-helpers.js` so the fallback logic and Eastern business-date handling are reusable and testable.

## Current Fallback Logic

- Recent Daily Sales:
  - uses the current 7-day window if rows exist
  - otherwise uses the latest available 7-day window ending on the latest stored `daily_orders.business_date`
- Traffic Surge Patterns:
  - uses the current 28-day window if rows exist
  - otherwise uses the latest available 28-day window ending on the latest stored non-voided `daily_orders.business_date`
- Dynamic Price Recommendations:
  - uses the current 7-day window if rows exist
  - otherwise uses the latest available 7-day window ending on the latest stored `sales_line_items.business_date`

## Why This Preserves Real Analytics

- No placeholder or mocked analytics were added.
- The page still uses real `daily_orders`, `sales_line_items`, and real menu-item performance data.
- The fix does not alter the live backend contract, the Stage 1 kiosk correction, or the future-write business-date normalization.
- The page is simply more resilient when the dataset is historically valid but not current to the calendar date.

## Remaining Limitations

- If there is truly no historical data in the underlying tables, the page will still show empty-state messaging.
- The page now falls back to the latest meaningful stored window, but it will not invent continuity beyond what the real data supports.
- Browser-level interactive validation was limited in this session, so the strongest verification came from direct live-data queries, local server smoke checks, and test/build results.
