# GREENFIELD_ARCHITECTURE.md

**Product:** Stockd  
**Document owner:** Manus AI  
**Date:** May 12, 2026  
**Status:** Greenfield design document, not production code

## Architecture Thesis

Stockd should be built as a **boring, reliable, multi-tenant SaaS** where the database enforces tenant boundaries, the backend owns all inventory-changing operations, and the frontend is a fast workflow surface for restaurant operators. The technical architecture should privilege correctness, auditability, and debuggability over novelty. The AI layer should be isolated behind a provider abstraction and must never become the source of truth.

The recommended stack is **React + Vite + TypeScript + Tailwind for the frontend, Supabase Postgres/Auth/Storage/Edge Functions for the backend, Supabase Cron plus job tables for scheduled work, and a thin AI gateway that can route between Gemini, OpenAI, and future providers**. This is the best stage-appropriate architecture because it allows a small founding team to ship real SaaS workflows quickly while still implementing row-level security, migrations, audit logs, file storage, and server-side workflows from day one. Supabase specifically recommends enabling row-level security on exposed schemas, and its policies operate as Postgres rules evaluated on table access.[1]

## Recommended Stack

| Layer | Recommendation | Rationale | Avoid For Now |
|---|---|---|---|
| Frontend | React, Vite, TypeScript, Tailwind, TanStack Query, React Router | Fast local development, straightforward deployment, strong typing, good SPA fit for an authenticated workflow app. | Next.js complexity unless public SEO pages become central. |
| Backend | Supabase Postgres, Auth, RLS, Edge Functions, SQL RPC functions | Keeps data, auth, and policies close together while enabling server-side workflows. | A custom Node monolith before product-market fit. |
| Storage | Supabase Storage private buckets | Built-in file storage with access control for CSVs, invoices, receipts, and parsed artifacts.[3] | Public buckets for sensitive restaurant files. |
| Async jobs | Import job tables, status columns, Supabase Cron, Edge Function triggers, later queue worker | Simple, inspectable job lifecycle without premature infrastructure. Supabase Cron supports recurring jobs and monitoring inside Postgres.[4] | Kafka, Temporal, or custom distributed workers in alpha. |
| AI | Provider-abstracted AI service with deterministic tool calls | Enables model swaps and guardrails while preserving deterministic data access. | Direct model calls from the browser. |
| Observability | Sentry, Supabase logs, structured audit logs, PostHog-style product analytics | Captures user-impacting errors, backend failures, and workflow adoption. | Heavy APM tooling before traffic justifies it. |
| Deployment | Vercel or Netlify for frontend, Supabase environments for backend | Low operational burden for a small team. | Kubernetes or self-managed Postgres. |

## Frontend Architecture

The frontend should be an authenticated single-page application. The app should be organized by domain modules rather than by generic component type. Each module should contain routes, screens, API hooks, forms, validation schemas, and local UI components. Shared UI primitives should live in a design-system directory, but business logic should remain close to the workflow it supports.

| Frontend Area | Responsibility | Notes |
|---|---|---|
| `app/` | Router, auth shell, layout, error boundaries, environment bootstrap | Must handle loading, unauthenticated, and unauthorized states cleanly. |
| `modules/onboarding` | Guided setup flow, CSV upload, menu review, initial count, first forecast | Must be resumable and instrumented. |
| `modules/inventory` | Inventory list, ingredient detail, transactions, adjustments | Read state from deterministic backend views. |
| `modules/receiving` | Vendor receipt upload, line review, product matching, posting | Must work well on tablets. |
| `modules/counts` | Count sheet creation, count entry, variance review, posting | Should support draft saving and large touch targets. |
| `modules/forecasting` | Forecast tables, explanations, backtesting | Should show data freshness and confidence. |
| `modules/reorder` | Recommendations, vendor grouping, approval, export | Must make edits explicit and auditable. |
| `modules/copilot` | Chat panel, confirmations, citations to source records | Must never show unsupported numbers. |
| `lib/supabase` | Supabase client, session handling, typed database client | Browser client uses user token; privileged calls go through functions. |

State management should be deliberately simple. Server state belongs in TanStack Query. Local form state belongs in React Hook Form with Zod schemas. Global state should be limited to session, active organization, active location, feature flags, and toast notifications. Inventory quantities, forecasts, and recommendations must not be recomputed in the browser except for presentational formatting.

## Backend and Supabase Architecture

Supabase should be treated as the system of record, not only a hosted database. All tenant data tables should include `org_id`; location-specific tables should also include `location_id`. RLS must be enabled on every exposed table, and policies should check membership and role. The browser may read allowed rows directly where policies are straightforward, but writes that change inventory or commit imports should go through RPC functions or Edge Functions so transactions, idempotency, audit logs, and validation remain centralized.

| Backend Component | Role | Implementation Guidance |
|---|---|---|
| Postgres tables | Durable system of record | Use migrations, typed generated clients, non-null tenant keys, and strict constraints. |
| RLS policies | Tenant isolation and role enforcement | Use organization memberships rather than trusting client-provided organization IDs. |
| SQL functions/RPC | Transactional business operations | Use for count posting, receipt posting, import commit, rollback, inventory transaction creation, and recommendation status changes. |
| Edge Functions | HTTP workflows and external services | Use for file parsing orchestration, AI gateway, webhooks, email, and signed upload workflows. Supabase Edge Functions are server-side TypeScript functions intended for third-party integrations and small AI orchestration.[2] |
| Storage buckets | Source-file and artifact retention | Private buckets by environment, path-scoped by `org_id/location_id/import_job_id`. |
| Cron jobs | Recurring forecasts, stale-job cleanup, summary generation | Use Supabase Cron for recurring jobs and job monitoring; keep each job short and idempotent.[4] |

## Edge Functions and RPC Strategy

Stockd should draw a clear line between SQL RPC and Edge Functions. SQL RPC should own operations that must be ACID transactions close to inventory tables. Edge Functions should own HTTP boundaries, external integrations, file pre-processing, AI orchestration, and jobs that need secrets. This prevents application logic from splintering while avoiding long-running database functions that are hard to monitor.

| Operation | Recommended Execution Path | Synchronous or Async | Reasoning |
|---|---|---|---|
| Create organization/location | SQL RPC called by frontend | Synchronous | Must atomically create tenant defaults and membership. |
| Upload CSV or invoice | Signed upload then Edge Function creates import job | Synchronous initiation, async processing | File upload should return quickly; parsing can run separately. |
| Preview import | Edge Function/parser writes staged rows and errors | Async | Large files can take time and need status updates. |
| Commit import | SQL RPC | Synchronous with transaction | Must atomically create raw rows, aggregates, transactions, and audit log. |
| Post count sheet | SQL RPC | Synchronous | Must create variance transactions and materialized inventory updates atomically. |
| Post vendor receipt | SQL RPC | Synchronous | Must prevent duplicate receipt posting and update inventory consistently. |
| Run forecast | Cron-triggered Edge Function plus SQL writes | Async | Can be scheduled and retried. |
| Generate reorder recommendations | SQL function plus optional explanation generation | Async or on-demand | Deterministic recommendation first; AI explanation second. |
| Copilot answer | Edge Function AI gateway calling deterministic tools | Synchronous streaming if possible | Needs secrets, guardrails, and tool mediation. |

## Async Jobs and Cron Strategy

The async subsystem should be built from explicit job tables rather than hidden background work. Every long-running operation should have a job row with status, progress, input metadata, output metadata, error count, and timestamps. This makes failures visible to operators and founders.

| Job Type | Table | Trigger | Retry Strategy | User Visibility |
|---|---|---|---|---|
| Sales CSV import | `import_jobs` | User upload | Retry parse stage only if file and mapping unchanged. | Imports page with progress and errors. |
| Receipt extraction | `import_jobs` and `vendor_receipts` draft | User upload | Retry OCR/extraction; never auto-post. | Receive page draft status. |
| Daily aggregation | `sales_daily_aggregates` | Import commit or nightly cron | Idempotent rebuild by date range. | Data freshness badge. |
| Forecast run | `forecasts` | Nightly cron or manual run | Retry once, then mark failed with reason. | Forecast page run history. |
| Reorder generation | `reorder_recommendations` | Forecast completion or user request | Idempotent by location/date/vendor. | Reorder page version history. |
| Weekly summary | `ai_conversations` or summary table | Weekly cron | Skip if required data freshness missing. | Email and dashboard summary. |

## File Storage Strategy

Stockd will handle sensitive operational files such as POS exports, vendor invoices, receipt photos, and parsed artifacts. These files should live in private Supabase Storage buckets. Supabase Storage supports file storage with fine-grained access control, APIs, and resumable upload capabilities.[3] Stockd should not expose raw restaurant files through public URLs unless a signed, short-lived URL is generated for an authorized user.

| Bucket | Contents | Retention | Access Model |
|---|---|---|---|
| `imports-raw` | Original CSVs, XLSX files, and invoice PDFs | Retain during customer life plus contractual export/delete policy. | Private; service role writes; users access via signed URLs. |
| `imports-parsed` | Normalized parse outputs and previews | Retain for rollback and audit. | Private; visible through import job UI. |
| `receipt-images` | Delivery photos or scanned invoices | Retain for receipt history. | Private; location-scoped signed access. |
| `ai-artifacts` | Prompt inputs, redacted tool outputs, generated summaries | Retain according to privacy policy. | Private; admin-only support access. |
| `demo-data` | Non-sensitive sample onboarding files | Can be public or bundled. | Read-only. |

## AI Provider Abstraction

The AI provider layer should expose a small internal interface: `generateText`, `generateStructured`, `streamResponse`, and `embed` if needed later. The application should pass a model policy rather than hardcoding a vendor in features. Provider implementations can support Gemini, OpenAI, or another OpenAI-compatible gateway. The copilot should never query the database directly through free-form SQL; it should call deterministic backend tools that enforce permissions and return scoped data.

| AI Use Case | Model Requirement | Guardrail |
|---|---|---|
| CSV mapping suggestions | Structured output with confidence | User must confirm mapping before preview. |
| BOM drafting | Ingredient extraction and quantity drafting | Mark as draft; require chef/operator confirmation. |
| Receipt line extraction | OCR or document understanding | Require line review before posting. |
| Reorder explanation | Natural-language explanation from deterministic recommendation inputs | No new numbers may be invented. |
| Weekly summary | Summarization over deterministic metrics | Cite source date range and missing data. |

This approach is consistent with NIST's AI risk-management posture, which frames AI governance around trustworthy systems and risk mitigation.[5] It also responds to OWASP's focus on LLM application risks by avoiding excessive agency, direct unmediated tool access, and insecure output handling.[6]

## Monitoring and Logging

Stockd should instrument three categories of observability: technical health, product workflow adoption, and business-data auditability. The first helps engineers fix failures; the second tells the founding team whether restaurants are adopting core workflows; the third supports trust when quantities change.

| Signal | Tooling | Examples |
|---|---|---|
| Frontend errors | Sentry | Route failures, form crashes, failed uploads, unhandled promise rejections. |
| Backend errors | Supabase logs, Sentry in Edge Functions | Import failures, AI provider failures, RPC exceptions. |
| Audit logs | `audit_log` table | User posted count, receipt committed, import rolled back, AI action confirmed. |
| Product analytics | PostHog-style events or equivalent | Onboarding step completion, reorder viewed, count posted, receipt uploaded. |
| Data freshness | Database views and dashboard badges | Last sales import, last count, last forecast, last receipt. |
| Security events | Structured table | Failed access, role change, suspicious export, service-role function error. |

## Deployment Environments

Stockd needs environment separation before any pilot data is loaded. Local development should use Supabase CLI and seeded demo data. Staging should mirror production schema and RLS policies while using synthetic or scrubbed data. Production should be locked down, backed up, and monitored.

| Environment | Purpose | Data | Deployment Rules |
|---|---|---|---|
| Local | Developer iteration | Seeded demo data only | Branch-based migrations; no production credentials. |
| Preview | Pull request validation | Seeded demo data | Automated checks and ephemeral frontend deploys. |
| Staging | Pilot rehearsal and QA | Synthetic or consented scrubbed data | Migrations applied before production. |
| Production | Real restaurants | Customer data | Protected branch, migration review, backups, incident logging. |

## Why This Stack Is Best For This Stage

This stack fits Stockd because the hardest early problems are not infrastructure scale; they are **workflow fit, tenant isolation, data correctness, and ingestion reliability**. Supabase gives the team Postgres, Auth, Storage, Edge Functions, and RLS in one development model. React and Vite keep the product fast to iterate without the overhead of server-rendering decisions that do not matter for an authenticated SaaS dashboard. A provider-abstracted AI layer allows the team to choose Gemini or OpenAI feature by feature without coupling the product to a single vendor.

The team should revisit this architecture only if one of three things happens: background jobs become too long or too frequent for Edge Functions and Cron, enterprise customers require deployment or compliance constraints that Supabase cannot satisfy, or live integrations introduce throughput requirements that need a dedicated worker architecture. Until then, the right architectural move is to keep the system understandable and auditable.

## References

[1]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase Docs: Row Level Security"  
[2]: https://supabase.com/docs/guides/functions "Supabase Docs: Edge Functions"  
[3]: https://supabase.com/docs/guides/storage "Supabase Docs: Storage"  
[4]: https://supabase.com/docs/guides/cron "Supabase Docs: Cron"  
[5]: https://www.nist.gov/itl/ai-risk-management-framework "NIST: AI Risk Management Framework"  
[6]: https://owasp.org/www-project-top-10-for-large-language-model-applications/ "OWASP Top 10 for Large Language Model Applications"
