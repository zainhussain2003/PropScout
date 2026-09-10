# Review — `README.md` (the audit's own index)

**Verdict: a good index. The severity rubric and evidence-state vocabulary are
well designed. Its "highest-priority findings" list is accurate. Three problems:
one wrong number, an evidence vocabulary that is never used, and a "what is
strong" section that is slightly too generous in two places.**

## What it gets right

**The severity rubric is well constructed** — particularly P0, which is defined
by _consequence_ rather than by component:

> Can expose or corrupt another user's data, assert a materially false fact, or
> make the product unsafe to launch.

Defining P0 to include "assert a materially false fact" is what correctly makes
the fabricated account page a P0 rather than a cosmetic placeholder issue. That
is the right call and it follows from the rubric rather than from taste.

**The audit-boundary statement is unambiguous** and matches what I verified: no
application code, calculation constants, schemas, infrastructure or production
data were changed; `docs/product-audit/*.md` are the only intended changes.
`git status` confirms the working tree contains only documentation additions.

**The framing paragraph is exactly right:**

> It proposes remedies but does not authorize or implement them. No
> recommendation should be treated as a settled product decision until the owner
> approves it and the decision is recorded in `docs/DECISIONS.md`.

That should survive into whatever plan is approved. It is the sentence that keeps
an agent from deciding product strategy through code.

**The eight highest-priority findings are accurate.** I verified all eight
independently — see [the review index](./README.md#verification-summary). None
overstated, and the two P0s are correctly identified as the two P0s.

## Problems

### 1. The line count is wrong

The completion message accompanying this audit reports "17 Markdown documents and
1,553 lines". `wc -l` on the folder gives **2,128** lines across 17 files
(1,278 of which are the twelve newly written documents; 850 are the five
pre-existing documents that were moved in).

Minor in isolation. Not minor in context: this is an audit whose central
complaint is that the product states unverified numbers as facts. Its own summary
figure should be reproducible.

### 2. The evidence vocabulary is defined and then never used

The index defines three states:

> Evidence states are **confirmed** (directly observed in code/data), **inferred**
> (strong implication requiring runtime verification), and **unknown** (the
> product lacks the evidence required to answer).

That is a genuinely useful distinction — and **not one finding in any of the
sixteen documents carries the label**. The consequence is real: static inferences
read in the same voice as verified facts. The clearest instance is the landlord
fixture leak (L-02), stated as "uses a hard-coded Toronto comp fixture even when
passed a real analysis"; I found that live data cannot currently reach that
component at all, so the finding is `inferred` about a latent risk, not
`confirmed` about a live defect.

Either apply the vocabulary or drop it. Applied, it would have caught that
overstatement.

### 3. Two items in "What is strong today" are too generous

Most of the section is fair. Two need qualification:

**"The investment finance implementation uses Canadian semi-annual mortgage
compounding and has been independently reproduced to the dollar in the investor
research."** True of the _mortgage and hold-case_ math — I reproduced all twelve
IRR rows plus the payment and year-one principal exactly. But the **expense
presentation** does not reconcile: the audit's own investor report figures show
annual operating expenses of $22,020.50 against an NOI of $7,139.50 on $27,000
gross rent, a $2,160 contradiction equal to the 8% management fee (see
[R-01](./README.md#r-01--the-expense-breakdown-does-not-reconcile-with-noi-new)).
"Reproduced to the dollar" is true of one layer and not the other, and the
sentence does not distinguish them.

**"The repository has a large unit/integration baseline: 939 web, 232 API, 397
calculation-engine and 180 scraper tests at the last verified run."** The web,
API and scraper figures are consistent with what I have seen. I could not
reproduce **397 passing / 2 skipped** for the calculation engine; my own run gave
376 before the golden-dataset expansion. Probably a later count — but "at the
last verified run" is doing a lot of work without a date or command. The testing
document's own advice ("keep test counts dated and generated where possible")
should apply here first.

Both are small. They matter because this section is what a reader trusts when
deciding what _not_ to re-verify.

## Gaps

1. **No commit SHA.** The branch is named; the tree is not. The branch moved from
   12 to 19 commits during the audit window per the handoff, so "branch
   inspected" does not identify what was inspected.
2. **No finding count or severity distribution.** A reader cannot tell from the
   index whether the audit found 40 issues or 140, or how many are P0/P1/P2/P3.
   A one-line tally per severity would make triage possible before opening
   sixteen documents.
3. **No reading path for the two obvious audiences.** The document table is
   alphabetical-ish by topic. An owner deciding what to fund and an agent
   deciding what to build need different entry points — the owner wants
   `MASTER_ROADMAP` §"recommended decision sequence" and the P0s; the agent wants
   the API, account and journey documents. Saying so would save both.
4. **"Highest-priority findings" lists eight items but the severity rubric has
   four levels.** Items 1–2 are P0, 3–8 are P1. Labelling each inline (as the
   entries partly do) would make the list scannable as a triage queue rather than
   prose.

## Bottom line

A well-designed index with a good rubric and an honest boundary statement. Three
fixes: correct the line count to 2,128, either apply the
confirmed/inferred/unknown vocabulary to every finding or remove it, and qualify
the two over-generous items in "what is strong" — the finance reproduction claim
covers the mortgage math but not the expense presentation, and the 397 test count
is unreproducible without a date and command.
