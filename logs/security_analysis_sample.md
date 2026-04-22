# Security Analysis Summary

Generated: 2026-04-22T07:28:25.886Z
Events analyzed: 15

## Heuristic Summary

Detected 2 suspicious patterns across 15 monitored events. Primary risk signal: repeated failed logins with escalating lockout behavior. Secondary signal: no probe-route burst crossed the alert threshold. Highest weighted source IP: 131.96.42.157 (15 events).

## Severity Counts

- Info: 12
- Warning: 2
- Critical: 1

## Flagged Activity

- [WARNING] codex-lockout-1776840696226@example.com had 4 failed login attempts from 131.96.42.157.
- [CRITICAL] Temporary login lockout triggered for codex-lockout-1776840696226@example.com from 131.96.42.157.

## Top Source IPs

- 131.96.42.157: 15 events, risk score 19
