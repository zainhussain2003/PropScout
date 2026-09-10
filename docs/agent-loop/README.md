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

`agent:doctor` verifies Git, Node, Python, npm, Claude Code, Codex, configuration, and schemas. It
does not create worktrees or call either model.

## Start a feature

Task names are lowercase slugs. Quote the owner request so it is stored exactly.

```powershell
npm.cmd run agent:init -- --task improve-rental-comps --builder claude --request "Improve rental comparable selection without changing production data"
npm.cmd run agent:run -- --task improve-rental-comps
```

Use `--builder codex` when Codex should own the implementation and Claude should review it.

Initialization freezes the current `HEAD` as the baseline and creates three sibling worktrees. It
does not copy uncommitted changes from the owner's checkout. Commit or deliberately exclude local
work before initializing a task.

## What a run does

1. Acquire an exclusive task lock.
2. Verify the builder lane is clean and still belongs to its assigned branch.
3. Invoke the builder with write access limited to its worktree and no authority to commit, push,
   deploy, migrate, or access production.
4. Reject protected or generated-path edits.
5. Stage only the paths reported by Git and create a reversible candidate commit.
6. Run every configured PropScout gate.
7. Invoke the other model read-only against the exact candidate commit.
8. Validate the structured review and its citations.
9. On requested changes, feed the precise review back to the same builder for another bounded
   round.
10. On acceptance, generate canonical claim records and `CLAIMS.md`, commit the metadata, and
    fast-forward the coordinator worktree.

The loop stops after six rounds or three hours by default. Change those values only through a
human-reviewed edit to `.agent-loop/config.json`.

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

## Safety boundary

This system improves review coverage; it does not make either model an authority over product
intent. See [POLICY.md](POLICY.md) for mandatory human gates and threat boundaries.
