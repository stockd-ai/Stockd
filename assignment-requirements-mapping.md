# Assignment Requirements Mapping

Last updated: April 22, 2026

This file maps the **real Stockd implementation** to the course rubric and reflects the current rollout state.

Repository link:

- `https://github.com/stockd-ai/Stockd`

## Rubric Mapping Summary

| Rubric item | Stockd implementation | Status |
| --- | --- | --- |
| Mandatory Security 1: HTTPS | Existing Stockd hosting uses Vercel HTTPS by default. | `live-deployed` |
| Mandatory Security 2: SQL injection / XSS protection | Supabase/RPC access avoids raw SQL concatenation; frontend now includes shared sanitization and hardened rendering paths. | `repo-complete, frontend deploy pending` |
| Mandatory Security 3: brute-force login protection | `auth-login` Edge Function + `auth_login_guards` table + lockout messaging. | `backend-live, frontend deploy pending` |
| Mandatory Security 4: secure sessions / auth handling | Supabase Auth manages sessions over HTTPS; the guarded login endpoint is now deployed. | `backend-live, frontend deploy pending` |
| Additional Enhancement 1: database integration | Existing Supabase/PostgreSQL backend with migrations, RPCs, analytics, and real app data. | `live-deployed` |
| Additional Enhancement 2: performance optimization | Static frontend, lightweight client architecture, and CDN-backed hosting model. | `live-deployed` |
| Additional Enhancement 3: scalability / deployment | Real Vercel deployment model plus GitHub Actions CI/deploy workflows in repo. | `repo-complete, secrets pending` |
| Additional Enhancement 4: traffic monitoring & security analysis | `security_events` table, event-ingest function, analysis function, monitoring page, and generated artifacts. | `backend-live, frontend page deploy pending` |
| Challenge item: GitHub Actions automation | `.github/workflows/ci.yml` and `.github/workflows/deploy.yml` added to the real repo. | `repo-complete, secrets pending` |
| Challenge item: AI-inspired log monitoring | Deterministic anomaly detection plus an AI-style summary grounded in actual event evidence. | `backend-live` |

## Report-Ready Wording

### Mandatory Security 1: HTTPS

> Stockd already used a real Vercel deployment, so the website was served over HTTPS by default. This satisfied the secure transport requirement in a real hosted environment instead of a local-only demo.

### Mandatory Security 2: SQL injection / XSS protection

> Stockd already relied on Supabase queries and PostgreSQL RPCs instead of raw string-built SQL, which reduced SQL injection risk. For the assignment integration, we added explicit frontend XSS hardening by introducing shared sanitization helpers, normalizing imported CSV text, and escaping or replacing high-risk rendering paths in the real Stockd UI.

Evidence:

- `Frontend/js/security-utils.js`
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

> Stockd already used a real Supabase/PostgreSQL backend with migrations, RPC functions, and production-style data flows for onboarding, inventory, forecasting, and analytics. This makes database integration one of the strongest rubric categories in the project.

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
- `Frontend/pages/security-monitor.html`
- `logs/traffic_summary.json`
- `logs/security_analysis_sample.md`

### Challenge Item: AI-Based Log Monitoring

> The log-monitoring layer uses deterministic anomaly rules first, then produces an AI-style narrative summary grounded in those detections. This keeps the analysis explainable, inexpensive, and easy to defend in a university networking project while still satisfying the unusual-activity and AI-inspired monitoring requirement.

## Honest Final-State Summary

Use this wording if you want the report to reflect the exact rollout state:

> We used the real Stockd application as the networking course project and extended it instead of building a separate demo. By April 22, 2026, the backend rollout was complete in the real Supabase project: the new guard and monitoring migrations were applied, the login protection and monitoring Edge Functions were deployed, live security-analysis artifacts were regenerated, and the GitHub CI workflow was passing on the real repository. The remaining step was to publish the updated frontend through the actual Stockd Vercel project so the public site exposed the new login flow and monitoring page.
