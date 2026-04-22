# Final Submission Checklist

Last updated: April 22, 2026

Use this as the final go/no-go checklist before submitting the course project.

## Submission Links

- GitHub repository: `https://github.com/stockd-ai/Stockd`
- Live website URL: `<paste the verified Stockd production URL after Vercel access is available>`

## Repo and Deployment

- [x] Assignment enhancements implemented in the real Stockd repo
- [x] Supabase migrations applied to the real project
- [x] `auth-login` deployed
- [x] `security-log-event` deployed
- [x] `security-analyze` deployed
- [x] Live security artifacts regenerated from the real project
- [ ] Updated frontend deployed through the real Stockd Vercel project
- [ ] Public login page verified to use the guarded login flow
- [ ] Public security monitor page verified in the browser

## Documentation

- [x] `assignment-integration-status.md` updated
- [x] `assignment-deploy-checklist.md` updated
- [x] `assignment-requirements-mapping.md` updated
- [x] `docs/security-hardening.md` updated
- [x] `Readme.md` updated
- [x] `final-demo-script.md` added
- [ ] `report.md` exported to PDF for submission

## Submission Artifacts

- [x] `logs/traffic_summary.json` refreshed
- [x] `logs/security_analysis_sample.md` refreshed
- [x] `logs/security_events_export.jsonl` refreshed locally
- [ ] decide whether to keep `logs/security_events_export.jsonl` local-only or commit a sanitized export
- [ ] `screenshots/` updated with real final screenshots
- [ ] live deployment URL confirmed and added wherever needed

## Screenshots To Capture

- [ ] public login page
- [ ] lockout or remaining-attempt message after repeated failed login attempts
- [ ] dashboard page
- [ ] security monitor page
- [ ] GitHub Actions success runs
- [ ] one report artifact such as `logs/security_analysis_sample.md`

## GitHub / CI

- [x] repo changes committed on `main`
- [x] changes pushed to `origin/main`
- [ ] GitHub Actions secrets added
- [x] CI workflow observed on GitHub
- [x] deploy workflow ready or intentionally documented as manual

## What Still Requires Your Access

- Vercel access to the real Stockd project
- GitHub repository secrets for Vercel and Supabase
- final screenshot capture from the public deployment
- PDF export of the final report
- confirmation of the real production website URL for submission
