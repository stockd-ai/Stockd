# Repo Transplant Summary

Last updated: April 22, 2026

This document records the final code transplant that moved the deployable app surface from `/Users/admin/Documents/GitHub/htmltest` into the canonical repository `/Users/admin/Documents/GitHub/Stockd`.

## Goal

- use `htmltest` as the source of truth for deployable frontend/runtime/auth/UI/scripts/tests
- keep `Stockd` as the canonical GitHub repository and deployment repo
- preserve Stockd-specific docs, workflows, and the already-live Supabase backend contract

## What Was Transplanted

- `Frontend/` app pages, assets, runtime JS, and generated monitoring data structure
- `kiosk/` frontend files
- deployable scripts and helper tests from `scripts/` and `tests/`
- `jest.config.cjs`
- `monitoring/` analysis helpers and fixtures
- `supabase/functions/copilot/`
- modular auth-login support files under `supabase/functions/auth-login/`

## What Was Preserved In Stockd

- `.github/workflows/`
- `Readme.md`
- `assignment-integration-status.md`
- `assignment-deploy-checklist.md`
- `assignment-requirements-mapping.md`
- `final-submission-checklist.md`
- `final-demo-script.md`
- `final-report-notes.md`
- `docs/`
- `supabase/config.toml`
- `supabase/functions/security-log-event/`
- `supabase/functions/security-analyze/`
- `supabase/functions/_shared/security-events.ts`
- `supabase/functions/_shared/security-analyzer.mjs`

## Compatibility Adjustments

- kept the live backend names:
  - `auth_login_guards`
  - `security_events`
  - `auth-login`
  - `security-log-event`
  - `security-analyze`
- kept the canonical route:
  - `Frontend/pages/security-monitor.html`
- adapted htmltest monitoring writes to use `security-log-event` / `security_events`
- adapted monitoring analysis helpers to understand both htmltest-style and Stockd-style event names
- preserved the live Stockd guard table name and mapped the transplanted auth flow onto it without renaming the backend contract

## Stale Files Removed

- `Frontend/js/config.js`
- `Frontend/js/exampleconfig.js`
- `Frontend/js/gemini-client.js`
- `Frontend/js/security-utils.js`

## Current State

- local validation passed after the transplant:
  - `npm ci`
  - `npm run config`
  - `npm run build`
  - `npm run check:client-js`
  - `npm test`
  - `npm run test:security`
  - `npm run test:bruteforce`
  - `npm run test:monitoring`
  - `npm run test:database`
- monitoring artifacts were regenerated in `logs/`
- Copilot frontend/runtime code was transplanted, but the live `copilot` Edge Function was not deployed from this machine because `OPENAI_API_KEY` was not available in the local setup
- the remaining deployment blocker is still Vercel project ownership/access for the real `stockd.us` frontend deployment
