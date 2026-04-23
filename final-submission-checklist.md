# Final Submission Checklist

Last updated: April 23, 2026

Use this as the final go/no-go checklist before submitting the course project.

## Submission Links

- GitHub repository: `https://github.com/stockd-ai/Stockd`
- Live website URL: `https://www.stockd.us`

## Repo and Deployment

- [x] Assignment enhancements implemented in the real Stockd repo
- [x] Supabase migrations applied to the real project
- [x] `auth-login` deployed
- [x] `security-log-event` deployed
- [x] `security-analyze` deployed
- [x] Live security artifacts regenerated from the real project
- [x] Updated frontend deployed through the real Stockd Vercel project
- [ ] Public login page verified to use the guarded login flow
- [ ] Public security monitor page verified in the browser

## Documentation

- [x] `repo-transplant-summary.md` added
- [x] `assignment-integration-status.md` updated
- [x] `assignment-deploy-checklist.md` updated
- [x] `assignment-requirements-mapping.md` updated
- [x] `database-cleanup-plan.md` updated
- [x] `database-cleanup-summary.md` updated
- [x] `docs/security-hardening.md` updated
- [x] `Readme.md` updated
- [x] `final-demo-script.md` added
- [ ] `report.md` exported to PDF for submission

## Database Cleanup

- [x] Root cause identified: kiosk used a UTC-derived `business_date`
- [x] Server-side business-date normalization is live in `America/New_York`
- [x] Stage 1 historical kiosk correction applied successfully
- [x] `35` kiosk orders corrected
- [x] `300` related `inventory_txns` `CONSUME` rows corrected
- [x] Affected `sales_line_items` aggregates rebuilt successfully
- [x] Stage 1 post-verification passed with no mismatches
- [x] No ambiguous rows required manual review
- [x] Fresh Stage 2 analysis generated after Stage 1
- [x] Stage 2 full forward shift applied intentionally
- [x] `21,920` `daily_orders` rows shifted forward
- [x] `25,420` `sales_line_items` rows shifted forward
- [x] `24,370` `inventory_txns` `CONSUME` rows shifted forward
- [x] Stage 2 post-verification passed with no mismatches
- [x] DST-sensitive shifted order timestamps reconciled
- [x] Latest business date is now `2026-04-22`
- [x] Sales Analysis now has truly current recent windows
- [x] Interior historical gap documented honestly as still present

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
- [ ] Stage 1 or Stage 2 database cleanup verification artifact
- [ ] GitHub Actions success runs
- [ ] one report artifact such as `logs/security_analysis_sample.md`

## GitHub / CI

- [x] repo changes committed on `main`
- [x] changes pushed to `origin/main`
- [ ] GitHub Actions secrets added
- [x] CI workflow observed on GitHub
- [x] deploy workflow ready or intentionally documented as manual

## What Still Requires Your Access

- GitHub repository secrets for Vercel and Supabase
- final screenshot capture from the public deployment
- PDF export of the final report

## Controlled Data-Curation Note

- Stage 2 was applied deliberately after the real bug fix and the real Stage 1 historical correction
- the forward shift was a controlled continuity step, not a replacement for the underlying date bug fix
- one interior historical gap still remains because the shift moved real data but did not invent missing days
