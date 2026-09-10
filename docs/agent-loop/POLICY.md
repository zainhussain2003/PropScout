# Agent-loop policy

## Authority

The loop may make and test reversible local code changes in its isolated task worktrees. It may not
release them or act on external systems.

## Always human-gated

- Production or shared-database reads/writes that are not an explicitly supplied read-only fixture.
- Applying Supabase migrations or changing RLS, authentication, secrets, credentials, or billing.
- Deploying, pushing, merging into an owner branch, deleting data, or deleting worktrees/branches.
- Changes spanning multiple product segments where failure has broad blast radius.
- A specification/design/decision conflict or an unresolved builder/reviewer disagreement.
- Any ambiguous result whose safe and unsafe interpretations imply different irreversible actions.

Migration files may be drafted and reviewed locally, but their presence marks the task
`human_required`; the loop never applies them.

## Code-enforced controls

- Three Git worktrees with one writable owner per lane.
- A runtime mailbox outside all worktrees.
- A single-process lock and round/time caps.
- Explicit-path staging; never `git add -A`.
- Protected coordinator, prompt, schema, CI, and instruction paths.
- Codex builder runs in `workspace-write` with approvals disabled; Codex reviewer is `read-only`.
- Claude builder receives an allowlist of local edit/read/test commands; Claude reviewer receives
  only read/search tools.
- Configured tests execute as argument arrays, not interpolated shell commands.
- Coordinator promotion is `git merge --ff-only` and occurs only after acceptance.

## Known boundary

No prompt is a security boundary. The driver therefore combines tool restrictions, filesystem
separation, path policy, network-constrained Codex execution, deterministic gates, and human-owned
promotion. Claude's command allowlist is intentionally limited to tests and read-only Git commands.

If a CLI version changes its permission semantics, `agent:doctor` must fail or the invocation must
be reviewed before unattended use resumes.
