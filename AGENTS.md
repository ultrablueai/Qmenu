# BEGER — Engineering Agents Operating Contract

> Active repository: ultrablueai/Qmenu. Independent project; do not mix with DIMASQ, Garfix, Sovereign, SatışDesk or LearningOS.

## Must-read at session start
1. `docs/BEGER-CANONICAL-PLAN.md` — binding scope, QR semantics, phase order, safety gates.
2. `docs/BEGER-EXECUTION-BOARD.md` — actual status, blockers, evidence, next slice.
3. `docs/BEGER-LOYALTY-CARD-NOTIFICATIONS-SPEC.md` — approved future customer card/loyalty/notifications, not yet built.
4. Repository tests, migrations and deployment evidence; do not infer deployment from docs.

## Team architecture (ROLE INSTRUCTIONS; NOT claim of running autonomous agents)
The coordinator splits a *single active phase* into bounded tasks, reviews each independent specialist report, reconciles conflicts and is the only role allowed to propose an integrated change. Specialist reports are advisory until checked against code/tests.

| Role | Owned responsibility | Evidence to return | Can change production? |
| --- | --- | --- | --- |
| Orchestrator / Technical Lead | scope, task delegation, integration, final approval gates | one task brief, acceptance checklist, change ledger | No |
| Application Engineer | Next.js auth, API, QR/menu/flows ONLY within unlocked phase | file diff, tests, negative path | No |
| Security / Tenant Reviewer | Supabase Auth, RLS, permissions, session isolation, QR trust boundaries | two-tenant attack tests, no secret leakage | No |
| Database Reviewer | schema/migrations, rollback, idempotency, pricing/ledger integrity | migration plan, staging diff, reversible tests | No |
| QA & Mobile UX | Android/iOS, RTL Arabic/LTR Turkish, visual regression, accessibility | tested routes/devices, screenshot evidence, defects | No |
| Reliability / Release | staging deployment, CI, log checks, rollback and incident playbooks | immutable SHA, test counts, READY, acceptance gate | No |

## Workflow contract
- FIRST verify the current open phase. Only create tasks for that phase; future approved features stay documented.
- Each task has one owner-role and one independent verifier-role. Security and release gates must be verified independently of implementation.
- Use separate branches/worktrees per concurrent implementer when actual orchestration is available. In this chat, sequential tool operations are NOT autonomous background agents. Do not claim agents ran in parallel or reviewed anything unless they actually did.
- Scope a single small vertical slice, read code before editing, define tests *before* shipping, make reversible staging changes, collect build evidence, have Security + QA review, then report GO/NO-GO.
- Never make Production deploys, migrations, payments, merges, irreversible data changes, release tag, or alter user roles without explicit owner approval.
- GitHub branch `feat/g1-foundation`, PR #1 stays draft until release permission. Supabase Staging `qandxrcuetwzenlqspez`; Vercel Staging only.
- Design quality: clean role-based screens, compact first-class 320px mobile, RTL Arabic, Turkish LTR, semantic accessibility, high contrast, real error/loading states and no fake controls.
- Distinguish implemented, simulated SQL tests, actual browser E2E and future plans. Do not treat build success as business launch readiness.
- Credentials and API secrets never appear in tracked files, logs, sample screenshots or QR.
- On blockers requiring user interaction, record one precise request. Otherwise keep shipping verified phase work without feature creep.

## Built-in reusable skills
Skills are repository-local Markdown playbooks loaded only as relevant to the phase. Open a corresponding `SKILL.md` before changing its domain:
- `.agents/skills/project-audit/SKILL.md`
- `.agents/skills/tenant-security/SKILL.md`
- `.agents/skills/auth-access-qa/SKILL.md`
- `.agents/skills/visual-mobile-qa/SKILL.md`
- `.agents/skills/payment-loyalty-certification/SKILL.md` (later phase only)
- `.agents/skills/release-gate/SKILL.md`

## Current task (2026-11-01)
Phase 1 OPEN / NO-GO. Two real Supabase auth identities were confirmed. SQL isolation with their JWT subjects was verified, but complete browser and mobile E2E, signout/session checks and dual-role navigation still need human/browser proof. Do not advance QR, order, loyalty or subscriptions until Phase 1 gate.
