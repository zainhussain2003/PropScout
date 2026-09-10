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
- A single-process lock held by `run`, `approve` and `reject`, with round, per-turn and task time
  caps. The task cap is hard: a gate or model turn is cut off at the deadline, and no round starts
  after it.
- Explicit-path staging; never `git add -A`.
- Protected coordinator, prompt, schema, CI, instruction, dependency-manifest and test-harness
  paths (`package.json`, lock files, `conftest.py`, `requirements.txt`, lint-staged and husky
  configuration).
- Reviewer output validated against the JSON schema — including `additionalProperties: false` —
  and every citation resolved at the candidate SHA before the review is recorded or fed back.
- Configured bootstrap and gates execute as argument arrays, not interpolated shell commands.
- Gate failures are logged with the command's stdout and stderr, not only the exit code.
- A partially failed `init` removes the lanes it created; it never leaves orphaned branches or
  worktrees without a task record.
- Coordinator promotion is `git merge --ff-only` and occurs only after acceptance.

## Builder lanes are not equally sandboxed

**Codex builder** runs under `codex exec --sandbox workspace-write` — an OS-level sandbox with
networking disabled by Codex's default policy. Its reviewer lane is `--sandbox read-only`. These
are boundaries the model cannot reason its way past.

**Claude builder** runs with a tool allowlist:

```
Read,Edit,Write,Glob,Grep,Bash(npm run *),Bash(npm test *),Bash(python -m pytest *),Bash(git diff *),Bash(git status *)
```

That allowlist is **not** a security boundary. `npm run *` executes any script in `package.json`,
and `python -m pytest *` executes `conftest.py` and every test file — all of which the builder can
`Write`. The path policy runs _after_ the builder finishes, so it can block promotion of such an
edit but not its side effects during the turn. The lane has no network restriction, and worktrees
share the repository's remotes.

Consequences, enforced in code:

- `codex` is the default builder. `--builder claude` is refused unless the operator passes
  `--acknowledge-unsandboxed-claude-builder`, and the choice is recorded in the task state and the
  decision record as `builder_sandboxed: false`.
- Adding dependency manifests and test harness files to the protected paths raises the cost of the
  escape; it does not close it. **Do not run the Claude builder unattended** until it executes
  inside an external OS or container sandbox with networking disabled. Expanding protected paths
  alone is insufficient, and this document must not be read as claiming otherwise.

The **Claude reviewer** lane is genuinely read-only in effect: no `Write` or `Edit`, and only
read-only Git subcommands. (`git diff --output=` is a theoretical write; the Codex reviewer's OS
sandbox covers the same role without that gap.)

## Known limits

- **No token or monetary cap.** Neither CLI exposes a spend limit the coordinator can enforce. The
  only caps are rounds (default 6), minutes per model turn (default 45) and minutes per task
  (default 180). `agent:doctor` prints this reminder.
- **The loop certifies only what the gates cover.** Worktrees carry no `.env`, so neither agent can
  run the product against live services. This project's own history is that three serious defects
  (address listings overwriting one another, comparable sales fetched and discarded, a production
  CORS failure) passed a fully green test suite and were found only by running the product end to
  end. An accepted candidate is _tested_, not _verified live_; the release gate in
  `docs/AGENT_HANDOFF.md` remains a human step.
- **Python formatting and lint** are enforced by the `python format` and `python lint` gates
  because coordinator commits use `--no-verify` and therefore skip the repository's lint-staged
  hook. The gates and the hook check the same tools; the gates run on the whole tree.

## Readiness

The loop is considered operational only once the end-to-end suite
(`scripts/agent-loop/test/e2e.test.mjs`) passes: it drives the real coordinator through
init → build → candidate commit → gates → review → promotion, plus the rejection, approval,
blocked-approval, refused-Claude-builder, partial-init and invalid-citation paths, against a
disposable repository with fake agents. Unit tests of the policy and claim modules alone do not
establish readiness, and were the only evidence before this suite existed.

A real first task should still be harmless and observed: bootstrap and gate timings on this
machine are not exercised by the fixture (its bootstrap is empty and its gate is trivial).

No prompt is a security boundary. The driver therefore combines tool restrictions, filesystem
separation, path policy, OS-sandboxed Codex execution, deterministic gates, and human-owned
promotion — and states plainly where one lane falls short of that.

If a CLI version changes its permission semantics, `agent:doctor` must fail or the invocation must
be reviewed before unattended use resumes.
