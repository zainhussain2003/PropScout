# PropScout agent instructions

These instructions apply to Codex and any automated coding agent working in this repository.

## Read before changing code

1. `CLAUDE.md` — canonical engineering and testing rules.
2. `docs/DECISIONS.md` — accepted product decisions and rejected alternatives.
3. `docs/propscout_platform_spec.md` — behavioural and calculation source of truth.
4. `docs/agent-loop/README.md` — Claude/Codex collaboration protocol.
5. The task record supplied by the agent-loop coordinator.

## Collaboration contract

- Only the assigned builder may write to its worktree.
- A reviewer is read-only and reviews the exact candidate commit, not a summary.
- Never edit `.agent-loop/`, `scripts/agent-loop/`, `docs/agent-loop/schemas/`,
  `docs/agent-loop/prompts/`, `.github/workflows/`, `AGENTS.md`, `CLAUDE.md`, dependency
  manifests (`package.json`, `package-lock.json`, `requirements.txt`), `conftest.py`, or the
  lint-staged/husky configuration from an automated feature task. The full list is
  `protectedPaths` in `.agent-loop/config.json`; a candidate touching any of them is rejected.
- The unattended builder is Codex. The Claude builder runs only when a human starts it with
  `--acknowledge-unsandboxed-claude-builder` (see `docs/agent-loop/POLICY.md`).
- Never push, merge, deploy, apply a migration, touch production data, or change credentials.
- Do not commit. The coordinator stages explicit paths and creates the candidate commit.
- Do not weaken, skip, delete, or rewrite a failing test to obtain a pass unless the task
  explicitly changes the documented requirement and the human owner approves that decision.
- Findings must cite the exact candidate SHA and at least one `path:start_line-end_line` location.
- Unknown or inferred facts must be labelled as such. Do not present inference as confirmation.
- If the specification, designs, and code disagree, stop and request an owner decision.

## Completion standard

A change is complete only when the reviewer accepts the exact candidate commit, all configured
gates pass, there are no unresolved P0/P1 findings, and the coordinator fast-forwards the
coordinator branch. Production release is always a separate human-owned action.
