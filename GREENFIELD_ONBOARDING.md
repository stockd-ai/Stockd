# GREENFIELD_ONBOARDING.md

**Product:** Stockd  
**Document owner:** Manus AI  
**Date:** May 12, 2026  
**Status:** Greenfield design document, not production code

## Onboarding Goal

Stockd onboarding must give a non-technical restaurant operator a useful first result in **under thirty minutes of operator attention**. The first useful result is not a fully perfect model. It is an inventory snapshot and forecast that clearly show what data was imported, what is still missing, and what the operator should do next.

The onboarding experience should feel like a guided setup assistant for a restaurant, not like a database configuration tool. The product should ask questions in restaurant language: menu items, ingredients, vendors, counts, par levels, and order days. It should avoid exposing schema language such as foreign keys, canonical units, or import transactions. Internally, every step still creates auditable records, staged imports, and reversible commits.

## Onboarding Principles

| Principle | Product Implication |
|---|---|
| Start with a result, not a blank app. | Offer demo data and sample flows before requiring a perfect real import. |
| Make every step resumable. | Store onboarding progress after each step and let the user return later. |
| Prefer recognition over configuration. | Show detected menu items, ingredients, and vendors for confirmation rather than requiring manual entry first. |
| Separate draft from confirmed data. | AI-generated BOMs, mappings, and vendor matches remain drafts until confirmed. |
| Show data freshness and confidence. | Tell users which numbers came from imports, counts, manual entries, or estimates. |
| Avoid irreversible actions. | Imports are previewed before commit and can be rolled back. |

## Full Onboarding Flow

| Step | User Experience | System Behavior | Completion Criteria |
|---|---|---|---|
| 1. Signup | User signs up with email, Google, or magic link. | Create profile after auth callback. | Authenticated user lands in setup. |
| 2. Create organization | User enters restaurant group or business name. | Create `organizations` row and owner membership. | Organization exists and user is owner. |
| 3. Create first location | User enters restaurant name, address/timezone, and service days. | Create `locations` row and default settings. | Active location is selected. |
| 4. Choose setup path | User chooses demo data, POS CSV, generic CSV, manual setup, or future POS integration waitlist. | Create onboarding path state and show estimated time. | Path selected and stored. |
| 5. Upload sales history | User uploads POS-style item sales export or generic CSV. | Store raw file, create import job, parse preview. | Import preview is available or errors are shown. |
| 6. Map/review columns | User confirms date, item name, item ID, quantity, and sales columns. | Suggest mapping; validate required fields. | Mapping validates successfully. |
| 7. Review imported menu items | User sees detected menu items, categories, duplicates, and inactive items. | Stage or upsert menu items. | Menu items are committed or skipped intentionally. |
| 8. Create/confirm ingredients | User confirms suggested ingredients and adds missing items. | Draft ingredient records from BOM drafts, vendor data, or manual entry. | Core ingredients exist for top menu items. |
| 9. Draft BOMs with AI assistance | User reviews AI-drafted ingredient lists for top menu items. | AI proposes BOM rows, but they stay in draft status. | Top menu items have draft or confirmed BOMs. |
| 10. Set initial counts | User enters opening inventory for prioritized ingredients. | Create count sheet and post initial count transactions after confirmation. | Initial on-hand exists for critical ingredients. |
| 11. Set par/reorder points | User confirms recommended par/reorder defaults or manually sets them. | Store ingredient thresholds and preferred vendors. | Critical ingredients have thresholds. |
| 12. Run first forecast | User clicks run forecast or it starts automatically after prerequisites. | Generate forecasts from committed sales and BOM data. | Forecast run completes or explains missing inputs. |
| 13. Show first inventory snapshot | User sees inventory health, missing BOMs, low-stock items, and next actions. | Dashboard snapshot derives from on-hand, forecasts, and setup state. | User reaches useful initial dashboard. |

## Setup Path Design

The setup path chooser is the most important onboarding screen because it prevents users from getting stuck before value. It should present realistic options with honest expectations.

| Setup Path | Best For | Estimated Operator Time | Result |
|---|---|---:|---|
| Demo data | Investor demo, curious prospect, or user without files ready. | 2 minutes | Fully populated sample restaurant that can be cleared. |
| POS CSV | Toast-style or known POS item export. | 15 to 30 minutes | Imported menu/sales, initial forecast, and BOM draft workflow. |
| Generic CSV | Any spreadsheet with date, item, quantity, and sales columns. | 20 to 35 minutes | Mapped sales import with more review. |
| Manual setup | New restaurant or no historical data. | 20 to 40 minutes | Ingredients, menu, counts, and par without sales forecast. |
| Future POS integration | User wants live API connection. | 1 minute now | Waitlist/instructions; use CSV in alpha. |

## Screen-by-Screen Experience

### Signup

Signup should be short and should not ask for operational details until the user is authenticated. The screen should explain that Stockd is for restaurant inventory, forecasting, receiving, and reorder planning. If the user arrived from a pilot invite, the invitation should prefill organization context.

### Create Organization

The organization form should ask for business name and optional legal name. It should not ask for billing information during alpha. When the organization is created, Stockd should create the user's owner membership and an audit log entry.

### Create First Location

The first location form should ask for location name, timezone, address, operating days, and primary order days. Defaults should be inferred where possible. Since alpha is single-location, the UI should not expose complex hierarchy. The schema can support multi-location while the product keeps the experience simple.

### Choose Setup Path

This screen should show five cards: demo data, POS CSV, generic CSV, manual setup, and future POS integration. The recommended path should be highlighted based on what the user has available. Each card should show what the user needs, how long it takes, and what result they will get.

### Upload Sales History

The upload screen should accept CSV/XLSX formats for alpha and explain what columns are useful. After upload, the user should see parsing progress, file name, detected row count, and whether headers were recognized. The raw file should be stored privately because Supabase Storage supports fine-grained access control for files.[1]

### Review Imported Menu Items

The menu review screen should group imported items into clear states: new, matched existing, possible duplicate, ignored, and needs review. The user should be able to search, bulk accept obvious matches, and manually rename confusing items. The user should not need to think about database IDs.

### Create or Confirm Ingredients

Stockd should suggest ingredients from three sources: known menu item names, AI-assisted BOM drafts, and vendor invoice lines when present. The user should see a short prioritized list first, such as the ingredients needed for top-selling menu items. The product should not ask the user to model every ingredient before showing value.

### Draft BOMs with AI Assistance

BOM drafting should be scoped and humble. For example, Stockd can say, **“We drafted a starting recipe for Cheese Pizza. Please confirm quantities before using this for inventory.”** Drafts should include ingredient name, quantity, unit, confidence, and a reason. The user should be able to accept, edit, or delete each row. AI-created BOM rows remain unconfirmed until the user approves them.

### Set Initial Counts

The initial count screen should not list every possible ingredient at first. It should prioritize ingredients that drive top menu items, expensive items, and perishable items. The user can enter quantity and unit, and Stockd normalizes to base units after confirming conversion. If a conversion is uncertain, the screen should ask for confirmation.

### Set Par and Reorder Points

The par screen should offer recommended defaults based on forecasted usage and lead time when possible, but it must be clear that these are starting points. Users should be able to set simple thresholds such as “warn me below 2 cases” without understanding the full reorder algorithm.

### Run First Forecast and Snapshot

The first forecast should run only after enough prerequisites exist. If data is missing, Stockd should show a friendly readiness checklist instead of a broken forecast. The first inventory snapshot should include inventory health, forecast coverage, recommended next actions, and data-quality warnings.

## Onboarding Empty and Error States

| State | Message Strategy | Recovery Action |
|---|---|---|
| No file available | Explain that demo data or manual setup can still show the product. | Start demo data or manual setup. |
| CSV parse failed | Use plain language and show likely causes. | Upload another file or contact support. |
| Required columns missing | Show missing columns and sample accepted formats. | Open mapping wizard. |
| Duplicate menu items | Show likely duplicates side by side. | Merge, keep separate, or ignore. |
| Unit conversion unknown | Ask the user for a conversion in restaurant terms. | Save ingredient-specific conversion. |
| Forecast not ready | Explain which inputs are missing. | Add BOMs, import sales, or enter counts. |
| AI draft low confidence | Warn the user and keep rows unconfirmed. | Manually edit or skip. |

## Target Thirty-Minute Path

| Minute | User Activity | Expected Output |
|---:|---|---|
| 0-3 | Signup, org, first location. | Tenant and location created. |
| 3-8 | Choose POS CSV path and upload sales history. | Import job created and parsed. |
| 8-12 | Confirm column mapping and menu items. | Menu items staged and committed. |
| 12-20 | Confirm top ingredients and draft BOMs for top items. | BOM coverage for high-volume items. |
| 20-25 | Enter initial counts for critical ingredients. | Initial inventory snapshot. |
| 25-28 | Set par/reorder defaults. | Thresholds available. |
| 28-30 | Run first forecast and view dashboard. | Useful first result and next-action checklist. |

## Founder-Led Pilot Onboarding Checklist

During alpha, onboarding should be white-glove even though the product should be self-serve in design. Founders should prepare by asking for one sales export, two recent vendor invoices, a list of vendors, and the top twenty menu items. During the session, one founder should drive the screen while another records friction, unclear labels, import errors, and missing workflow assumptions.

| Checklist Item | Owner | Evidence |
|---|---|---|
| Pilot restaurant has signed data consent and understands alpha limitations. | Founder | Signed pilot agreement or written approval. |
| Sales CSV sample received before onboarding. | Founder | File stored in private pilot folder. |
| Vendor invoice samples received. | Founder | File stored in private pilot folder. |
| Top menu items and rough recipes known. | Restaurant operator | Notes or menu export. |
| Onboarding session scheduled outside peak service. | Founder and operator | Calendar invite. |
| First forecast and snapshot generated. | Product | Onboarding completion event. |

## References

[1]: https://supabase.com/docs/guides/storage "Supabase Docs: Storage"
