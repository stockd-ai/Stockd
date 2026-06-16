# GREENFIELD_MODULES.md

**Product:** Stockd  
**Document owner:** Manus AI  
**Date:** May 12, 2026  
**Status:** Greenfield design document, not production code

## Module Strategy

Stockd should be built as a modular product where each module maps to a real restaurant workflow and a bounded engineering surface. The modules below are not microservices. They are implementation domains within one SaaS application and one Supabase-backed system of record. The goal is to keep ownership, testing, and release sequencing clear while avoiding premature distributed architecture.

| Module | Build Priority | Primary Users | Operational Criticality |
|---|---:|---|---|
| Auth/org/location | 1 | Owners, admins, all users | Critical for security and tenancy. |
| Onboarding | 2 | Owner, GM | Critical for activation. |
| Ingestion | 3 | Owner, GM | Critical for sales and receipt data. |
| Menu/BOM | 4 | Chef, GM | Critical for depletion and forecasts. |
| Inventory engine | 5 | System, GM | Critical for source-of-truth accounting. |
| Receive/vendor receipt | 6 | Kitchen manager, shift lead | Critical for on-hand accuracy. |
| Count | 7 | Kitchen manager, shift lead | Critical for correction and trust. |
| Waste | 8 | Staff, manager | Important for insight and shrinkage. |
| Forecasting | 9 | GM, owner | Important for planning. |
| Reorder | 10 | GM, owner | Critical for purchasing value. |
| AI copilot | 11 | Owner, GM, chef | Useful only if grounded and constrained. |
| Dashboard/analytics | 12 | Owner, GM | Important for daily adoption. |
| Settings/admin/team | 13 | Owner, admin | Needed for pilots and beta. |
| Observability/testing | Continuous | Engineering team | Critical for reliability. |

## Module Specifications

| Module | Goal | User-Facing Screens | Backend Functions | Database Tables | Dependencies | Acceptance Criteria | Risks |
|---|---|---|---|---|---|---|---|
| Auth/org/location module | Provide secure signup, login, organization creation, membership, and active location context. | Signup, login, create organization, create location, organization switcher, invitation acceptance. | `create_org_with_owner`, `create_location_with_defaults`, `invite_member`, `change_member_role`, `deactivate_member`. | `profiles`, `organizations`, `locations`, `organization_memberships`, `audit_log`. | Supabase Auth and RLS policies. | A new user can create an org/location; non-members cannot access tenant data; role changes are audited. | Incorrect RLS could leak data; invitation UX could block onboarding. |
| Onboarding module | Get a non-technical operator to first useful inventory snapshot within thirty minutes. | Welcome, setup path chooser, upload sales, map columns, menu review, ingredient confirmation, BOM drafting, initial counts, par settings, first forecast, snapshot. | `start_onboarding`, `save_onboarding_step`, `seed_demo_data`, `finalize_initial_setup`, `run_first_forecast`. | `import_jobs`, `menu_items`, `ingredients`, `bom_recipes`, `count_sheets`, `forecasts`, `audit_log`. | Auth, ingestion, Menu/BOM, inventory engine, forecasting. | User can leave and resume; each step has clear success state; demo data and real data are separated. | Too many decisions can overwhelm operators; bad imports can derail activation. |
| Ingestion module | Convert external files into staged, validated, reversible data. | Imports list, upload flow, mapping wizard, preview, error repair, commit, rollback, import detail. | `create_import_job`, `parse_csv`, `suggest_mapping`, `validate_import_preview`, `commit_sales_import`, `rollback_import`, `resolve_import_error`. | `import_jobs`, `import_errors`, `sales_imports`, `sales_line_items_raw`, `sales_daily_aggregates`, `vendor_receipts`, `receipt_items`. | Storage, AI gateway, unit conversion, audit log. | Uploads never silently commit; preview is understandable; rollback reverses all derived effects. | CSV formats vary; unit normalization can be wrong; large files can timeout if not async. |
| Menu/BOM module | Maintain sellable menu items and ingredient usage per item. | Menu list, menu item detail, BOM editor, AI draft review, ingredient picker, missing BOM report. | `upsert_menu_item`, `create_ingredient`, `draft_bom_from_menu_item`, `confirm_bom`, `validate_bom_units`. | `menu_items`, `ingredients`, `bom_recipes`, `unit_conversions`, `ai_conversations`, `audit_log`. | Ingestion for imported menu items; AI for drafts. | Top menu items can be mapped to ingredients; BOM changes are audited; AI drafts never become confirmed without approval. | Operators may not know exact recipe quantities; sub-recipes are deferred. |
| Inventory engine | Maintain deterministic inventory ledger and materialized on-hand state. | Inventory list, ingredient detail, transaction history, adjustment modal, data freshness indicators. | `post_inventory_transaction`, `rebuild_inventory_on_hand`, `post_adjustment`, `reverse_transaction`, `get_inventory_snapshot`. | `inventory_transactions`, `inventory_on_hand`, `ingredients`, `audit_log`. | Receipts, counts, waste, sales imports. | Every inventory-changing action creates ledger entries; on-hand can be rebuilt; no direct browser mutation. | Ledger mistakes create trust issues; negative inventory must be explained rather than hidden. |
| Receive/vendor receipt module | Capture deliveries and update inventory accurately. | Receive dashboard, upload invoice, receipt draft, vendor match review, receipt line editor, post receipt, receipt history. | `create_receipt_draft`, `extract_receipt_lines`, `match_vendor_products`, `post_vendor_receipt`, `reverse_receipt`. | `vendors`, `vendor_product_aliases`, `vendor_receipts`, `receipt_items`, `inventory_transactions`, `import_jobs`, `import_errors`. | Storage, ingestion, unit conversions, inventory engine. | Duplicate invoice detection works; receipt posting is atomic; unmatched lines are visible. | OCR/extraction errors can be costly; vendor pack sizes are messy. |
| Count module | Support fast physical counts and variance posting. | Count sheet list, start count, count entry, variance review, post count, count history. | `create_count_sheet`, `save_count_draft`, `calculate_count_variance`, `post_count_sheet`, `reverse_count_sheet`. | `count_sheets`, `ingredients`, `inventory_on_hand`, `inventory_transactions`, `audit_log`. | Inventory engine and permissions. | Users can save drafts; variances are visible before posting; posted counts are auditable. | Walk-in connectivity and mobile ergonomics can harm adoption. |
| Waste module | Make waste visible without adding burden. | Quick waste entry, ingredient waste modal, waste log, waste analytics by reason/category. | `log_waste`, `reverse_waste_log`, `summarize_waste_by_reason`. | `waste_logs`, `inventory_transactions`, `ingredients`, `audit_log`. | Inventory engine and mobile UI. | Waste can be logged in under thirty seconds; reasons are standardized; large events are easy to review. | Staff may skip logging unless UI is extremely simple. |
| Forecasting module | Generate practical demand and ingredient usage forecasts. | Forecast overview, menu item forecast, ingredient forecast, run history, explanation panel. | `run_forecast`, `backtest_forecast`, `get_forecast_inputs`, `publish_forecast_run`. | `sales_daily_aggregates`, `forecasts`, `menu_items`, `ingredients`, `bom_recipes`. | Ingestion, Menu/BOM, cron jobs. | Forecasts show input window, freshness, and model version; missing data is surfaced. | Sparse sales history and bad BOMs can reduce accuracy. |
| Reorder module | Convert forecasts and on-hand data into vendor-grouped recommendations. | Reorder dashboard, vendor order view, recommendation detail, edit quantity, approve, export/email draft. | `generate_reorder_recommendations`, `explain_reorder_inputs`, `approve_recommendation`, `export_reorder_list`. | `reorder_recommendations`, `inventory_on_hand`, `forecasts`, `vendors`, `vendor_product_aliases`, `audit_log`. | Forecasting, inventory engine, vendor catalog. | Recommendations are editable; accepted/rejected decisions are tracked; vendor grouping is clear. | Bad pack sizes or lead times can make suggestions look foolish. |
| AI copilot module | Provide grounded explanations, drafting assistance, and confirmed action proposals. | Copilot panel, chat history, suggested action cards, confirmation dialogs, source links. | `copilot_chat`, `call_deterministic_tool`, `create_action_proposal`, `confirm_ai_action`, `redact_ai_context`. | `ai_conversations`, `audit_log`, plus read-only access through tools. | AI provider abstraction, permissions, all deterministic modules. | Copilot cites source data; it cannot mutate data without confirmation; unsafe requests are refused. | Prompt injection, hallucinated numbers, and excessive agency are major trust risks. OWASP identifies LLM application security as a distinct risk area.[2] |
| Dashboard/analytics module | Give operators a daily operating picture. | Home dashboard, alerts, inventory health, forecast summary, reorder queue, recent activity, pilot metrics. | `get_dashboard_snapshot`, `get_alerts`, `get_data_freshness`, `get_pilot_metrics`. | Derived views over inventory, forecasts, imports, receipts, waste, audit logs. | All operational modules. | Every displayed metric links to source records; empty states guide next action. | Dashboard can become cluttered; vanity metrics can distract from workflows. |
| Settings/admin/team module | Let owners manage team, locations, vendors, preferences, and data export. | Team, roles, locations, vendors, units, integrations, audit log, data export. | `update_org_settings`, `update_location_settings`, `manage_vendor`, `export_org_data`, `view_audit_log`. | `organizations`, `locations`, `organization_memberships`, `vendors`, `unit_conversions`, `audit_log`. | Auth and data model. | Role permissions are understandable; sensitive changes are audited. | Settings complexity can creep into enterprise features too early. |
| Observability/testing module | Protect reliability and engineering velocity. | Internal health dashboard, import job diagnostics, error detail pages for support. | `record_app_event`, `record_security_event`, `health_check`, `replay_import_in_staging`. | `audit_log`, `import_jobs`, `import_errors`, optional event tables. | CI/CD, Sentry, Supabase logs. | CI runs tests; critical Edge Functions emit structured logs; pilots can be supported quickly. | If delayed, production pilots become founder-debugging sessions. |

## Cross-Module Rules

Every module must respect tenant isolation, auditability, and explicit confirmation. Inventory-changing operations should create audit log entries and inventory ledger transactions through deterministic backend paths. AI-assisted modules may draft, suggest, classify, or explain, but they cannot directly finalize mappings, BOMs, counts, receipts, or reorders.

The module sequence should optimize for first real restaurant usefulness. Auth, onboarding, ingestion, Menu/BOM, and inventory must come before a polished copilot. The copilot becomes impressive only when the deterministic system underneath it is already trustworthy.

## References

[1]: https://supabase.com/docs/guides/functions "Supabase Docs: Edge Functions"  
[2]: https://owasp.org/www-project-top-10-for-large-language-model-applications/ "OWASP Top 10 for Large Language Model Applications"
