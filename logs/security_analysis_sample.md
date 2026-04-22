# Stockd Monitoring Analysis

Generated at: 2026-04-22T06:57:05.463Z
Source: supabase_live

## Executive Summary

Monitoring flagged 1 suspicious pattern in the analyzed window. The most significant issue was "repeated failed logins detected", which accounted for 4 related events.

## Traffic Overview

- Total events analyzed: 15
- Last hour: 15 events
- Last 24 hours: 15 events
- Last 7 days: 15 events

## Security-Relevant Counters

- Login failures: 4
- Login successes: 7
- Brute-force challenges: 0
- Brute-force lockouts: 1
- Suspicious input events: 0
- CSV validation failures: 0
- Copilot access rejections: 0

## Top Security-Relevant Event Types

- auth.login_succeeded: 7
- auth.login_failed: 4
- custom.monitor_test: 3
- auth.login_locked: 1

## Suspicious Findings

- [MEDIUM] Repeated failed logins detected: 4 failed logins were recorded for the same hashed identifier/device scope.

## Recent Event Preview

| Time | Event | Severity | Source | Flow |
| --- | --- | --- | --- | --- |
| 2026-04-22T06:57:05.463Z | auth.login_succeeded | info | auth-login | — |
| 2026-04-22T06:55:36.618Z | custom.monitor_test | info | local-debug | — |
| 2026-04-22T06:55:36.264Z | auth.login_succeeded | info | auth-login | — |
| 2026-04-22T06:55:01.640Z | custom.monitor_test | info | local-debug | — |
| 2026-04-22T06:55:01.336Z | auth.login_succeeded | info | auth-login | — |
| 2026-04-22T06:54:10.705Z | auth.login_succeeded | info | auth-login | — |
| 2026-04-22T06:53:55.560Z | custom.monitor_test | info | local-debug | — |
| 2026-04-22T06:53:55.138Z | auth.login_succeeded | info | auth-login | — |
| 2026-04-22T06:53:27.629Z | auth.login_succeeded | info | auth-login | — |
| 2026-04-22T06:51:41.384Z | auth.login_succeeded | info | auth-login | — |
