# Sales Recommendation Fix

## Root Cause

The Sales Analysis page could fall back into a bad production state for two reasons:

1. The pricing panel treated "AI returned no structured recommendation" as a visible fallback case and surfaced raw Copilot summary text directly in the UI.
2. The previous fallback path used generic local recommendation copy, which made it possible for unrelated demo wording such as pizza-focused filler text to appear even when the current Stockd dataset did not support a real pricing recommendation.

The result was a visibly broken recommendation block that showed debug-style language like `USING LOCAL FALLBACK` instead of behaving like a product feature.

## What Changed

- The pricing panel now evaluates recommendation readiness before calling Copilot.
- If the current sales window does not have enough valid pricing signal, the page shows a clean Stockd-specific insufficient-data state instead of fallback prose.
- Copilot responses are only used when the analysis window is strong enough for real recommendation work.
- If Copilot returns no structured recommendations, the page falls back to deterministic Stockd pricing rules instead of exposing raw reply text.
- Deterministic recommendations are now capped to controlled test-size moves rather than being dropped entirely when the raw move would be too large.
- The UI no longer renders debug banners or raw fallback labels.

## How Fallback Works Now

The recommendation flow now has three safe outcomes:

1. **Real recommendation mode**
   - The analysis window has enough items, days, units, and price diversity.
   - Copilot or deterministic rules produce item-specific recommendations based on actual Stockd rows.

2. **Stable-data mode**
   - There is real recent sales activity, but no reliable price move is justified.
   - The panel shows a concise message such as "No reliable price move yet."

3. **Insufficient-data mode**
   - The window lacks enough recent item coverage, sales days, sales volume, or price diversity.
   - The panel explains the exact limitation in Stockd-specific language.

## When Real Recommendations Show

The page only shows actual price recommendations when the selected analysis window has:

- enough recent item rows
- enough active days
- enough unit volume
- real price diversity across the selling items

If every selling item is currently priced the same, the page now correctly reports that price movement is not justified yet.

## Remaining Limitations

- Recommendations are still heuristic and conservative. They are designed as operator guidance, not automatic price changes.
- If the real dataset has recent sales but little or no price variation, the panel will intentionally stay sparse.
- Copilot can still be unavailable, but that no longer leaks debug or generic filler text into the production UI.
