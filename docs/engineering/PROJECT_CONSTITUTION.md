# Qmenu / Smart Business OS — Project Constitution & Decision Memory

**Status:** Owner-intent roadmap, NOT certification of shipped features.
**Project:** `ultrablueai/Qmenu`. **Independent** product; do not combine codebases, tenants, databases, secrets, deployments or subscriptions with other products.

## Identity
Independent multi-vertical Smart Business OS for cafes, restaurants, barbers/salons, clinics and retail. Common multi-tenant QR, queues/pager, appointments where applicable, loyalty/CRM, notifications and analytics; vertical modules enabled by business type.

## Core product direction
Short MVP path: for restaurant/cafe, digital menu + order + kitchen/queue/pager + loyalty; for salons/clinics appointments and queue, not restaurant ordering. Keep specific features proposed until verified in code; Turkey/Syria rollout subject to official payment providers and compliance.

## Non-negotiables
1. Keep the product independent of DIMASQ, Sovereign, SatışDesk and Garfix.
2. No assumption that conceptual modules are already implemented; verify repo and deployment.
3. Clinic workflows require special privacy, role-based authorization and segregated analytics. No medical notes in generic CRM/loyalty.
4. Use only approved official payment/webhook integrations; never simulate a real purchase as a launch result.
5. Table order, pickup pager, appointment and notifications need distinct safe workflows.
6. Avoid endless feature expansion; finish a complete vertical slice before activating another sector.

## Priority board (intent, not observed runtime)
- **NOW:** Inventory actual code, branch, deployment and authentication; choose one customer-critical end-to-end slice with real tests before asserting readiness.
- **NEXT:** Complete verified pilot with one vertical; verify multi-merchant isolation and responsive mobile UX.
- **LATER:** Additional sectors, scheduled orders, richer media/3D, multi-country payment routes after evidence.

## Engineering memory discipline
1. Before implementation: read this document, root `AGENTS.md`, current Engineering Foundation if present, and the appropriate skill; inspect actual git SHA, PR/CI, current code and provider environment.
2. Classify each claim as VERIFIED (linked evidence and commit), HISTORICAL (dated), PROPOSED (not built), or UNKNOWN. Never silently translate HISTORICAL into VERIFIED.
3. Keep one-scoped-feature-at-a-time, with a definition of done and tests before further features. When modifying a business or architecture decision, record an ADR at `docs/engineering/decisions/YYYY-MM-DD-short-title.md` with context, alternatives, decision, approvals, risks and supersedes links.
4. Capture exact test commands, outputs, branch, commit SHA, changed files, failed/unexecuted tests, deployment target, and verified blockers in this project's execution record. Avoid reports with unsupported completion percentages.
5. Multi-agent execution must have scoped role permissions, separate worktrees/file ownership, dependence order, an independent verifier and a reviewable PR.
6. Never copy customer data or credentials into documentation or another product. Do not modify Production or send real notifications/charges during tests. Staging writes require explicit scoped approval and verified target; production rollout requires separate owner approval.
7. Use provider and runtime evidence over old plans. Existing repository-specific `AGENTS.md`, engineering, and security policies remain binding; stricter rule wins.

## Project separation
- Garfix (`ultrablueai/garfix`): autonomous engineering company/product; only approved connectors, never its production DB/credentials.
- Sovereign (`ultrablueai/luxury-Car`): mobility/hospitality/tourism; own billing/booking boundary.
- SatışDesk (`ultraspeedweb/CRM-`): AI sales and customer conversations; own channels and auth.
- Qmenu (`ultrablueai/Qmenu`): multi-vertical commerce/queue/appointments; own merchants and data.
- DIMASQ and LearningOS: independent concepts with no confirmed accessible repositories in connected accounts; do not create or mix them automatically.

## Delivery evidence schema
Project | Exact repo / SHA | Current stage | Verified | Historical / Proposed | NOW outcome | Tests (executed / skipped) | Security / tenant concerns | PR | Owner approval | Next authorized step | PASS / FAIL / BLOCKED

**Do not claim a new feature is implemented because a plan, skill, screenshot, or PR draft describes it.**
