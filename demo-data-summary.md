# Demo Data Summary

- A controlled recent-window demo seed was added to Stockd for the live demo.
- The seed populated the current 7-day window ending on `2026-04-23`.
- `54` new orders were inserted through the real `register_order` flow.
- `sales_line_items`, `daily_orders`, `inventory_txns`, `inventory_on_hand`, and forecast tables were updated coherently.
- Dynamic Price Recommendations is now active and returns real recommendations.
- Recent Daily Sales now shows all 7 days in the current window.
- Traffic Surge Patterns now has visible recent activity and peak hours.
- Dashboard analytics and forecast-backed surfaces now feel current and alive.

## If You Get Asked About the Data

Use this:

> We kept the real live system and then added a controlled recent demo window through the same order-registration flow the app already uses. That gave us fresh order, sales, inventory-consumption, and forecast data without faking the UI.

## If You Need to Rerun It

```bash
cd /Users/admin/Documents/GitHub/Stockd
node scripts/seed-demo-analytics.mjs --apply --output-dir logs/demo-seeding/latest
```
