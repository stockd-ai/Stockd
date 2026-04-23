# Assignment Requirements Mapping

Last updated: April 23, 2026

This file maps the **real Stockd implementation** to the course rubric and reflects the current rollout state.

Repository link:

- `https://github.com/stockd-ai/Stockd`

## Rubric Mapping Summary

| Rubric item | Stockd implementation | Status |
| --- | --- | --- |
| Mandatory Security 1: HTTPS | Existing Stockd hosting uses Vercel HTTPS by default. | `live-deployed` |
| Mandatory Security 2: SQL injection / XSS protection | Supabase/RPC access avoids raw SQL concatenation; frontend now includes shared sanitization and hardened rendering paths. | `live-deployed` |
| Mandatory Security 3: brute-force login protection | `auth-login` Edge Function + `auth_login_guards` table + lockout messaging. | `live-deployed` |
| Mandatory Security 4: secure sessions / auth handling | Supabase Auth manages sessions over HTTPS; the guarded login endpoint is now deployed. | `live-deployed` |
| Additional Enhancement 1: database integration | Existing Supabase/PostgreSQL backend with migrations, RPCs, analytics, real app data, a live `business_date` normalization fix, a completed Stage 1 historical kiosk correction, and an intentionally applied Stage 2 continuity shift. | `live-deployed` |
| Additional Enhancement 2: performance optimization | Static frontend, lightweight client architecture, and CDN-backed hosting model. | `live-deployed` |
| Additional Enhancement 3: scalability / deployment | Real Vercel deployment model plus GitHub Actions CI/deploy workflows in repo. | `live-deployed, deploy secrets optional` |
| Additional Enhancement 4: traffic monitoring & security analysis | `security_events` table, event-ingest function, analysis function, internal/report monitoring page, and generated artifacts. | `backend-live, report-ready` |
| Challenge item: GitHub Actions automation | `.github/workflows/ci.yml` and `.github/workflows/deploy.yml` added to the real repo. | `ci-live, deploy secrets optional` |
| Challenge item: AI-inspired log monitoring | Deterministic anomaly detection plus an AI-style summary grounded in actual event evidence. | `backend-live` |

## Report-Ready Wording

### Mandatory Security 1: HTTPS

> Stockd already used a real Vercel deployment, so the website was served over HTTPS by default. This satisfied the secure transport requirement in a real hosted environment instead of a local-only demo.

### Mandatory Security 2: SQL injection / XSS protection

> Stockd already relied on Supabase queries and PostgreSQL RPCs instead of raw string-built SQL, which reduced SQL injection risk. For the assignment integration, we added explicit frontend XSS hardening by introducing shared sanitization helpers, normalizing imported CSV text, and escaping or replacing high-risk rendering paths in the real Stockd UI.

Evidence:

- `Frontend/js/security.js`
- `Frontend/js/csv-parser.js`
- `Frontend/js/ai-copilot.js`
- `docs/security-hardening.md`

### Mandatory Security 3: Brute-force login protection

> We replaced the direct password login call with a guarded Supabase Edge Function that tracks failed attempts per email, enforces escalating temporary lockouts, and returns lockout state to the frontend. The backend rollout for this protection is already live in the real Supabase project.

Evidence:

- `supabase/migrations/20260422000100_auth_login_guards.sql`
- `supabase/functions/auth-login/index.ts`
- `Frontend/login.html`
- `Frontend/js/supabase-client.js`

### Mandatory Security 4: Secure sessions / auth handling

> Session handling remains on Supabase Auth over HTTPS, which avoids custom cookie/session code in the frontend. The assignment integration strengthened the login entry point while keeping session issuance and refresh behavior on the managed authentication platform.

### Additional Enhancement 1: Database Integration

> Stockd already used a real Supabase/PostgreSQL backend with migrations, RPC functions, and production-style data flows for onboarding, inventory, forecasting, and analytics. During the assignment work, we also fixed a real date-handling bug in the kiosk order flow by moving `business_date` resolution to the server in `America/New_York`, safely corrected the already affected historical kiosk data in the live database, and then intentionally shifted the broader order-history timeline forward as a controlled data-curation step after verification. That makes database integration one of the strongest rubric categories in the project because it includes normal application persistence, a real production-style data repair, and a verified continuity shift that now keeps the live analytics pages current.

Evidence:

- `supabase/migrations/20260422000300_business_date_normalization.sql`
- `kiosk/kiosk.js`
- `logs/database-cleanup/stage1-kiosk-repair/apply-summary.json`
- `logs/database-cleanup/stage1-kiosk-repair/post-verification-stage1-kiosk.json`
- `logs/database-cleanup/stage2-forward-shift/analysis.json`
- `logs/database-cleanup/stage2-forward-shift/post-verification-stage2-shift.json`

### Additional Enhancement 2: Performance Optimization

> Stockd uses a static frontend with CDN-style hosting on Vercel, which provides efficient asset delivery and HTTPS by default. The application also keeps the client lightweight with direct Supabase access and generated runtime config instead of a heavier custom server tier.

### Additional Enhancement 3: Scalability & Deployment

> The project already had a real hosted deployment model on Vercel plus a managed Supabase backend. We extended that with repository automation by adding GitHub Actions for quick checks and an optional Vercel deployment workflow.

Evidence:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

### Additional Enhancement 4: Traffic Monitoring & Security Analysis

> We added a dedicated security telemetry layer on top of the existing Stockd analytics stack. Security events are stored in Supabase, analyzed by a deterministic heuristic engine, surfaced in a monitoring page, and exported into report-ready Markdown and JSON artifacts. The backend monitoring pipeline is already live in the real Supabase project.

Evidence:

- `supabase/migrations/20260422000200_security_events.sql`
- `supabase/functions/security-log-event/index.ts`
- `supabase/functions/security-analyze/index.ts`
- `Frontend/js/monitoring-client.js`
- `Frontend/pages/security-monitor.html`
- `logs/traffic_summary.json`
- `logs/security_analysis_sample.md`

### Challenge Item: AI-Based Log Monitoring

> The log-monitoring layer uses deterministic anomaly rules first, then produces an AI-style narrative summary grounded in those detections. This keeps the analysis explainable, inexpensive, and easy to defend in a university networking project while still satisfying the unusual-activity and AI-inspired monitoring requirement.

## Honest Final-State Summary

Use this wording if you want the report to reflect the exact rollout state:

> We used the real Stockd application as the networking course project and extended it instead of building a separate demo. By April 23, 2026, the backend rollout was complete in the real Supabase project: the security and monitoring migrations were applied, the login protection and monitoring Edge Functions were deployed, the kiosk `business_date` bug was fixed server-side in `America/New_York`, 35 historical kiosk orders and 300 related consume transactions were corrected with post-verification passing, the broader order-history timeline was intentionally shifted forward by 35 days after fresh analysis and post-verification, live security-analysis artifacts were regenerated, and the public frontend was deployed on the real Stockd Vercel site.

One honest caveat to mention in the report:

> One interior historical gap still remains in the shifted order-history timeline because the continuity shift moved real data forward without inventing missing historical days.
