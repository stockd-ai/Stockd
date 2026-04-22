# Final Report Notes

Last updated: April 22, 2026

Use this file as a helper when polishing the final project report or presentation.

## Project Summary

Stockd is a real restaurant inventory and analytics application built on a Supabase/PostgreSQL backend with a Vercel-hosted frontend. For the networking course project, the real app was extended with SQLi/XSS hardening, brute-force login protection, security event logging, deterministic intrusion analysis, GitHub Actions automation, and report-ready monitoring artifacts.

## Strongest Proof Points

### 1. Real backend rollout completed

- linked Supabase project: `ifycpxtpyysuthnknptl`
- migrations applied live:
  - `20260422000100_auth_login_guards.sql`
  - `20260422000200_security_events.sql`
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

- existing Supabase/PostgreSQL application with real production-style data flow

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

4. Security monitor page
   Show the monitoring dashboard and flagged activity summary.

5. GitHub Actions success run
   Show the CI workflow succeeding on `main`.

6. Monitoring artifact
   Show `logs/security_analysis_sample.md` or `logs/traffic_summary.json`.

## Honest Caveat Line

Use this exact sentence if you want a concise, honest limitation statement:

> The backend rollout was completed and validated in the real Supabase project, but the final public frontend redeploy still depended on access to the actual Stockd Vercel project, which was not available from this machine during the rollout session.

## Paste-Ready Summary Paragraph

> We used the real Stockd web application as the basis for the networking course project instead of building a separate demo. The final implementation combines a real Supabase/PostgreSQL backend and an existing Vercel deployment model with assignment-specific improvements: XSS hardening, safer input handling, server-enforced brute-force login protection, persistent security event logging, deterministic AI-inspired intrusion analysis, monitoring artifacts, and GitHub Actions automation. This made the project more realistic, more defensible for grading, and closer to a production deployment than a small isolated class prototype.
