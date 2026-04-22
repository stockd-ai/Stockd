# Assignment Deploy Checklist

Last updated: April 22, 2026

This runbook reflects the **actual rollout state** of the assignment enhancements inside the real `Stockd` environment.

Known repository link:

- `https://github.com/stockd-ai/Stockd`

## Completed Already

The following steps were completed successfully from this machine:

```bash
cd /Users/admin/Documents/GitHub/Stockd
supabase link --project-ref ifycpxtpyysuthnknptl
supabase db push --linked --yes
supabase functions deploy auth-login --project-ref ifycpxtpyysuthnknptl --use-api
supabase functions deploy security-log-event --project-ref ifycpxtpyysuthnknptl --no-verify-jwt --use-api
supabase functions deploy security-analyze --project-ref ifycpxtpyysuthnknptl --no-verify-jwt --use-api
npm ci
npm run config
```

Also completed:

```bash
SUPABASE_URL=https://ifycpxtpyysuthnknptl.supabase.co SUPABASE_SERVICE_KEY=<service-role> node scripts/export-security-events.mjs 24
node scripts/generate-security-artifacts.mjs logs/security_events_export.jsonl
```

## Remaining Manual Rollout Steps

### 1. Push any additional repo changes to GitHub if needed

From `/Users/admin/Documents/GitHub/Stockd`:

```bash
git add Frontend .github docs logs scripts supabase tests Readme.md package.json assignment-*.md final-*.md
git commit -m "Add course-project security, monitoring, and deployment enhancements"
git push origin main
```

Notes:

- this step was already completed for the current assignment-integration changes
- avoid staging unrelated pre-existing changes such as `.DS_Store` unless you explicitly want them included
- if the real Stockd Vercel project is connected to GitHub, this push may trigger the normal frontend deployment pipeline

### 2. Deploy the frontend through the real Stockd Vercel project

This step is still required because the local Vercel account on this machine does not currently expose the Stockd production project.

Additional confirmed blockers from this machine:

- no local `.vercel/project.json` metadata is present
- GitHub deployment records for this repo were empty at audit time
- creating or linking a new Vercel project from this machine would risk targeting the wrong environment

If you have the correct Vercel project access:

```bash
cd /Users/admin/Documents/GitHub/Stockd
npx vercel pull --yes --environment=production
npx vercel deploy --prod --yes
```

If GitHub is the deployment source instead, pushing `main` may be enough once the correct project is connected.

### 3. Configure GitHub Actions secrets

The workflows are in repo, but the repository currently does not have the required secrets.

Add these in GitHub repository settings:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `GEMINI_API_KEY` if deploy-time config generation should include it

### 4. Validate the public frontend after deploy

Pages to open:

- `/login.html`
- `/pages/dashboard.html`
- `/pages/security-monitor.html`
- `/pages/receive.html`
- `/pages/count.html`
- `/pages/upload.html`

Behaviors to verify:

1. valid login still works
2. repeated failed attempts show remaining-attempt feedback
3. the lockout message appears after the threshold is reached
4. the security monitor page loads a live summary
5. no obvious console/runtime errors appear on the hardened pages

Suggested screenshots for submission:

- public login page
- lockout or remaining-attempt message
- dashboard page
- security monitor page
- GitHub Actions success run

### 5. Refresh artifacts one last time after real user traffic exists

Run:

```bash
cd /Users/admin/Documents/GitHub/Stockd
SUPABASE_URL=<real-url> SUPABASE_SERVICE_KEY=<service-key> node scripts/export-security-events.mjs 24
node scripts/generate-security-artifacts.mjs logs/security_events_export.jsonl
```

Expected outputs:

- `logs/security_events_export.jsonl`
- `logs/traffic_summary.json`
- `logs/security_analysis_sample.md`

## Important Deployment Notes

### ES256 JWT compatibility

Stockd’s project is issuing ES256 access tokens. The monitoring functions are configured to authenticate **inside the function body** using `auth.getUser()` and therefore need `verify_jwt = false` in `supabase/config.toml` plus a matching deploy.

Configured functions:

- `auth-login`
- `security-log-event`
- `security-analyze`

### Frontend runtime files

Stockd uses generated runtime files:

- `Frontend/js/env.js`
- `Frontend/js/config.js`

If these are regenerated during deployment, make sure the deployment environment has:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

## Final Validation Reference

The backend live rollout is already confirmed for:

- `auth_login_guards` migration
- `security_events` migration
- guarded login lockout behavior
- security event ingestion
- security event analysis
- GitHub CI success on the pushed `main` branch

The only remaining live validation gap is the **public frontend deployment** through the real Stockd Vercel project.
