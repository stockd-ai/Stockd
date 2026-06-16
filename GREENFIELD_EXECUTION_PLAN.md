# GREENFIELD_EXECUTION_PLAN.md

**Product:** Stockd  
**Document owner:** Manus AI  
**Date:** May 12, 2026  
**Status:** Greenfield design document, not production code

## Execution Thesis

Stockd should be rebuilt through a disciplined sequence that produces a trustworthy product foundation before adding broad integrations or advanced AI. The first engineering milestone is not a beautiful dashboard. It is a secure multi-tenant system where a restaurant can import sales, define recipes, post counts and receipts, see inventory on hand, run a forecast, and review a reorder suggestion that can be explained from source records.

This execution plan assumes a small team with limited time before CreateX-facing milestones. It prioritizes decisions that reduce future rework: row-level security from day one, an immutable inventory ledger, staged imports, explicit audit logs, and a provider-abstracted copilot.

## Workstream Ownership

| Workstream | Primary Owner | Supporting Owner | Outcome |
|---|---|---|---|
| Product and pilot discovery | Founder/product | Engineering | Clear alpha workflow and pilot requirements. |
| Architecture and schema | Backend lead | Frontend lead | Secure data foundation. |
| Frontend workflows | Frontend lead | Product | Usable onboarding, inventory, count, receive, reorder screens. |
| Ingestion | Backend lead | Product | Reliable CSV and receipt workflow. |
| AI copilot | AI/backend lead | Product | Grounded assistant with guardrails. |
| QA and observability | Engineering | Product | Tests, logs, metrics, and support readiness. |
| Pilot operations | Founder/product | Engineering | Onboarding, feedback, and usage evidence. |

## First Ten Engineering Tasks

| Order | Task | Why First | Acceptance Criteria |
|---:|---|---|---|
| 1 | Create clean environment structure and confirm frontend/backend stack. | Prevents rebuilding on unclear assumptions. | Local, staging, and production strategy documented; environment variables separated. |
| 2 | Implement Supabase migrations for tenant, membership, RLS helper functions, and audit log. | Tenant isolation is the foundation for all other work. | Cross-tenant read/write tests fail safely; owner membership created during signup. |
| 3 | Implement organizations, locations, profiles, and role-aware app shell. | Every screen depends on active org/location context. | User can sign up, create org/location, and land in authenticated shell. |
| 4 | Implement core inventory schema: ingredients, menu items, BOMs, unit conversions, ledger, and on-hand. | Inventory correctness depends on schema before UI polish. | Seed script creates ingredients/menu/BOMs and derives on-hand from transactions. |
| 5 | Build deterministic inventory transaction RPCs. | Prevents direct client writes and preserves auditability. | Counts, receipts, waste, and adjustments create ledger entries and audit logs. |
| 6 | Build sales CSV import MVP with staged preview and commit. | Sales history drives menu discovery, forecasts, and reorder value. | Known template imports into raw sales and daily aggregates; rollback works. |
| 7 | Build basic onboarding path with demo data and CSV path. | Activation is the highest product risk. | New user reaches first inventory snapshot with demo or CSV data. |
| 8 | Build count and receipt posting workflows. | Physical counts and receipts make on-hand credible. | User can post a count and a manual receipt; variances and duplicate checks are visible. |
| 9 | Build simple forecast and reorder engine. | This completes the core product loop. | Recommendations explain forecast, on-hand, par/reorder point, lead time, and pack size. |
| 10 | Build read-only grounded copilot and dashboard polish. | AI should sit on top of reliable data, not replace it. | Copilot answers cite deterministic tool output; dashboard links every metric to source. |

## Sprint Plan

| Sprint | Duration | Focus | Deliverables |
|---|---:|---|---|
| Sprint 0 | 3-5 days | Foundation decisions and project setup. | Architecture locked, initial migrations drafted, seed data plan, CI skeleton. |
| Sprint 1 | 1 week | Tenant/auth/schema/RLS. | Signup, org/location, memberships, RLS tests, audit log. |
| Sprint 2 | 1 week | Inventory engine and menu/BOM foundation. | Ingredients, menu items, BOM editor, ledger, on-hand rebuild. |
| Sprint 3 | 1 week | Ingestion and onboarding. | CSV upload, mapping preview, import commit, demo data, onboarding progress. |
| Sprint 4 | 1 week | Count, receipt, waste workflows. | Count posting, manual receipt posting, waste log, inventory transaction history. |
| Sprint 5 | 1 week | Forecast/reorder/dashboard. | Forecast run, reorder recommendations, data freshness dashboard. |
| Sprint 6 | 1 week | Copilot, pilot hardening, observability. | Grounded copilot, Sentry/logging, import diagnostics, pilot script. |

## Definition of Done

A feature is not done when the screen renders. It is done when permissions, validation, auditability, error states, and basic tests exist. This is especially important for inventory features, because a silent mistake will destroy trust faster than a missing feature.

| Feature Type | Done Means |
|---|---|
| Tenant feature | RLS policies exist, role behavior is tested, and unauthorized access fails. |
| Import feature | Upload, preview, commit, rollback, error display, and audit logging work. |
| Inventory feature | Ledger transactions are created, on-hand updates, source links work, and reversal path exists. |
| AI feature | Tool outputs are permission-scoped, numeric claims are grounded, and write actions require confirmation. |
| UI workflow | Loading, empty, success, error, and interrupted states are designed and implemented. |
| Pilot feature | Founder can explain behavior to an operator and debug failures from logs. |

## Testing Plan

| Test Layer | Scope | Examples |
|---|---|---|
| Database tests | RLS, constraints, RPC behavior. | Non-member cannot select rows; posting receipt creates expected transactions. |
| Unit tests | Unit conversions, reorder math, forecast math, import parsing. | Pack-size conversion, par calculation, duplicate detection. |
| Integration tests | End-to-end backend workflows. | Import CSV, commit, run forecast, generate reorder, rollback import. |
| Frontend tests | Critical forms and route behavior. | Mapping wizard validation, count entry, receipt posting confirmation. |
| E2E smoke tests | Happy path through onboarding and core workflows. | Signup to first snapshot with seed data. |
| AI safety tests | Copilot grounding and refusal behavior. | Prompt injection in uploaded invoice does not change policy. |

## Release and Migration Discipline

All schema changes should be migration-based. Staging should receive migrations before production. Destructive migrations should be avoided during alpha unless data is synthetic or backed up. Production pilot data should be backed up before major migrations, and migrations that affect ledger or import data should include explicit verification queries.

| Release Step | Required Action |
|---|---|
| Before merge | Lint, typecheck, unit tests, migration review. |
| Before staging deploy | Apply migrations to staging and run seed smoke test. |
| Before production deploy | Review migration impact, confirm rollback plan, backup pilot data if needed. |
| After deploy | Verify auth, dashboard, import, count, receipt, and reorder smoke paths. |
| Incident | Record timeline, impact, fix, and prevention in an incident note. |

## Pilot Operating Plan

The first pilot should be founder-led. The objective is to observe workflows, not to pretend the product is fully self-serve. The team should schedule a setup call, a first count support window, and weekly review calls. Each pilot week should produce a short learning memo.

| Pilot Week | Focus | Evidence To Collect |
|---|---|---|
| Week 0 | Preparation and data collection. | Sales CSV, invoices, menu, vendor list, pilot agreement. |
| Week 1 | Onboarding and first snapshot. | Time-to-first-snapshot, setup friction, missing data. |
| Week 2 | Receipts, counts, and waste. | Count completion, receipt entry time, waste logging behavior. |
| Week 3 | Forecasts and reorders. | Recommendation edits, accepted suggestions, trust concerns. |
| Week 4 | Retention and value review. | Qualitative value, willingness to continue, price sensitivity. |

## Risk Register

| Risk | Severity | Early Signal | Mitigation |
|---|---|---|---|
| RLS or tenancy mistake leaks data. | Critical | Cross-tenant tests fail or policies are inconsistent. | Implement RLS first, use helper functions, test every table. |
| Inventory ledger logic is wrong. | Critical | On-hand cannot be reconciled after counts/receipts. | Centralize writes in RPCs and maintain rebuild tools. |
| Imports are too brittle for real CSVs. | High | Founder manually cleans every file. | Build mapping wizard, fixture library, and error repair. |
| Operators do not complete BOM setup. | High | Forecast coverage remains low. | Prioritize top menu items and use AI drafts with confirmation. |
| Receipt extraction is unreliable. | High | Users distrust posted quantities. | Keep extraction draft-only; manual fallback; require review. |
| Copilot hallucinates or overreaches. | High | Answers include unsupported numbers or action promises. | Deterministic tools, citations, confirmation cards, safety tests. |
| Reorder recommendations lack trust. | High | Managers ignore or recreate orders. | Explain inputs, allow edits, track acceptance, tune lead times and pack sizes. |
| UI is too complex for kitchen workflows. | Medium | Count/receive workflows stall on tablet. | Large controls, save drafts, minimal fields, observe real usage. |
| Scope expands before pilot proof. | Medium | Team starts dynamic pricing or marketplace work. | Use roadmap anti-goals and phase gates. |
| CreateX demo overpromises. | Medium | Claims exceed measured pilot evidence. | Use honest demo narrative and pilot metrics. |

## Immediate Next Actions

The team should begin with a clean branch and a schema-first rebuild. The first implementation week should not attempt to recreate every hackathon feature. It should establish tenant security, a realistic seed restaurant, and the inventory ledger. After that, the product can add onboarding and ingestion. This order reduces the chance of building polished screens on a weak data foundation.

## References

[1]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Docs: Row Level Security"  
[2]: https://supabase.com/docs/guides/functions "Supabase Docs: Edge Functions"  
[3]: https://owasp.org/www-project-top-10-for-large-language-model-applications/ "OWASP Top 10 for Large Language Model Applications"
