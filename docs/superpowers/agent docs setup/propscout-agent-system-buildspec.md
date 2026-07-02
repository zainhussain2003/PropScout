# PropScout Agent System — Build Spec

Hand this whole file to Claude Code, running inside the PropScout repo. It scaffolds a
13-agent autonomous loop on the Claude Agent SDK. Build it **incrementally and gated** —
do not wire the loop to production on day one. Read the whole spec before writing code,
then build in the phases at the bottom. Stop and ask me at each phase boundary.

---

## 0. What this system is

An autonomous build/test/review loop for PropScout. An orchestrator assigns work, a
builder ships it, three testers verify it, a reviewer adversarially checks it, and the
loop re-queues itself — **without me copy-pasting between a terminal and a reviewer.**
The one thing that stops the loop is a categorical escalation gate: any irreversible or
high-blast-radius action pauses and pings me on Telegram for approval before proceeding.

The whole point is to preserve the human gate that has caught every real bug in this
project so far, while removing the manual copy-paste. Autonomy is for read-only and
reversible work. Side effects are always mine to approve.

---

## 1. Non-negotiable safety rails — build these FIRST, before any agent does real work

These are not features. They are the reason an autonomous loop that writes to prod is
safe instead of a footgun. If any of these is not working, the loop does not touch prod.

### 1a. Categorical escalation gate (the core control)

The loop MUST pause and request my approval — via Telegram — before ANY action in these
categories, regardless of how small or routine the action looks. Escalation is by
**action category, never by the agent's judgment of importance**, because in this project
the most damaging issues looked routine at the time (a stale selector, a city slug
ignored, an alarm that summed across cities and hid 6 blocked ones). Self-judged
"is this big enough" will leak exactly those. Categories:

- Any irreversible or hard-to-reverse action: schema migration / DDL, production write
  beyond a routine idempotent upsert, deploy, deleting data, changing the city or source
  list, anything touching credentials, secrets, or access controls (RLS, service-role key).
- Any change whose blast radius spans multiple app segments.
- Any ambiguous result where the safe and unsafe readings imply DIFFERENT irreversible
  actions.
- Any unresolved disagreement between the Builder and the Reviewer.

Implement the gate as a **hard interrupt in the orchestration layer + tool restriction**,
NOT as an agent that asks nicely. A confident Builder agent must not be able to talk a
gatekeeper agent into waving something through — the same way a confident report could
talk a person into it. The gate is code. The agents that lack write/deploy tools
physically cannot perform gated actions; the agents that have them route every
side-effecting call through an approval checkpoint that blocks on my Telegram reply.

### 1b. Budget + iteration cap + kill switch

- Per-run hard caps: max loop iterations and a token/cost ceiling. Hitting either pauses
  the loop and pings me (this is also why Opus tends to over-spawn subagents — cap it).
- A kill switch I can trigger that halts the loop cleanly between iterations without
  corrupting state.

### 1c. Agent-level audit log

The Agent SDK / Claude Code has no native trace view or per-agent cost breakdown. For an
unattended prod-writer that is the same "breaks while you're asleep" gap one level up. So
the orchestrator MUST append every agent action, tool call, decision, and gate event to a
human-readable log file I can read in the morning. Heimdall (below) owns this.

### 1d. Side-effect tools live only where they are gated

Reviewer, researcher, and security agents get **read-only** tool sets, enforced in config.
Builder/data/migration agents get write/bash, but every prod-touching path passes the gate
in 1a. Tool restriction is what makes a role real, not a suggestion.

---

## 2. Notification channels

- **Telegram** — agent escalation / approval, and budget-cap / kill-switch / failure
  pings. Time-sensitive ("the loop is paused waiting on you"). Reads `TELEGRAM_BOT_TOKEN`
  and `TELEGRAM_CHAT_ID` from env. The approval message must state: what action is
  requested, which category triggered escalation, and what the agent will do on approve
  vs reject. The loop blocks until I reply.
- **Resend email** — the existing PropScout nightly scraper yield alarm only. NOT for
  agent approvals. Reads `RESEND_API_KEY` from env. Leave this path as it is.

Keep the two visually and functionally distinct so "a scraper found a blocked city"
(email, not urgent) never gets confused with "an agent needs my go before it migrates
prod" (Telegram, urgent).

---

## 3. The roster — 13 agents

Each agent is its own definition with its own system prompt and its own tool set. Identity
comes from a clear, keyword-rich description (the SDK/Claude Code routes on description, and
that routing is imperfect — so make descriptions precise and prefer explicit invocation in
the orchestration code over relying on auto-routing). Group by responsibility; do not split
finer than a genuinely distinct responsibility with non-overlapping tools.

### Orchestration

- **Nick Fury** — orchestrator. Owns the queue, the loop, the budget/iteration cap, the
  kill switch, the escalation interrupt, and triggers the audit log. The only agent that
  spawns others.

### Build (lead: Iron Man)

- **Iron Man** — build lead. Coordinates the build specialists; writes general code.
- **Spider-Man** — scraper & selector specialist. Per-source scraping, selector rewrites
  against live markup. Anchors on stable/semantic signals, not hashed CSS classes.
- **Vision** — data-layer specialist. Insert/upsert/dedup/query code (the PostgREST write
  paths). Knows: upsert on source_url, dedup whole-run before geocode, no null conflict keys.
- **Doctor Strange** — migration specialist. Schema/DDL only. EVERY migration is
  escalate-category (irreversible) — Strange writes and verifies migrations but they are
  applied by me, never by the loop. Knows: gate the migration on a duplicate check before
  adding a unique constraint; wrap alter + backfill in one transaction.

### Test

- **The Flash** — unit-test specialist. Writes and runs the code suite. Fast.
- **Cyborg** — Supabase integration-test specialist. Tests DB behavior against a test
  path (NEVER prod): constraints hold, upsert-not-append, dedup keys correctly, migrations
  apply. Also owns data-integrity checks (ghost/stale comp rows) — do not split these out.
- **Hawkeye** — UI / end-to-end test specialist. Drives the frontend (investor / buyer /
  landlord modes, reports) through real flows via browser automation; catches broken
  elements and visual regressions a data assertion would miss. Reuses the project's
  Playwright. Sharp-eyed for the defect everything else passes over.

### Verify / Research / Secure

- **Batman** — adversarial reviewer. READ-ONLY (enforced). Catches overclaims, demands
  measurement before scaling, refuses scope creep, applies the unattended-run lens, emits
  the next scoped instruction. Use the provided `batman-reviewer.md` system prompt verbatim.
- **Oracle** — research & no-write probe specialist. Read-only + web. Marginal-yield
  measurement, doc/fact checks, recurrence measurement. Feeds Iron Man before a build.
- **Black Widow** — security & access review. READ-ONLY. Checks Supabase RLS (a landlord
  must not read another user's data), service-role-key handling (must never reach the
  client), auth flows, secrets in code. Distinct lens from Batman's code review.

### Observe / Notify / Gate

- **Heimdall** — observability. Owns the audit log; watches the loop and the scraper's own
  alarms; the source of truth for "what did the system do."
- **Jarvis** — notification channel handler. Sends Telegram approval requests and blocks
  the loop on my reply; sends failure/cap pings. Owns the Telegram integration.
- **Captain America** — the gate POLICY. NOT a chatty agent. The code-enforced interrupt
  from 1a, expressed as orchestration logic + tool permissions. Represented as a policy
  module, not a persona that can be argued with.

---

## 4. The loop

1. **Fury** pulls the next task from the queue.
2. **Oracle** runs any needed no-write probe/measurement and reports numbers to **Iron Man**.
3. **Iron Man** builds (delegating to Spider-Man / Vision / Doctor Strange as the task fits).
4. **Flash**, **Cyborg**, **Hawkeye** run their tests; **Black Widow** runs on anything
   touching auth/data-access.
5. **Batman** reviews read-only, verifies the _proof_ not the summary, and produces a
   VERDICT + ESCALATE? + NEXT INSTRUCTION.
6. Decision: is the next action escalate-category (per 1a)?
   - **No** → Batman's NEXT INSTRUCTION re-queues to Fury. Loop continues autonomously.
   - **Yes** → **Cap** (gate) hard-pauses, **Jarvis** pings me on Telegram, loop blocks
     until I approve/reject, then re-queues to Fury.
7. **Heimdall** logs every step throughout. Budget cap / kill switch can pause at any
   iteration boundary.

---

## 5. Build phases — stop and ask me at each boundary

**Phase 1 — rails only, no agents doing real work.** Build 1a–1d: the escalation gate, the
budget cap + kill switch, the audit log, the Telegram (Jarvis) approval round-trip. Prove
the gate blocks and the Telegram approve/reject round-trip works using a dummy
"escalate-category" action. Nothing touches prod. STOP.

**Phase 2 — read-only agents.** Add Oracle, Batman, Black Widow, Heimdall. Run the loop on
read-only and reporting tasks only (probes, reviews, audits). No writes, no migrations.
Prove the loop runs, re-queues, logs, and escalates correctly on a simulated side effect.
STOP.

**Phase 3 — reversible writes, gated.** Add Iron Man, Spider-Man, Vision, Flash, Cyborg,
Hawkeye. Allow code changes and test runs. Any DB write / migration / deploy still hits the
gate and waits on me. Prove a real gated action pauses and waits. STOP.

**Phase 4 — earn prod.** Only after Phases 1–3 hold on real work do we let the loop
propose prod-touching actions — still gated, still mine to approve. The loop never gains
the ability to perform an escalate-category action unattended. It earns the right to
_propose_ them smoothly; it never earns the right to _skip the gate_.

---

## 6. Build order within a phase

Generate each agent's system prompt first (describe role, tools, constraints), then wire
the orchestration. Restrict tools per role from the start — do not build with all tools and
lock down later. Keep each agent's prompt focused; the SDK gives each its own context
window, so put role-specific knowledge in the agent, not in a shared mega-prompt.

Report at each phase boundary: what's built, what's proven (with the specific test that
proves it), and what the next phase will touch. Do not advance phases without my go.
