# GREENFIELD_FRONTEND_UX.md

**Product:** Stockd  
**Document owner:** Manus AI  
**Date:** May 12, 2026  
**Status:** Greenfield design document, not production code

## UX Thesis

Stockd's user experience should be **workflow-first, tablet-friendly, and trust-centered**. Restaurant operators do not want another analytics tool that requires interpretation during service. They want to know what matters, what changed, and what to do next. The interface should therefore emphasize action queues, data freshness, source links, and simple explanations over dense dashboards.

The frontend should be a responsive authenticated web app built with React, Vite, TypeScript, Tailwind, TanStack Query, React Hook Form, and a small component system. A native mobile app should wait. The first product must work well on laptops, tablets, and phones through the browser, especially for count, waste, and receiving workflows.

## UX Principles

| Principle | Design Consequence |
|---|---|
| Operators scan before they read. | Use clear hierarchy, status badges, and short summaries. |
| Workflows beat reports. | The home screen should prioritize pending actions and exceptions. |
| Trust requires traceability. | Every metric links to source records and shows freshness. |
| Kitchen workflows are physical. | Count and receiving screens need large controls, minimal typing, and tablet ergonomics. |
| AI must show its work. | Copilot answers should cite data sources and distinguish facts from suggestions. |
| Empty states should teach. | Blank screens should guide the next setup action rather than look broken. |

## Information Architecture

| Navigation Area | Primary Screens | Purpose |
|---|---|---|
| Home | Dashboard, alerts, recent activity, next actions | Daily operating check-in. |
| Inventory | Inventory list, ingredient detail, transaction history, adjustments | Current stock and source-of-truth history. |
| Reorder | Recommendations, vendor order views, approval history | Purchasing decisions. |
| Forecasts | Demand forecast, ingredient forecast, backtests, run history | Planning and explanation. |
| Receive | Receipt upload, draft review, receipt history | Delivery workflow. |
| Count | Count sheets, count entry, variance review | Physical count workflow. |
| Waste | Quick log, waste history, waste summary | Waste visibility. |
| Menu | Menu items, BOM editor, missing BOMs | Recipe and ingredient usage. |
| Imports | Uploads, mapping, previews, errors, rollback | Data ingestion. |
| Copilot | Persistent panel or route | Natural-language assistance. |
| Settings | Organization, location, team, vendors, units, audit log | Administration. |

## Dashboard Design

The dashboard should not be a wall of charts. It should answer three questions: **What needs attention today? What changed since the last check? What data is stale or missing?** The first dashboard should include inventory alerts, reorder queue, import status, count status, forecast highlights, and recent activity.

| Dashboard Card | Content | Source | Interaction |
|---|---|---|---|
| Inventory Health | Critical, low, healthy, and unknown ingredient counts. | `inventory_on_hand` plus thresholds. | Click to filtered inventory list. |
| Reorder Queue | Vendor-grouped recommendations awaiting review. | `reorder_recommendations`. | Open reorder page. |
| Data Freshness | Last sales import, last count, last receipt, last forecast. | Import/count/receipt/forecast tables. | Click to relevant workflow. |
| Forecast Watchlist | Biggest expected demand increases and low-confidence forecasts. | `forecasts` and aggregates. | Open forecast detail. |
| Import Issues | Failed or blocked imports. | `import_jobs`, `import_errors`. | Open repair screen. |
| Recent Activity | Counts, receipts, waste, imports, approvals. | `audit_log`. | Open source record. |
| Copilot Summary | Optional AI-generated plain-language summary. | Deterministic snapshot plus AI explanation. | Open copilot with context. |

## Core Screen Patterns

### Inventory List

The inventory list should be the operational index of ingredients. Rows should show ingredient name, category, on-hand quantity, base unit, status, last count date, preferred vendor, and forecast coverage. Filters should include critical, low, unknown, category, vendor, and storage area. The list should avoid false precision by showing freshness badges and warning when on-hand is derived from old counts.

### Ingredient Detail

The ingredient detail screen should show current on-hand, transaction history, forecasted usage, reorder settings, vendor aliases, waste trend, and BOM usage. The key design requirement is traceability: clicking an inventory quantity should reveal the transactions that produced it.

### Reorder Page

The reorder page should group recommendations by vendor because that is how managers place orders. Each line should show recommended quantity, pack size, on-hand quantity, forecasted usage before next delivery, lead time, estimated cost, and a concise reason. Users should be able to edit quantities and approve or dismiss recommendations. Approval should create an audit event.

### Receive Workflow

Receiving should be optimized for tablets and interruptions. The screen should support upload, manual line entry, draft saving, vendor selection, match review, and posting. Low-confidence matches should be visually obvious. Posting should show a final confirmation because receipt posting increases inventory.

### Count Workflow

Count entry should use large rows, search, category grouping, storage-area grouping, and save-as-draft. The variance review should compare expected and counted quantities before posting. High variances should require acknowledgement. If walk-in connectivity becomes a problem, local draft persistence should be added before native mobile work.

### Import Wizard

The import wizard should be a stepper: upload, map, validate, preview, commit. At each step, the user should see progress and a clear explanation of what will happen next. Errors should be grouped and actionable. Commit and rollback actions should be visually distinct and confirmatory.

### Copilot Panel

The copilot should be contextual. If opened on an import, it should know the import job. If opened on a reorder recommendation, it should know the recommendation. The panel should show source links, action cards, and confirmation prompts. It should not bury important confirmations inside chat bubbles.

## Visual System

Stockd should look modern but practical. The visual language should communicate kitchen reliability rather than flashy AI novelty. Recommended direction: light-first dashboard, strong contrast, restrained green accent, warm neutrals, readable tables, and status colors used sparingly.

| Token | Recommendation |
|---|---|
| Primary color | Deep green for brand and positive operational states. |
| Warning color | Amber for stale data, low confidence, or unresolved issues. |
| Critical color | Red for stockout risk, failed imports, or destructive confirmation. |
| Neutral palette | Slate or zinc for professional back-office readability. |
| Typography | Inter or system sans; large numeric values; clear table labels. |
| Density | Medium density on desktop; larger touch targets on tablet/mobile. |
| Iconography | Simple line icons for receive, count, waste, reorder, forecast. |

## Responsive Behavior

| Device | Primary Use | Design Guidance |
|---|---|---|
| Desktop/laptop | Manager dashboard, import mapping, BOM editing, analytics. | Full navigation sidebar, data tables, multi-column layouts. |
| Tablet | Receiving, count sheets, kitchen workflows. | Larger touch targets, sticky action bar, minimal modals. |
| Phone | Daily check-in, waste logging, quick approval, alerts. | Bottom navigation or compact menu, one-column screens, full-screen drawers. |

## Accessibility and Reliability

The app should meet baseline accessibility expectations: keyboard navigation, visible focus states, semantic headings, sufficient color contrast, labels on form controls, and readable error messages. Accessibility is not only a legal or ethical issue; it also improves usability for busy restaurants using imperfect devices in poor lighting.

Reliability should be visible. Uploads, imports, forecasts, and AI responses should show loading states, retries, and failure messages. A user should never wonder whether an action happened. Destructive or inventory-changing actions should require confirmation and should show the resulting audit event or source record.

## Frontend Technical Structure

| Directory | Responsibility |
|---|---|
| `src/app` | Router, providers, layouts, auth boundary, error boundary. |
| `src/modules` | Domain modules such as inventory, receive, count, reorder, imports, menu, onboarding. |
| `src/components/ui` | Reusable primitives such as buttons, inputs, tables, dialogs, badges, cards. |
| `src/lib` | Supabase client, query helpers, formatting, dates, units, feature flags. |
| `src/types` | Generated database types and domain-specific TypeScript types. |
| `src/styles` | Tailwind globals and design tokens. |
| `src/test` | Test utilities, fixtures, mocks. |

Server state should use query keys that include org and location context. Mutations should invalidate the narrowest useful query scope. Forms should use schema validation shared with backend input expectations where possible. Error boundaries should catch route failures and include a support-friendly error ID.

## Empty-State Copy Examples

| Screen | Empty State |
|---|---|
| Inventory | “No inventory yet. Start with an initial count or upload a vendor receipt to create your first stock snapshot.” |
| Reorder | “No reorder recommendations yet. Add sales history, confirm recipes, and run a forecast to generate suggestions.” |
| Forecasts | “Forecasts need sales history and confirmed recipes. Upload sales or confirm BOMs to continue.” |
| Receipts | “No receipts posted. Upload an invoice or enter a delivery manually when your next vendor order arrives.” |
| Waste | “No waste logged yet. Use quick waste logging during service to make spoilage and mistakes visible.” |
| Imports | “Upload a sales CSV to populate menu items and demand history.” |

## UX Success Metrics

| Metric | Target | Why It Matters |
|---|---:|---|
| Time to first inventory snapshot | Under 30 minutes | Activation. |
| Count completion time | Under 45 minutes for pilot count | Kitchen workflow fit. |
| Receipt posting time | Under 5 minutes for normal invoice after setup | Receiving workflow value. |
| Reorder review time | Under 2 minutes for weekly recommendations | Purchasing workflow value. |
| Import repair completion | Majority of mapping errors resolved without founder intervention | Self-serve potential. |
| Copilot source-click rate | Non-zero during pilots | Trust and explainability. |

## References

[1]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Docs: Row Level Security"  
[2]: https://owasp.org/www-project-top-10-for-large-language-model-applications/ "OWASP Top 10 for Large Language Model Applications"
