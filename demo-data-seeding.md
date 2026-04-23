# Demo Data Seeding

## What Was Missing Before

Before this pass, the live app was functional but the newest analysis window was too sparse for a strong demo:

- the recent 7-day sales window only had a handful of active days
- recent order density was uneven
- current pricing signals were too thin to activate dynamic price recommendations consistently
- traffic and revenue were real, but the newest window did not make the product feel fully active

## What Demo Data Was Added

A controlled demo seed was added to the most recent 7-day window ending on `2026-04-23`.

The seed inserted realistic new orders built from real menu items already in Stockd:

- `The Southwest Chicken Pizza (L)`
- `The Barbecue Chicken Pizza (L)`
- `The California Chicken Pizza (L)`
- `The Thai Chicken Pizza (L)`
- `The Pepperoni Pizza (L)`
- `The Greek Pizza (L)`
- `The Green Garden Pizza (M)`

The seeded orders were designed to create:

- populated recent daily sales across every day in the current 7-day window
- consistent lunch and dinner order density
- recommendation-ready price diversity in the chicken category
- real inventory consumption through existing BOM relationships
- refreshed forecast rows based on the seeded recent sales

## Tables Touched

The seeding pass touched these live tables:

- `daily_orders`
- `sales_line_items`
- `inventory_txns` for `CONSUME`
- `inventory_on_hand`
- `forecast_items`
- `forecast_ingredients`

## How Much Data Was Inserted or Updated

Applied from `logs/demo-seeding/latest/summary.json`:

- `54` new demo orders inserted into `daily_orders`
- `133` order line payload entries processed through `register_order`
- `951` inventory consume transactions inserted through BOM-backed order registration
- `697` forecast item rows refreshed
- `256` forecast ingredient rows refreshed

The current recent 7-day analysis window after seeding is `2026-04-17` through `2026-04-23`.

## How It Affects the Demo Pages

After seeding:

- **Recent Daily Sales** is populated for all 7 days in the current window
- **Traffic Surge Patterns** has meaningful weekday/hour activity with visible lunch and dinner peaks
- **Dynamic Price Recommendations** is in `ready` state and now returns real item-specific recommendations
- **Dashboard KPIs and analytics** are driven by fresh recent order and sales data
- **Forecast-backed dashboard content** stays coherent because forecasts were regenerated after the seed

## Reversibility

This seed is scoped and reversible.

- Before mutation, recent slices were backed up under:
  - `logs/demo-seeding/latest/backup/`
- The seeding script uses a deterministic order ID prefix:
  - `__demo_seed__analytics_`
- On rerun, the script first removes its own prior demo orders and reverses their aggregate and inventory effects before inserting the fresh seeded window again.

## Exact Commands

Preview only:

```bash
cd /Users/admin/Documents/GitHub/Stockd
node scripts/seed-demo-analytics.mjs --output-dir logs/demo-seeding/latest
```

Apply / rerun safely:

```bash
cd /Users/admin/Documents/GitHub/Stockd
node scripts/seed-demo-analytics.mjs --apply --output-dir logs/demo-seeding/latest
```

Cleanup only:

```bash
cd /Users/admin/Documents/GitHub/Stockd
node scripts/seed-demo-analytics.mjs --apply --cleanup-only --output-dir logs/demo-seeding/latest
```

## Notes for the Demo

- The seeded window is intentionally recent and demo-friendly, but it is still built through the real `register_order` path.
- Recommendations are based on real seeded sales rows, not UI placeholders.
- Inventory alerts may look more active after seeding because the demo orders create real consumption through BOM-linked ingredients.
