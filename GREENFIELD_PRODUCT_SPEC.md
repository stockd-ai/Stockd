# GREENFIELD_PRODUCT_SPEC.md

**Product:** Stockd  
**Document owner:** Manus AI  
**Date:** May 12, 2026  
**Status:** Greenfield design document, not production code

## Product Vision

Stockd should become the **daily inventory operating system for independent restaurants and small restaurant groups**. The product must help operators know what they have, what they are likely to need, what they should order, and why. The goal is not to impress judges with an AI demo. The goal is to create a reliable workflow product that a general manager, kitchen manager, chef, or owner can trust during a real shift.

The hackathon MVP proved that restaurant inventory, recipe/BOM logic, sales ingestion, basic forecasting, reorder suggestions, and an AI copilot can be combined into a compelling prototype. The greenfield product should preserve that core insight while discarding demo-oriented assumptions. Stockd v1 should be built around **deterministic inventory accounting**, **reversible ingestion**, **auditable workflows**, and **AI that explains and drafts rather than invents or directly mutates records**.

> **Vision statement:** Stockd gives restaurants a trustworthy inventory brain: it turns messy sales, recipes, counts, invoices, and waste events into practical forecasts and reorder decisions without requiring operators to become data analysts.

## Ideal Customer Profile and Personas

The first customers should be restaurants where inventory pain is acute, but procurement complexity is still manageable. Stockd should not begin with enterprise chains, multi-warehouse distributors, or fully automated purchasing. It should begin with single-location or two-location restaurants that already have digital sales exports and enough operational discipline to complete a weekly count.

| Persona | Context | Primary Motivation | Friction Today | Stockd Promise |
|---|---|---|---|---|
| Owner-operator | Owns one independent restaurant and watches cash closely. | Reduce waste, prevent emergency purchasing, and improve confidence in food cost. | Inventory lives in spreadsheets, notebooks, invoices, and memory. | A clear weekly operating picture and a practical reorder list. |
| General manager | Runs daily operations, staffing, receiving, and supplier communication. | Save time and avoid stockouts before busy periods. | Counts are inconsistent, vendor invoices are hard to reconcile, and menu demand changes quickly. | A reliable dashboard and workflow reminders that fit normal routines. |
| Kitchen manager or chef | Owns prep, recipes, and ingredient usage. | Make sure the kitchen has enough critical items without overbuying perishables. | Recipe yields, unit conversions, substitutions, and waste are tracked informally. | Ingredient-level visibility connected to actual menu movement. |
| Shift lead | Performs counts, receives deliveries, and logs waste on tablet or phone. | Complete tasks quickly without complex analysis. | Existing tools are too back-office oriented for the kitchen. | Simple mobile-first task screens with large controls and few required fields. |
| CreateX mentor or pilot evaluator | Evaluates whether Stockd is operationally credible. | See evidence of retention, workflow adoption, and measurable value. | Hackathon demos often lack data security, onboarding, and repeatability. | A pilot-ready SaaS foundation with auditable usage and clear success metrics. |

## Core Jobs To Be Done

Stockd should prioritize daily and weekly jobs that directly influence inventory accuracy and purchasing decisions. The product should avoid building analytics that are interesting but not operationally decisive.

| Job | User Story | Product Response | Deterministic or AI-Assisted |
|---|---|---|---|
| Know what is on hand | When a manager starts the day, they need to know whether critical ingredients are safe for service. | Inventory-on-hand view derived from ledger transactions, counts, receipts, waste, and sales depletion. | Deterministic. |
| Receive deliveries accurately | When a vendor delivery arrives, the team needs to capture quantities, prices, and substitutions quickly. | Receipt workflow with PDF upload, manual correction, duplicate detection, and inventory transaction posting. | Deterministic posting with AI-assisted extraction. |
| Forecast demand | Before ordering, a manager needs a practical estimate of expected menu demand and ingredient usage. | Forecasts by menu item and ingredient using sales history, day-of-week patterns, and configurable lead times. | Deterministic model first; AI explains variance. |
| Generate reorder suggestions | When ordering from vendors, the manager needs quantities that consider stock, forecasted usage, par, pack sizes, and lead time. | Vendor-grouped reorder recommendations with confidence and reasoning. | Deterministic recommendation engine; AI explanation only. |
| Clean up imported data | After uploading CSVs or invoices, a non-technical user needs to map columns, resolve errors, and preview changes. | Mapping wizard, preview-before-commit, rollback, and import error queue. | Deterministic validation with AI-assisted mapping suggestions. |
| Maintain recipes/BOMs | When the menu changes, the chef needs ingredient usage to remain accurate. | Menu/BOM editor with yield, unit conversion, and ingredient confirmation. | Human-confirmed; AI can draft from menu descriptions. |
| Understand exceptions | When Stockd recommends unusual orders or flags waste, managers need to know why. | Explainable forecast and reorder panels with source data links. | Deterministic facts plus AI summary. |

## Primary Workflows

Stockd should feel like an operational cockpit rather than a spreadsheet replacement. The first version should define a small number of repeatable workflows and instrument whether users complete them.

| Workflow | Trigger | Happy Path | Required Safeguards | Success Signal |
|---|---|---|---|---|
| New restaurant onboarding | User signs up and creates first location. | User imports sales CSV, reviews menu, confirms ingredients, drafts BOMs, sets opening counts, and runs first forecast. | Demo data option, clear progress state, resumable steps, and safe deletion of sample data. | First useful inventory snapshot in under thirty minutes. |
| Daily dashboard review | Manager opens Stockd before or after service. | Dashboard highlights critical stockouts, low-stock items, pending receipts, import failures, and forecast changes. | No hallucinated KPIs; every figure links to source records. | User views dashboard at least three days per week during pilot. |
| Weekly count | Kitchen lead performs count on phone or tablet. | Count sheet lists high-priority items, supports save-as-draft, variance review, and posting. | Variance threshold confirmation and audit log. | Counts completed on schedule with fewer unresolved variances over time. |
| Receive vendor delivery | Delivery arrives with paper/PDF invoice. | User uploads invoice or enters items, confirms matched products, reviews totals, and posts receipt. | Duplicate invoice detection, staged preview, rollback, and immutable receipt audit trail. | Receipt posted within same business day. |
| Reorder planning | Order day or low-stock alert. | User reviews vendor-grouped recommendations, edits quantities, exports order list, and records whether ordered. | Confirmation for inventory-impacting or vendor-facing actions. | Manager reports that reorder list is accurate enough to edit rather than recreate. |
| Waste logging | Spoilage, overprep, breakage, comp, or mistake occurs. | User logs ingredient, quantity, reason, location, and optional photo. | Unit normalization, required reason, and manager review for large waste events. | Waste trends become visible within two pilot cycles. |

## MVP, Alpha, and Beta Scope

Stockd should use a staged scope because real restaurant workflows expose data quality problems quickly. The MVP is not the public launch; it is the smallest credible product that can survive internal testing and one friendly restaurant conversation.

| Scope Stage | Product Definition | Included Capabilities | Excluded Capabilities |
|---|---|---|---|
| MVP | Internal greenfield foundation and scripted demo with realistic data. | Auth, organizations, one location, CSV import, menu items, ingredients, BOMs, counts, receipts, inventory ledger, basic dashboard, and forecast/reorder prototypes. | Live POS APIs, supplier integrations, payments, dynamic pricing, multi-location rollups, mobile apps, and automated purchase orders. |
| Alpha Pilot | First real restaurant pilot with supervised onboarding. | Production RLS, audit logs, onboarding wizard, one POS-style CSV path, generic CSV mapping, vendor receipt upload, manual receipt fallback, weekly count workflow, waste log, deterministic forecasts, and confirmed reorder suggestions. | Automatic ordering, advanced ML, offline mode, accounting integrations, enterprise permissions, and dynamic pricing. |
| CreateX Demo-Ready | Investor and mentor-ready product demonstrating operational credibility. | Polished onboarding, sample and real-data modes, import reliability, explainable AI copilot, pilot metrics dashboard, and demo script. | Claims that require unverified live integrations or unmeasured ROI. |
| Beta Launch | Repeatable self-serve onboarding for a narrow market segment. | Multiple CSV templates, better unit conversion library, vendor alias learning, receipt OCR quality metrics, alerting, role-based team administration, and staging/prod CI/CD maturity. | Large chain features, full procurement marketplace, and financial reconciliation. |

## What Not To Build Yet

Stockd should explicitly avoid features that increase liability, implementation complexity, or workflow burden before the core inventory engine is proven. **Dynamic pricing should not be in v1.** The original MVP included dynamic pricing, but restaurant pricing changes create brand, customer trust, menu synchronization, and compliance issues that distract from the more urgent operational inventory wedge.

| Do Not Build Yet | Why It Should Wait | Revisit When |
|---|---|---|
| Dynamic pricing | It is controversial, hard to operationalize, and not necessary to prove the inventory value proposition. | Stockd has multiple restaurants with reliable menu, cost, and demand data. |
| Automatic purchase order submission | Vendor-facing mistakes are high trust failures. | Reorder suggestions achieve sustained pilot acceptance and vendors are mapped reliably. |
| Full POS API integrations | Each POS integration adds authentication, schema, rate-limit, and support burden. | CSV ingestion works repeatedly and a pilot has a specific POS integration need. |
| Supplier EDI or marketplace | Supplier workflows vary widely and can become a separate company. | Stockd has dense usage in a market or distributor relationship. |
| Multi-location enterprise rollups | Enterprise needs can distort the simple single-location workflow. | Two or more paying customers require location-level benchmarking. |
| Advanced ML forecasting | Data quality will dominate model quality early. | There is enough clean history across restaurants to benchmark models. |
| Native mobile apps | Browser-based responsive workflows are faster to iterate. | Tablet/phone web usage shows clear limits. |
| Accounting automation | Financial reconciliation requires high accuracy and support readiness. | Receipt capture and vendor price history are reliable. |

## Pilot Success Metrics

Pilot success should be judged by repeated workflow adoption and operator trust, not only by dashboard metrics. Some restaurant outcomes, such as waste reduction, require baseline periods and controlled measurement. During early pilots, Stockd should measure both product usage and decision quality.

| Metric Category | Metric | Target for First Pilot | Measurement Method |
|---|---|---:|---|
| Activation | Time from signup to first inventory snapshot | Under 30 minutes with guided setup | Onboarding analytics and user interview. |
| Data completeness | Percentage of top menu items with confirmed BOMs | 80% of top revenue or volume items | Menu/BOM coverage report. |
| Inventory discipline | Weekly count completion rate | 3 of 4 weeks | Count sheet completion logs. |
| Receiving discipline | Same-day receipt entry rate | 70% of vendor receipts | Receipt timestamps versus invoice dates. |
| Recommendation trust | Reorder suggestion acceptance ratio | 50% accepted or lightly edited | Recommendation versioning and user edits. |
| Forecast usefulness | Forecast error for high-volume items | Establish baseline, then improve | Forecast versus actual sales imports. |
| Waste visibility | Waste events logged per week | Non-zero and explained by category | Waste logs and manager review. |
| Retention | Weekly active manager usage | 3+ active days per week | Application events. |
| Qualitative trust | Operator confidence in recommendations | Positive interview signal | Structured pilot interview. |
| Support burden | Manual founder intervention | Declines week over week | Support notes and onboarding issues. |

## Product Principles

Stockd should be built on a small set of non-negotiable product principles. First, **the inventory ledger is the source of truth**. Every count, receipt, waste log, adjustment, and sales depletion must create auditable records rather than overwriting state invisibly. Second, **ingestion is staged and reversible**. Imports should never silently mutate operational data without preview, error reporting, and rollback. Third, **AI is an assistant, not an authority**. It can draft mappings, explain recommendations, and summarize anomalies, but it must call deterministic tools for facts and require confirmation for writes.

These principles align with the technical direction of using Supabase Postgres with row-level security for multi-tenant isolation, because Supabase explicitly recommends enabling RLS on exposed schemas and using Postgres policies to constrain access by user and role.[2] They also align with using Edge Functions for authenticated server-side workflows and third-party integrations while keeping heavy or long-running work outside short-lived request handlers.[3]

## References

[1]: Readme.md "Stockd Hackathon MVP README, local repository context"  
[2]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Docs: Row Level Security"  
[3]: https://supabase.com/docs/guides/functions "Supabase Docs: Edge Functions"  
[4]: https://www.nist.gov/itl/ai-risk-management-framework "NIST: AI Risk Management Framework"  
[5]: https://owasp.org/www-project-top-10-for-large-language-model-applications/ "OWASP Top 10 for Large Language Model Applications"
