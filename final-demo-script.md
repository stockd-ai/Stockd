# Final Demo Script

Last updated: April 22, 2026

This is a concise presentation flow for the final course-project demo using the real Stockd application.

Reference links:

- GitHub repo: `https://github.com/stockd-ai/Stockd`
- Live URL: `<paste the verified Stockd production URL once confirmed>`

## 1. Opening

> Our project is the real Stockd application, which is a restaurant inventory and analytics platform built on a live Supabase backend and deployed with Vercel. For the networking assignment, we extended the existing app with security hardening, brute-force protection, monitoring, and deployment automation.

## 2. Architecture Overview

Show:

- `Readme.md`
- Supabase-backed architecture
- existing Stockd pages and analytics features

Say:

> Instead of building a fake demo app, we used a real deployed codebase and integrated the assignment requirements into that production-style stack.

> During the final integration pass, we also transplanted the deployable htmltest app surface into this canonical Stockd repo so the code we submit, test, and deploy now lives in one place.

## 3. Mandatory Security Requirement: SQLi + XSS Hardening

Show:

- `Frontend/js/security.js`
- `Frontend/js/csv-parser.js`
- `docs/security-hardening.md`

Say:

> SQL injection risk is reduced because Stockd already uses Supabase queries and PostgreSQL RPCs instead of building raw SQL strings in the frontend. For XSS protection, we added shared sanitization helpers, hardened risky UI rendering paths, and normalized imported CSV values before they could flow into the interface.

## 4. Mandatory Security Requirement: Brute-Force Login Protection

Show:

- `supabase/functions/auth-login/index.ts`
- `supabase/migrations/20260422000100_auth_login_guards.sql`
- `Frontend/login.html`

Say:

> We moved the login flow through a guarded Edge Function. Failed attempts are tracked per email, the lockout escalates over time, and the frontend shows remaining-attempt or lockout feedback to the user.

If the frontend has been redeployed:

- demonstrate a valid login
- demonstrate failed attempts reaching a lockout

If the frontend has not been redeployed yet:

- show the live validation output or the code path and explain that the backend rollout is already live in Supabase

## 5. Monitoring and Security Analysis

Show:

- `supabase/functions/security-log-event/index.ts`
- `supabase/functions/security-analyze/index.ts`
- `Frontend/pages/security-monitor.html`
- `logs/traffic_summary.json`
- `logs/security_analysis_sample.md`

Say:

> We added a security event pipeline that stores events in Supabase, analyzes them using deterministic anomaly rules, and generates an AI-style summary grounded in those detections. This covers suspicious logins, lockouts, route probing, and other abnormal activity patterns.

## 6. Deployment and Automation

Show:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `assignment-deploy-checklist.md`

Say:

> The real app already uses a live hosted environment. For the assignment, we also added CI and deployment workflows so the project is easier to validate and ship consistently.

## 7. Honest Rollout Status

Say:

> The backend rollout is complete in the real Supabase project. The remaining manual step is redeploying the updated frontend through the actual Stockd Vercel project, because that Vercel project was not accessible from this machine during the rollout session. GitHub CI is green, the deploy workflow is valid, and the repo is fully prepared for that final publish step.

## 8. Closing

> This project meets the assignment by combining mandatory security improvements with database integration, deployment automation, performance-friendly architecture, and security monitoring in a real full-stack application instead of a small isolated demo.
