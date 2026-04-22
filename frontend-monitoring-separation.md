# Frontend Monitoring Separation

## What Was Removed Or Hidden From The Visible Frontend

The public app experience was restored to a cleaner Stockd product flow by removing or hiding the monitoring/security-analysis UI that had been added for the class project:

1. Removed `Security` navigation links from the normal app pages:
   - `Frontend/pages/dashboard.html`
   - `Frontend/pages/upload.html`
   - `Frontend/pages/receive.html`
   - `Frontend/pages/count.html`
   - `Frontend/pages/sales-analysis.html`
2. Removed the dashboard’s visible `Live Database Status` card that made the product feel more academic/report-oriented than app-oriented.
3. Kept `Frontend/pages/security-monitor.html`, but converted it into an internal/report-only page:
   - no longer part of the standard top navigation
   - minimal internal header
   - explicit “internal report view” framing
   - `noindex, nofollow` meta tag

## What Backend / Reporting Capabilities Remain

The backend/reporting infrastructure remains intact for the course project and report:

- `security_events` database support
- `security-log-event`
- `security-analyze`
- guarded login / brute-force protections
- SQL injection / XSS hardening
- report artifact outputs:
  - `logs/traffic_summary.json`
  - `logs/security_analysis_sample.md`
- artifact/export scripts and related monitoring tests
- background frontend logging hooks that feed backend analysis, where they do not harm UX

## Why This Restores The Original Product UX

The original Stockd app felt like an operations product, not a classroom dashboard for security analysis. Removing the visible monitoring surface restores that feel:

- the main navigation is back to the core product flows
- the dashboard focuses on sales, inventory, and actionability
- upload / receive / count / sales pages no longer advertise the assignment-only monitoring surface
- the analysis/reporting system still exists, but it is no longer steering the product experience

## What Is Still Available For Report / Demo Use

The following are still available for instructor/demo/report use:

- `Frontend/pages/security-monitor.html`
- backend monitoring endpoints
- generated report artifacts in `logs/`
- backend logging/analysis scripts

## Routes Kept But No Longer Linked In Normal Navigation

- `/pages/security-monitor.html`

This route remains available for internal use, but it is no longer part of the standard Stockd user journey.
