# Demo Final Sanity Check

## Pages checked
- `/`
- `/login.html`
- `/pages/dashboard.html`
- `/pages/upload.html`
- `/pages/receive.html`
- `/pages/count.html`
- `/pages/sales-analysis.html`

All of the above returned `200` from the live deployment and did not expose obvious placeholder, fallback, or debug copy in the served HTML.

## Functions checked
- `auth-login`
- `security-log-event`
- `security-analyze`
- `register_order` (confirmed indirectly through the successful demo seeding flow that used the live order-registration path)

## What looked good
- The live app is up and the main demo pages load cleanly.
- The seeded recent window is now genuinely current, ending on `2026-04-23`.
- Sales Analysis is populated with real recent data instead of fallback states.
- Dynamic Price Recommendations now returns real Stockd item recommendations tied to current menu items:
  - `The Southwest Chicken Pizza (L)` → increase
  - `The California Chicken Pizza (L)` → decrease
  - `The Thai Chicken Pizza (L)` → decrease
- Traffic Surge Patterns shows meaningful demand concentration instead of an empty chart.
- Dashboard analytics and revenue trend data are current and populated.
- Security/auth functions still work after the demo seeding and database cleanup work.

## Anything weird found
- The demo seed initially pushed a few ingredients into negative on-hand quantities, which made the inventory state look too artificial.
- The 28-day traffic view is meaningful, but it still blends some older shifted history, so its exact peak-hour shape is not driven only by the newest seeded week.
- The `get_daily_analytics` hourly breakout is still UTC-shaped in raw RPC output, so if someone inspects hour buckets too literally, the displayed hour values may look later than expected.

## What was fixed
- Restocked the most visibly problematic ingredients through the real receive flow:
  - `Red Onions`
  - `Jalapeños`
  - `BBQ Sauce`
- After the receive fix:
  - no ingredients remain at negative on-hand values
  - the inventory state still shows believable pressure/alerts without looking broken

## What remains imperfect but acceptable for demo
- Inventory still shows active low-stock pressure, but it is now believable instead of obviously broken.
- Traffic patterns are good enough for demo storytelling, even though the exact hourly distribution still reflects the broader 28-day window.
- If asked about the freshest analytics data, the honest answer is that the app now contains a curated recent demo window layered onto the repaired live dataset.

## Recommended demo order
1. Start on `/` for the product framing.
2. Go to `/login.html` and use the working demo credentials.
3. Open `/pages/dashboard.html` to show that the product feels live and current.
4. Open `/pages/sales-analysis.html` and spend the most time there:
   - Recent Daily Sales
   - Traffic Surge Patterns
   - Dynamic Price Recommendations
5. If needed, use `/pages/receive.html` or `/pages/count.html` to show the operational side of the product.
6. Keep the hidden security/monitoring backend out of the main demo unless asked directly.
