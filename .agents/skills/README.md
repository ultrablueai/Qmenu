# Codex / Agent Skills

Available repo-local skills: `project-audit`, `tenant-security`, `visual-qa`, `release-gate`, `incident-recovery`. Read the selected `.agents/skills/<name>/SKILL.md` and follow the current repository `AGENTS.md` and governance files. These skills must not override more restrictive rules.

No production changes or live financial/external messaging side effects. Staging writes require verified target and explicit approval. Tests must use local isolated/synthetic environments.

Static manifest checks: `python -m unittest discover -s .agents/skills/tests -p 'test_*.py'`.
Behavioral red-team verification is separate and not implied by static check success.
