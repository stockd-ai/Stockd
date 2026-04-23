# Final Report Notes

Last updated: April 23, 2026

Use this file as a helper when polishing the final project report or presentation.

## Project Summary

Stockd is a real restaurant inventory and analytics application built on a Supabase/PostgreSQL backend with a Vercel-hosted frontend. For the networking course project, the real app was extended with SQLi/XSS hardening, brute-force login protection, security event logging, deterministic intrusion analysis, GitHub Actions automation, report-ready monitoring artifacts, and a real database cleanup pass that fixed kiosk business-date handling in production-like data.

## Strongest Proof Points

### 0. Real database bug fix and historical correction completed

- root cause identified: kiosk used a UTC-derived `business_date`
- server now computes `business_date` in `America/New_York`
- `35` historical kiosk orders were corrected safely
- `300` related consume transactions were corrected with them
- the affected sales aggregates were rebuilt and post-verification passed
- no ambiguous rows and no manual-review queue were left behind
- after the root-cause repair and Stage 1 correction, a controlled Stage 2 forward timeline shift of `+35` days was intentionally applied to close the stale data gap
- DST-sensitive shifted order timestamps were reconciled so `America/New_York` business-time behavior stayed correct

### 1. Real backend rollout completed

- linked Supabase project: `ifycpxtpyysuthnknptl`
- migrations applied live:
  - `20260422000100_auth_login_guards.sql`
  - `20260422000200_security_events.sql`
  - `20260422000300_business_date_normalization.sql`
- functions deployed live:
  - `auth-login`
  - `security-log-event`
  - `security-analyze`

### 2. Real security behavior was validated

- repeated failed logins triggered enforced lockout behavior
- successful guarded login still returned a valid session
- security events were written into the live `security_events` table
- live analysis summaries were returned from `security-analyze`

### 3. Real repo automation is in place

- GitHub repo: `https://github.com/stockd-ai/Stockd`
- CI workflow passed on the pushed `main` branch
- deploy workflow is valid and skips cleanly when required secrets are missing

### 4. Artifacts were generated from live data

- `logs/traffic_summary.json`
- `logs/security_analysis_sample.md`

## Requirement Mapping

### Mandatory Security: HTTPS

- satisfied by the real Vercel-hosted Stockd deployment model

### Mandatory Security: SQL injection and XSS protection

- Supabase/RPC data access reduces SQL injection risk
- shared sanitization and hardened rendering paths reduce XSS risk

### Mandatory Security: Brute-force login protection

- `auth-login` + `auth_login_guards` enforce escalating lockout behavior

### Additional Enhancement: Database Integration

- existing Supabase/PostgreSQL application with real production-style data flow, plus a live business-date bug fix, verified historical kiosk correction, and a verified full forward timeline shift to the latest completed business day

### Additional Enhancement: Traffic Monitoring and Security Analysis

- `security_events` storage
- event logging function
- deterministic analyzer
- monitoring page
- report-ready JSON and Markdown output

### Challenge / Bonus

- GitHub Actions automation
- AI-inspired anomaly summary grounded in deterministic detections

## Screenshot Plan

Use these screenshots in the final report:

1. Login page
   Show the public login UI.

2. Login protection / lockout state
   Show remaining-attempt or lockout feedback after repeated failed login attempts.

3. Dashboard page
   Show Stockd as a real, existing application rather than a course-only demo.

4. Database cleanup proof artifact
   Show `logs/database-cleanup/stage1-kiosk-repair/post-verification-stage1-kiosk.json` or the matching Markdown summary.

5. Security monitor / report artifact
   Show the backend/reporting security-analysis output rather than presenting it as a core user-facing feature.

6. GitHub Actions success run
   Show the CI workflow succeeding on `main`.

## Honest Caveat Line

Use this exact sentence if you want a concise, honest limitation statement:

> The real bug fix and Stage 1 historical kiosk correction were completed first, and the later full-timeline forward shift was applied deliberately as a controlled data-curation step for continuity while preserving `created_at` audit timestamps, keeping unrelated receive/count history untouched, and reconciling DST-sensitive order timestamps so local business-time behavior stayed correct.

## Paste-Ready Summary Paragraph

> We used the real Stockd web application as the basis for the networking course project instead of building a separate demo. The final implementation combines a real Supabase/PostgreSQL backend and an existing Vercel deployment model with assignment-specific improvements: XSS hardening, safer input handling, server-enforced brute-force login protection, persistent security event logging, deterministic AI-inspired intrusion analysis, monitoring artifacts, GitHub Actions automation, and a real database cleanup pass. That cleanup fixed the kiosk business-date bug by moving date resolution to the server in `America/New_York`, safely corrected 35 historical kiosk orders and 300 related consume transactions with successful post-verification and no manual-review rows, then intentionally shifted the broader order-history timeline forward by 35 days so the dataset reached the latest completed business day without altering `created_at` audit fields, and finally reconciled DST-sensitive shifted order timestamps so local business-time behavior remained consistent. This made the project more realistic, more defensible for grading, and closer to a production deployment than a small isolated class prototype.
