# Claude + Codex collaboration for PropScout

This directory defines a controlled feature loop in which Claude Code and Codex collaborate on the
same task without sharing a writable checkout.

## The topology

```text
PropScout (the owner's checkout; never used as an agent scratch lane)
    |
    +-- coordinator worktree   agent/<task>/coordinator
    +-- Claude worktree        agent/<task>/claude
    +-- Codex worktree         agent/<task>/codex

external runtime mailbox (not Git-tracked and not writable by either agent)
    +-- state.json
    +-- lock
    +-- prompts and model output
    +-- gate logs
    +-- disputed review records
```

Only the selected builder lane is writable. The other model reviews the exact candidate SHA in
read-only mode. The Node coordinator owns state, explicit-path staging, commits, claim generation,
and fast-forward promotion.

## Install and verify

Both CLIs must already be authenticated.

```powershell
npm.cmd run agent:doctor
npm.cmd run agent:test
npm.cmd run agent:lint-claims
```

`agent:doctor` verifies Git, Node, npm, Python, Black, Flake8, Claude Code, Codex, configuration,
and schemas, and warns if a test-only environment override is set. It does not create worktrees or
call either model.

On Windows the coordinator never launches a command through a shell. npm-installed CLIs such as
`codex` are `.cmd` shims, which `spawnSync` cannot execute directly, so `process.mjs` reads the
shim and runs its `.js` entry with the current Node binary instead. If `agent:doctor` reports
`FAIL codex` while `codex --version` works in a terminal, the shim format has changed and
`resolveShim` needs updating.

## Start a feature

Task names are lowercase slugs. Quote the owner request so it is stored exactly.

```powershell
npm.cmd run agent:init -- --task improve-rental-comps --request "Improve rental comparable selection without changing production data"
npm.cmd run agent:run -- --task improve-rental-comps
```

**Codex is the default builder** and Claude reviews. Codex's builder lane runs inside an OS-level,
network-constrained sandbox; Claude's does not (see [POLICY.md](POLICY.md)). To run Claude as
the builder you must pass `--builder claude --acknowledge-unsandboxed-claude-builder`, and the
choice is recorded in the task state. Do not do this unattended.

Initialization freezes the current `HEAD` as the baseline and creates three sibling worktrees. It
does not copy uncommitted changes from the owner's checkout. Commit or deliberately exclude local
work before initializing a task. If any lane fails to create, the lanes already created are
removed and no task state is written.

### Dependency bootstrap

A fresh worktree has no `node_modules`, no virtual environment and no installed Python packages —
every gate would fail before the builder changed a line. The first `agent:run` therefore
bootstraps the builder lane using the steps in `.agent-loop/config.json` → `bootstrap.steps`:

1. `npm ci` (both workspaces, via the root lockfile)
2. `python -m venv .venv`
3. `pip install -r services/calc-engine/requirements.txt` — into the venv
4. `pip install -r services/scrapers/requirements.txt` — into the venv
5. `pip install black flake8` — into the venv

Any later step or gate that names `python` runs the venv interpreter. Both `node_modules/` and
`.venv/` are gitignored, so the lane stays clean. Bootstrap runs once per task, is recorded in the
task state, and its logs live under the runtime directory in `bootstrap/`. Expect several minutes
the first time on a machine without a warm npm cache.

## What a run does

1. Acquire an exclusive task lock (also held by `approve` and `reject`).
2. Bootstrap the builder lane's dependencies if not already done.
3. Verify the builder lane is clean and still belongs to its assigned branch, and that the task
   deadline has not passed.
4. Invoke the builder with write access limited to its worktree and no authority to commit, push,
   deploy, migrate, or access production. Its turn is capped at `turnMinutes` or the time left.
5. Reject protected or generated-path edits.
6. Stage only the paths reported by Git and create a reversible candidate commit.
7. Run every configured PropScout gate, each cut off at the task deadline. A failing gate's log
   holds the command's stdout and stderr.
8. Invoke the other model read-only against the exact candidate commit.
9. Validate the review against the JSON schema (unknown fields are rejected) and resolve every
   citation at the candidate SHA. A citation that does not resolve fails the round as
   `review_invalid` — it is never fed back to the builder.
10. On requested changes, feed the precise review back to the same builder for another bounded
    round.
11. On acceptance, generate canonical claim records and `CLAIMS.md`, commit the metadata, and
    fast-forward the coordinator worktree.

The loop stops after six rounds, forty-five minutes per model turn, or three hours per task by
default. The task cap is hard. Change those values only through a human-reviewed edit to
`.agent-loop/config.json`. There is no token or monetary cap; see [POLICY.md](POLICY.md).

## Inspect progress

```powershell
npm.cmd run agent:status -- --task improve-rental-comps
```

The status output includes baseline, candidate SHA, round, phase, gate results, review verdict,
worktree paths, and any human-gate reasons. Runtime logs live beside the repository under
`.propscout-agent-runtime/<task>/`; they are deliberately outside every agent worktree.

When a task reaches `human_required`, inspect the candidate, reasons, and review. Record the owner
decision explicitly:

```powershell
npm.cmd run agent:approve -- --task improve-rental-comps --note "Approved because the proposed migration is additive and will be applied separately after staging verification"
npm.cmd run agent:reject -- --task improve-rental-comps --note "Rejected because the product behaviour conflicts with D-029"
```

Approval cannot override an unresolved P0/P1 finding and still does not apply a migration, deploy,
push, or merge into the owner's branch.

## Continue after requested changes

`agent:run` automatically performs bounded revision rounds. If the process itself is interrupted,
run the same command again. Candidate commits remain isolated on the builder branch and the runtime
state records the next safe operation.

## Completion and use of the result

Accepted code ends on `agent/<task>/coordinator` in the coordinator worktree. It is not merged into
the owner's feature branch and is never deployed automatically. Review the result there, then merge
or cherry-pick it through the project's normal pull-request workflow.

No cleanup command is supplied intentionally. Worktrees and branches contain review evidence and
are removed manually only after the owner confirms the work is merged or no longer needed.

## Canonical findings

Committed findings live in `docs/agent-loop/claims/*.json`; Markdown is generated from them. Never
hand-edit `CLAIMS.md`. A confirmed claim must cite a file and line range that exists at its
`subject_sha`. Inferred P0/P1 claims also require a recorded runtime check.

## Verifying the loop itself

```powershell
npm.cmd run agent:test
```

This runs the unit suites and `test/e2e.test.mjs`, which drives the real coordinator against a
disposable repository with fake agents through acceptance, rejection, approval, blocked approval,
the refused Claude builder, partial-init cleanup, invalid citations and a failing gate. The loop
is not considered ready unless this passes.

Two environment variables exist only for that test and must never be set for a real run.
`agent:doctor` warns when either is present:

- `AGENT_LOOP_REPO` — operate on a different repository.
- `AGENT_LOOP_FAKE_AGENTS` — replace both CLIs with `builder.mjs` / `reviewer.mjs` from a directory.

## Safety boundary

This system improves review coverage; it does not make either model an authority over product
intent. See [POLICY.md](POLICY.md) for mandatory human gates, the difference between the Codex and
Claude builder lanes, and what the loop cannot certify.
