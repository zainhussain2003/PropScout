# Agent handoff — PropScout

Written 2026-09-06. Give this to whichever agent picks the project up next.
It is the state of play, the rules, the traps, and the work queue.

---

## 1. What this is

PropScout underwrites Canadian residential real estate. You paste a Realtor.ca
link **or type an address**, say who you are (investor / personal buyer / tenant
/ landlord), and get a report that makes a call — a 0–100 deal score, a verdict,
and the numbers behind it, built for Canadian rules (semi-annual compounding,
Ontario land transfer tax, OSFI stress test, CMHC).

**The product's whole claim is that it will tell you not to buy.** That single
sentence governs every judgement below.

## 2. Read these first, in this order

| File                              | Why                                                                 |
| --------------------------------- | ------------------------------------------------------------------- |
| `CLAUDE.md` (repo root)           | Coding standards, testing rules, project structure. Canonical.      |
| `docs/DECISIONS.md`               | 36 decisions (D-001…D-036) with the alternatives rejected.          |
| `docs/propscout_platform_spec.md` | Formulas, features, data model. Source of truth for behaviour.      |
| `docs/MVP_TODO.md`                | 243 done, 77 open. Some entries are stale — verify before trusting. |
| `docs/ACCESS_SETUP.md`            | Everything only the account owner can do.                           |

## 3. Where things stand

- **Branch:** `feat/address-input-and-mobile`, 12 commits ahead of `master`.
  Open PR **#21**. Everything is pushed.
- **Production:** `propscout.ca` is live on Vercel but runs `master` — none of
  the last 12 commits are deployed.
- **Supabase project:** `dvlmkecrpoelqlzhwebg` ("PropScout"). One project serves
  both local dev and production. There is no staging database.
- **Local stack:** web `:5173`, API `:3001`, calc engine `:8000`.
- **`.env`** has 24 keys and is gitignored. `REPLIERS_SAMPLE_MODE=true`.

### Test gates — all currently green

```
npm test --workspace=apps/web        # 899 passed, 72 files
npm test --workspace=apps/api        # 222 passed, 2 skipped
python -m pytest services/calc-engine/ -q   # 376 passed
python -m pytest services/scrapers/ -q      # 180 passed
npm run typecheck --workspace=apps/web
npm run typecheck --workspace=apps/api
```

### Data actually in the database

| Table                 | Rows   | Notes                                                    |
| --------------------- | ------ | -------------------------------------------------------- |
| `rental_listings`     | 7,285  | 309 FSAs, all within 90 days. Nightly scrape works.      |
| `listings`            | 25     | 22 have real descriptions — the only real prose we have. |
| `schools`             | loaded | Real EQAO from the Ontario Ministry SIF backbone.        |
| `neighbourhood_stats` | loaded | StatsCan income + 5-year population growth.              |
| `comparable_sales`    | —      | Does not exist yet. See the blocker below.               |

## 4. The one external blocker

**Comparable sales are Tacoma, Washington.** The Repliers API key is a free
sample key whose data covers a US sample area. `REPLIERS_SAMPLE_MODE=true` makes
the service query those sample coordinates so the pipeline can be exercised
end to end, and the report labels them honestly: _"Real sales from the
provider's sample coverage area — not this neighbourhood."_

The owner is buying a Repliers plan covering **TRREB/Ontario**. When that lands:

1. Set `REPLIERS_SAMPLE_MODE=false`.
2. Add the licence attribution string the plan requires — most MLS feeds mandate
   it and shipping without it is a contract breach (`MVP_TODO.md:425`).
3. Turn on §02 Fair market value on the personal buyer report. It is currently
   an honest empty state **on purpose** — deriving an FMV band for a Vaughan
   condo from Tacoma sales would be confidently wrong (D-029).
4. Add a regression case with known comps.

**Do not fake this to unblock yourself.** Do not generate plausible Ontario
sales, do not rewrite the sample addresses to GTA ones. That request was made
and refused earlier this project, and the refusal was right: a report that
invents a comparable sale is worse than one that says it has none.

## 5. Rules that are not negotiable

These come from `CLAUDE.md` and from mistakes already made here.

1. **Never fabricate data.** No placeholder that looks like content. A real bug
   fixed this session: reports rendered four photo frames and a "+ 18 more"
   badge for listings with **zero** photos (D-034). Another: the report claimed
   "pre-1980 build" whenever the build year was unknown (D-030). If a number is
   not known, render an em dash and say why.
2. **Every feature needs four tests** — unit, functionality, sanity bounds,
   regression. See `CLAUDE.md` §12.
3. **Golden dataset ≥95%, calculation regression 100%**, before any merge.
4. **No hardcoded colours, spacing, or radii.** Everything from
   `apps/web/src/styles/tokens.css`. No emoji in the UI, ever.
5. **No business logic in components.** Services in `apps/api/src/services/`,
   `apps/web/src/lib/`, `services/calc-engine/services/`.
6. **Schema changes go through `supabase/migrations/`**, never the dashboard.
7. **Record every judgement call in `docs/DECISIONS.md`** with the alternatives
   you rejected and why. This is the most useful document in the repo.
8. **Ontario only.** Postal codes K, L, M, N, P. Non-Ontario hits the waitlist
   gate, it does not error.

## 6. Traps that will cost you hours

Every one of these was hit here.

- **`npx vitest` from the repo root uses the wrong config** and reports ~747
  bogus failures ("React is not defined"). Always
  `npm test --workspace=apps/web`.
- **`git restore "Week3-4 Front end"` after a test run.** Vitest rewrites those
  snapshot files with different line endings, so they show as modified with
  _empty_ diffs. Check `git diff --stat` before restoring — sometimes they are
  CRLF churn, sometimes they are real snapshot updates you must commit.
- **Vite's HMR breaks after Prettier rewrites a file mid-session**, giving a
  blank page and a misleading `does not provide an export named 'X'`. Clear
  `apps/web/node_modules/.vite` and restart the dev server.
- **Background processes on Windows can zombie a port.** A stale process held
  `:3001` for hours and answered every request, so code changes appeared to do
  nothing. Check `netstat -ano | grep :3001` and kill by PID.
- **`window.innerWidth` is not the viewport.** It reports the _overflowing_
  width, so a layout check based on it feeds on its own output (D-035). Use CSS
  media queries; use `matchMedia` only where JS genuinely needs the breakpoint.
- **jsdom has no `matchMedia`.** `apps/web/src/test-setup.ts` polyfills it.
- **The pre-commit hook runs eslint/prettier/black/flake8** on staged files and
  fails the commit on a single warning. Do not `git add -A` — it will sweep in
  `services/agents/`, whose files the workspace lint config cannot resolve.

## 7. Work queue

Ordered by value. Numbers 1–3 are the ones that matter most.

### 1. Give the report its own visual identity (highest value, not started)

The report is what people pay for and it currently looks like a competent
analytics dashboard, not a document with a point of view. The owner's words:
_"modern and appealing to use"_, explicitly **not** cinematic.

Foundation is already in (D-036): a three-level elevation scale, motion tokens
(`--ease`, `--dur-fast`, `--dur`, `--dur-slow`), softer radii, and a
`ReportSectionRail` that maps the document in the left margin.

The obvious next target is the **score card in the report hero** — nine rows of
small grey text around a gauge that is underplayed for what is meant to be the
product's signature element. Make the verdict the hero: confident scale on the
score, the verdict as a real headline, the breakdown as weighted bars rather
than hairlines.

Constraints: keep the PR10 palette (it is contrast-checked — see the divergence
table in `DESIGN_README.md`), keep Instrument Serif / Geist / Geist Mono in
their assigned roles, no emoji, tokens only.

### 2. Grow the golden dataset with real listing descriptions

`golden_cases.json` has 58 cases and 85 assertions and passes at 100%, with
every flag covered both positively and negatively. **But 51 of those cases are
synthetic** — written to read like listings, and labelled as such.

Measured on the 22 **real** descriptions in the `listings` table, recall is
**10/22** (D-033). That number is the honest one. Real prose says "Fully
Renovated", "Professionally renovated in May 2025", "Maintenance Fees Include
Hydro" — variants the rules originally missed entirely.

Do this: run the scraper to collect real Ontario descriptions at volume, label
them by what a careful human would conclude, add them as cases, and widen the
patterns against what you find. **Always re-check the synthetic set stays at
100%** — that is what proves a wider pattern has not started over-matching.

The extraction pipeline's **Claude Haiku layer is still unimplemented**; only
the regex tier runs. That is the larger half of §19.

### 3. Deploy this branch

`propscout.ca` runs `master` and is 12 commits behind. Merging #21 ships
address entry, real SunScout obstruction, the comps radius fallback, the
extraction fixes, and the UI work.

Before merging, confirm **`VITE_API_URL` is set for Vercel Preview and
Production**. It defaults to `http://localhost:3001`, so a deployed page with
that unset renders the UI but cannot run a report. This was never verified.

### 4. Smaller, well-defined

- **~10px of horizontal overflow at 375px** remains, from `StickyActionBar`.
- **Nightly scraper cron on Railway** — `railway.json` is written, never
  deployed or confirmed running. The data is fresh, so something is running;
  verify what.
- **415 `rental_listings` rows have no postal code** (~6%) and can never serve
  comps, which key on FSA. `services/agents/sandbox/geocode_refresh/` looks like
  an earlier attempt at exactly this.
- **13 HTML prototypes in `docs/design_handoff_propscout_mvp/`** still carry the
  retired terracotta palette. `DESIGN_README.md` states `tokens.css` supersedes
  them. Either resync or mark them clearly as historical.
- **Zillow scraper** is blocked on Cloudflare and already deferred to
  `FUTURE.md`. Leave it.

## 8. How to verify your work

Run all six gates in §3. Then exercise the real thing — mocks hid three
significant bugs this session that only an end-to-end run caught:

```bash
# 1. geocode
curl -s -X POST http://localhost:3001/address \
  -H "Content-Type: application/json" \
  -d '{"address":"5 Buttermill Ave, Vaughan"}'

# 2. create the listing + analysis (use the coords from step 1)
curl -s -X POST http://localhost:3001/address/start \
  -H "Content-Type: application/json" \
  -d '{"address":"5702 - 5 Buttermill Avenue, Vaughan, Ontario L4K 3X4, Canada",
       "postalCode":"L4K3X4","city":"Vaughan","lat":43.796869,"lng":-79.529349,
       "listingType":"for-sale","price":729900,"beds":3,"baths":2,"sqft":900,
       "condoFeeMonthly":761,"annualTaxes":3326}'

# 3. run it — repeat with mode personal / tenant / landlord
curl -s -X POST http://localhost:3001/analysis \
  -H "Content-Type: application/json" \
  -d '{"token":"<token from step 2>","mode":"investor"}'
```

Then open `http://localhost:5173/r/<token>` and read it as a user would — at
1280px **and** at 375px.

**Known-good reference:** that Vaughan condo scores **8 / hard pass**, cash flow
about **−$2,724/mo**, cap rate 0.81%, with 30 rental comps found within 5km. If
you get a materially better score for it, something has broken in a direction
that flatters bad deals — which is the failure mode this product exists to
prevent.
