---
name: project-audit
description: Audit current Beger implementation and select one verified open-phase task before coding.
---
# Beger Project Audit

## Activation
Before any change to Beger, read AGENTS.md, docs/BEGER-CANONICAL-PLAN.md and docs/BEGER-EXECUTION-BOARD.md. Check actual Git branch and preview SHA; never infer completion from roadmap text.

## Procedure
1. Inventory current route, auth, migration, RLS, test, environment and deployment evidence. Keep future features out of current phase.
2. Compare product contract with actual code and Staging state. Mark each item Implemented, Tested, Browser-verified, Planned, Blocked.
3. Choose smallest missing CURRENT-phase vertical slice with a testable negative path.
4. Write risk and revert scope; assign Application Engineer as implementer and Security or QA as independent verifier.
5. Deliver a concise table: finding | file/source | risk | validation | smallest next action.

## Invariants
- No new phase work before prior GO; no Production operations or merges without owner approval.
- Do not invent login sessions, service providers, business data, real customers, or CI evidence.
- If existing code contradicts canonical QR/loyalty semantics, stop and reconcile, not guess.
## Pass
Exact commit and environment identified; smallest active-phase change chosen, observable acceptance defined.
## Fail
Unverified assumptions, mixed products, feature creep, unapproved destructive operations.
