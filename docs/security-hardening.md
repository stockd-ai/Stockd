# Stockd Security Hardening

Last updated: April 22, 2026

This document captures the assignment-focused hardening work added directly into the real `Stockd` application.

## Scope

Phase 1 focused on the mandatory injection/XSS requirement:

- centralize frontend text sanitization
- harden high-risk `innerHTML` rendering paths
- normalize CSV-imported text before it reaches the database
- preserve the existing Supabase/RPC-based database access boundaries

## What Changed

### 1. Shared sanitization helper

File:

- `/Users/admin/Documents/GitHub/Stockd/Frontend/js/security-utils.js`

The helper now provides:

- `escapeHtml()` for safe interpolation into HTML templates
- `sanitizePlainText()` and `sanitizeUserNote()` for text input cleanup
- `sanitizeCsvCell()` for imported CSV values
- `sanitizeEmail()` for auth input normalization
- `formatRichTextSafe()` for AI/chat responses
- `setSelectOptions()` to avoid building dynamic `<option>` markup by string concatenation

### 2. Hardened AI output rendering

File:

- `/Users/admin/Documents/GitHub/Stockd/Frontend/js/ai-copilot.js`

AI responses previously converted raw model text into HTML with no shared escaping layer. The UI now formats assistant responses through `formatRichTextSafe()` so model output is escaped first and only a very small, deterministic subset of formatting is reintroduced.

### 3. Safer CSV ingestion path

File:

- `/Users/admin/Documents/GitHub/Stockd/Frontend/js/csv-parser.js`

Toast CSV rows are now normalized before grouping and ingest:

- menu item names are trimmed and length-limited
- category labels are trimmed and length-limited
- control characters are removed
- invalid or empty business dates are skipped
- blank item names are skipped

This reduces the chance of imported values later surfacing as unsafe UI content.

### 4. Hardened UI rendering sinks

Updated files:

- `/Users/admin/Documents/GitHub/Stockd/Frontend/login.html`
- `/Users/admin/Documents/GitHub/Stockd/Frontend/pages/onboarding.html`
- `/Users/admin/Documents/GitHub/Stockd/Frontend/pages/upload.html`
- `/Users/admin/Documents/GitHub/Stockd/Frontend/pages/dashboard.html`
- `/Users/admin/Documents/GitHub/Stockd/Frontend/pages/count.html`
- `/Users/admin/Documents/GitHub/Stockd/Frontend/pages/receive.html`
- `/Users/admin/Documents/GitHub/Stockd/Frontend/pages/sales-analysis.html`

The highest-risk rendering points now either:

- escape dynamic values before inserting HTML, or
- use DOM APIs for sensitive text and option rendering instead of raw string concatenation

Special attention was given to:

- signup confirmation messaging
- imported menu item and category names
- inventory ingredient names and notes
- AI-generated recommendation text
- PDF invoice match previews

## SQL Injection Position

Stockd already had a strong baseline here because application data access goes through:

- Supabase client queries
- PostgreSQL RPCs
- Supabase-managed parameter binding
- existing RLS policies in the database

No frontend path in this hardening pass introduced raw SQL construction. For the class report, the correct framing is:

- SQL injection risk is reduced by using Supabase/PostgreSQL RPCs instead of string-built queries
- XSS risk was further reduced by the new frontend sanitization and rendering-hardening pass

## Tests

Added and updated:

- `/Users/admin/Documents/GitHub/Stockd/tests/security-utils.test.js`

The current focused coverage checks:

- HTML escaping
- email normalization
- CSV text sanitization
- safe rich-text formatting for AI output
- Toast CSV row normalization
- security-analysis behavior avoiding false positive `200`-status spike alerts

## Current Rollout Status

As of April 22, 2026:

- the hardening changes are implemented in the real Stockd repo
- the related tests pass locally
- the full Jest suite also passed against the real Supabase project during final rollout validation
- the public Stockd frontend still needs to be redeployed through the actual Vercel project for these UI hardening changes to become public

## Validation Notes

Local validation completed:

```bash
npx jest tests/security-utils.test.js --runInBand --verbose
node --check Frontend/js/security-utils.js
node --check Frontend/js/csv-parser.js
node --check Frontend/js/supabase-client.js
node --check Frontend/js/ai-copilot.js
```
