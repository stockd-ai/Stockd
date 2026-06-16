# GREENFIELD_ROADMAP.md

**Product:** Stockd  
**Document owner:** Manus AI  
**Date:** May 12, 2026  
**Status:** Greenfield design document, not production code

## Roadmap Thesis

Stockd's roadmap should be sequenced around **trust before automation**. The team should first prove that a restaurant can onboard, import sales, confirm recipes, count inventory, receive deliveries, forecast demand, and review reorder suggestions without founder heroics. Only after that should Stockd add live integrations, automatic exports, supplier workflows, or advanced AI.

The roadmap below assumes a small founding team rebuilding from the hackathon prototype. It is intentionally practical. The product should move through internal MVP, alpha pilot, CreateX demo readiness, beta, and post-beta scale. Each phase has a concrete product definition, technical foundation, risks, and exit criteria.

## Phase Summary

| Phase | Approximate Duration | Product Definition | Primary Goal |
|---|---:|---|---|
| Phase 0: Foundation Decisions | 3-5 days | Architecture, schema, environments, and scope are frozen enough to build. | Prevent chaotic rebuild. |
| Phase 1: Internal MVP | 3-4 weeks | Single-location app with deterministic inventory engine and seeded/CSV data. | Demonstrate end-to-end core loop. |
| Phase 2: Alpha Pilot | 4-6 weeks | One real restaurant can use Stockd for a full operating cycle with founder support. | Validate workflow value and data assumptions. |
| Phase 3: CreateX Demo-Ready | 2-3 weeks overlapping alpha hardening | Polished narrative, reliable demo data, pilot metrics, and explainable copilot. | Show credibility to mentors, investors, and early customers. |
| Phase 4: Beta | 8-12 weeks | Multiple pilots with repeatable onboarding and payment readiness. | Validate repeatability and willingness to pay. |
| Phase 5: V1/GA | 3-6 months after beta | Narrow self-serve SaaS for a well-defined restaurant segment. | Scale within a constrained market. |

## Phase 0: Foundation Decisions

Phase 0 should be short but decisive. The team should create a clean Supabase project structure, choose the frontend stack, define the first schema migration, agree on RLS patterns, and write seeded demo data. The team should explicitly decide that the hackathon MVP is reference material, not architecture to preserve.

| Workstream | Deliverable | Exit Criteria |
|---|---|---|
| Product scope | MVP and alpha scope locked. | Team can say no to dynamic pricing, auto-ordering, and live POS APIs for now. |
| Architecture | Supabase + React/Vite plan accepted. | Environment and deployment plan documented. |
| Schema | First migration draft for tenant, menu, inventory, import, forecast, AI, audit tables. | RLS pattern is implemented in first migration. |
| Demo data | Seed restaurant with menu, ingredients, sales, receipts, counts, and waste. | Local app can show realistic data. |
| Engineering hygiene | CI, linting, test scaffolding, Sentry plan. | Pull request workflow is ready. |

## Phase 1: Internal MVP

The internal MVP should prove that the deterministic engine works. It does not need every workflow to be beautiful, but it must be coherent. The system should support authentication, one organization, one location, ingredients, menu items, BOMs, sales import, inventory ledger, counts, receipts, waste, forecasts, reorder suggestions, and a basic dashboard.

| Epic | Included | Not Included |
|---|---|---|
| Auth and tenancy | Signup, org creation, location creation, membership, RLS. | Complex roles or billing. |
| Core schema | All core tables and migrations. | Advanced sub-recipes or enterprise permissions. |
| Menu/BOM | Manual menu, ingredient, and BOM editing. | AI BOM drafting if it delays engine. |
| Sales import | One CSV template and preview/commit. | Live POS integration. |
| Inventory engine | Ledger, on-hand materialization, count posting, receipt posting, waste posting. | Offline support. |
| Forecast | Simple day-of-week or rolling average forecast. | Advanced ML. |
| Reorder | Simple recommendation from forecast, on-hand, par, pack size. | Vendor email sending. |
| Dashboard | Inventory health, data freshness, reorder queue. | Deep analytics. |
| Copilot | Read-only prototype grounded in deterministic tools. | Write actions. |

**Exit criteria:** A seeded demo restaurant and one imported CSV can drive an inventory snapshot, forecast, and reorder recommendation. The team can explain every number back to source records. Cross-tenant access tests pass.

## Phase 2: Alpha Pilot

Alpha should focus on one real restaurant, ideally in the Atlanta network, with founder-led onboarding and weekly feedback. The product must survive messy data, real counts, real receipts, and operator interruptions. This phase should create evidence, not just features.

| Epic | Included | Success Test |
|---|---|---|
| Guided onboarding | Resumeable setup, POS CSV path, menu review, ingredient confirmation, initial count. | First useful snapshot under 30 minutes of operator attention. |
| Generic import repair | Mapping wizard, error queue, rollback, import history. | Pilot can resolve common file issues without direct database edits. |
| Receipt workflow | Upload/manual receipt, vendor matching, receipt review, post receipt. | Same-day receipt entry for most deliveries. |
| Count workflow | Tablet count sheet, variance review, post count. | Weekly count completed during pilot. |
| Waste workflow | Quick waste logging and reason codes. | Waste is logged at least weekly. |
| Reorder explanations | Vendor-grouped suggestions with source factors. | Manager edits rather than recreates order list. |
| Copilot guardrails | Grounded read-only answers and draft suggestions; confirmed write proposal design. | Copilot answers cite source data and refuse unsafe actions. |
| Observability | Sentry, structured job errors, audit log, pilot metrics. | Founders can debug without production database spelunking. |

**Exit criteria:** The pilot restaurant uses Stockd for at least two full weeks, completes one weekly count, enters multiple receipts, reviews reorder suggestions, and provides qualitative evidence that the workflow is useful enough to continue.

## Phase 3: CreateX Demo-Ready

CreateX readiness is not the same as adding flash. The demo should prove that Stockd is a credible company because the operational loop is real, secure, and measurable. The product should support a clean scripted demo with either demo data or a sanitized pilot account.

| Demo Moment | Evidence It Should Show |
|---|---|
| Onboarding | Stockd can move from upload to useful inventory snapshot quickly. |
| Dashboard | The product knows what is low, stale, missing, and urgent. |
| Forecast | Forecasts are grounded in imported sales and confirmed BOMs. |
| Reorder | Recommendations explain on-hand, forecast, lead time, and pack size. |
| Receipt | Vendor invoice data becomes inventory only after review. |
| Count | Physical counts correct inventory through auditable transactions. |
| Copilot | AI explains and drafts, but deterministic tools supply facts. |
| Pilot metrics | Actual workflow usage and learnings are visible. |

**Exit criteria:** A mentor or investor can watch a ten-minute demo and understand the problem, the product loop, the technical moat of trustworthy inventory data, and the next pilot plan.

## Phase 4: Beta

Beta should expand to several restaurants while improving repeatability. This is where self-serve onboarding, role polish, multiple import templates, billing readiness, and better notification flows matter. The team should still avoid feature sprawl.

| Epic | Included | Exit Criteria |
|---|---|---|
| Self-serve onboarding | Fewer founder interventions, better templates, better empty states. | Two beta restaurants onboard with limited assistance. |
| Multiple locations | Limited support for small groups if demanded. | Org/location scoping remains safe and understandable. |
| Roles and teams | Owner/admin/manager/staff/viewer permissions. | Staff can count/waste without admin access. |
| Better imports | More POS CSV templates, receipt matching improvements, alias learning. | Import failure rate declines. |
| Notifications | Weekly digest, low-stock alerts, import failure alerts. | Alerts drive users back into workflows. |
| Billing readiness | Stripe plan scaffolding and subscription status. | Paid pilot or beta conversion is possible. |
| Forecast/backtesting | Accuracy dashboard and model comparisons. | Recommendations can be improved from measured error. |

**Exit criteria:** At least three restaurants complete repeated core workflows; at least one expresses willingness to pay or pays; onboarding requires materially less founder time than alpha.

## Phase 5: V1/GA

V1 should be a narrow, honest launch to a clearly defined segment rather than a broad restaurant operating platform. Stockd should have one or two reliable ingestion paths, repeatable onboarding, stable inventory accounting, and a strong reorder workflow. Live integrations can be introduced selectively where they reduce friction for the target segment.

| Possible V1 Capability | Condition To Build |
|---|---|
| Toast API integration | Multiple pilots use Toast and CSV friction is a conversion blocker. |
| Square API integration | Target segment has meaningful Square usage. |
| Supplier integration | Receipt/manual receiving is proven and a supplier relationship is available. |
| Accounting export | Customers repeatedly request COGS export and receipt costs are reliable. |
| Sub-recipes | Pilot menus cannot be modeled accurately without prep recipes. |
| Offline count mode | Walk-in connectivity blocks count adoption. |
| Native app | Browser tablet/phone workflows cannot meet usage needs after iteration. |

## Roadmap Anti-Goals

Stockd should continue to defer dynamic pricing, automatic purchase-order sending, procurement marketplace features, enterprise SSO, and broad POS integration coverage until the core workflow produces repeatable retention. These features may sound impressive, but they create risk before the product has earned operational trust.

## Roadmap Metrics

| Phase | Leading Metric | Lagging Metric |
|---|---|---|
| Internal MVP | Core loop works with seeded and imported data. | Demo can be completed without manual database fixes. |
| Alpha | Weekly count, receipt entry, and reorder review occur. | Pilot continues after two weeks. |
| CreateX Demo | Demo reliability and mentor comprehension. | Investor/customer interest in pilots. |
| Beta | Founder onboarding time declines. | Paid conversion or strong LOIs. |
| V1/GA | Repeatable activation and retention. | Revenue and expansion. |

## Final Roadmap Recommendation

The first six to eight weeks should be dominated by foundational engineering and one pilot. The team should avoid the temptation to build outward into integrations, dynamic pricing, or a feature-heavy AI assistant. The winning wedge is **trustworthy, low-friction inventory and reorder planning for independent restaurants**. The roadmap should protect that wedge.
