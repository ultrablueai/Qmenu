---
name: auth-access-qa
description: Certify Beger owner, merchant, staff access and session handling with independent real account browser evidence.
---
# Beger Auth & Access QA

## Current Phase 1 gate
This skill certifies Phase 1 authentication and access boundaries on Staging only. Passing static tests does not authorize Phase 2 or production promotion; real independent browser/device evidence remains mandatory.

## Preconditions
Read AGENTS.md, canonical and execution board. Staging only. Independent accounts are real; never request passwords, dump session cookies or use fabricated logins.

## Test matrix
- Anonymous /admin and /dashboard -> safe login redirect, no PII.
- Platform owner with merchant membership -> /admin and /dashboard both work; cross-switch does NOT alter role, tokens or memberships.
- Merchant-only -> /dashboard works; /admin forbidden and NO owner link; no owner RPC, no other tenant data.
- Staff (when approved real account exists) -> only assigned branches.
- Logout -> session cleared; back navigation/expired session cannot reveal privileged UI.
- Sign-in return -> only /admin or /dashboard allowed, never arbitrary external redirect; confirmation callback uses trusted host.
- Responsive smartphone check /admin and /dashboard plus Arabic/Turkish layout.

## Evidence
Record device, OS/browser, account *role only*, commit SHA, url, expected/actual, screenshot or logs when allowed, timestamps and blocker. Do NOT equate static Node tests or transaction-set auth.uid() with real browser E2E.
## Exit
All positive and negative real-browser cases pass, mobile and recovery verified, failures fixed on staging and independently re-tested.
