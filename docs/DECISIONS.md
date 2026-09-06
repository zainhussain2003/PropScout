# Decision log

Running record of judgement calls made while working on PropScout, with the
alternatives that were considered and rejected. The point is reversibility: if a
decision turns out wrong, the alternative is written down next to it, so nobody
has to reconstruct the reasoning from a diff.

Newest first. One entry per decision. Each entry says what was chosen, why, what
else was on the table, and what would make us revisit.

---

## 2026-09-05 · Session: local dev fixes + pitch-readiness pass

Context: returning to the project after ~2 months idle. Ran the app locally with
a real Realtor.ca listing (`229 - 701 Sheppard Ave W`, $498,000) end to end and
fixed what that surfaced.

---

### D-001 · `SCRAPER_URL` falls back to `CALC_ENGINE_URL`, not port 8001

**Chosen.** `apps/api/src/routes/scrape.ts` now resolves
`process.env.SCRAPER_URL ?? process.env.CALC_ENGINE_URL ?? 'http://localhost:8000'`.

**Why.** Local dev was broken out of the box: every analysis returned
`503 SCRAPER_UNAVAILABLE`. The default pointed at `http://localhost:8001`, the
standalone `services/scrapers/main.py` app, which nothing starts and which is not
deployed. Production already routes `/scrape` through the calc engine — commit
`b8d12ce`, _"wire production /scrape via the calc-engine (Path A)"_ — and on
Railway both `SCRAPER_URL` and `CALC_ENGINE_URL` point at the same service. The
default was left behind on the old Path-B topology. Now local matches production
with the two documented processes running.

**Alternatives considered**

| Option                                                                    | Why not                                                                                                                                                               |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add `SCRAPER_URL=http://localhost:8001` to `.env` and run a third process | Makes local dev diverge from production topology and adds a process to every dev's startup for no benefit. `.env` is untracked, so the next person hits the same 503. |
| Add `SCRAPER_URL` to `.env.example` only                                  | Documents the trap instead of removing it. Anyone who copies an older `.env` still breaks.                                                                            |
| Delete `services/scrapers/main.py` and commit to Path A                   | Too destructive for this pass. The standalone service is a working fallback if the calc engine is ever split out again. Kept, and the env var still overrides.        |

**Revisit if** the scraper is deliberately split back into its own deployed
service. Then set `SCRAPER_URL` explicitly per environment and the fallback stops
mattering.

---

### D-002 · The hero URL field starts empty

**Chosen.** `useState('')` instead of `useState(SAMPLE_LISTINGS[0].url)`.

**Why.** The primary input arrived pre-filled with a real, submittable sample URL.
It was a value, not a placeholder — so a first-time visitor saw a filled field and
could not tell whether it was theirs. Clicking in and typing appended to the
existing URL and produced a garbled link. The "Try one of ours →" buttons directly
below already load a sample deliberately, which is the honest version of the same
affordance.

This matters most for the least confident users, who are least likely to think
"clear this field first."

**Alternatives considered**

| Option                                                    | Why not                                                                                                                                                                                                         |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep the prefill, select-all on focus                     | Still ships a real URL in the box; a click that lands without focusing, or a paste at cursor, still corrupts it. Treats the symptom.                                                                            |
| Keep the prefill but make it `placeholder` text           | Closest alternative and genuinely tempting. Rejected because the placeholder is already doing that job with a shorter, clearer string ("Paste a listing URL"), and a full URL as placeholder is visually noisy. |
| Rotate sample URLs as an animated typewriter in the field | Actively hostile: an animation writing into an input the user may be typing into.                                                                                                                               |

**Revisit if** analytics show people don't discover the "Try one of ours" samples.
The fix then is to make those buttons more prominent, not to refill the input.

---

### D-003 · `Analyze` is disabled while the field is empty

**Chosen.** `disabled={loading || url.trim() === ''}` with a `title` hint.

**Why.** Follows from D-002. With an empty field, clicking Analyze previously
produced a red error block ("Paste a listing URL to begin"). Nothing has actually
gone wrong at that point — the person simply hasn't pasted anything yet. A
disabled button communicates "not ready" without the failure framing. Aligns with
the brief to make the product usable by people of all ages, where a red error on
first interaction reads as _you did something wrong_.

**Alternatives considered**

| Option                                                        | Why not                                                                                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Keep the button live, keep the red error                      | Punishes an ordinary exploratory click.                                                                                               |
| Keep the button live, show a neutral hint instead of an error | Reasonable, and nearly chosen. Rejected because it still requires a wasted click to learn something the button can express passively. |
| Disable with no explanation                                   | A disabled control with no reason is its own accessibility problem — hence the `title`.                                               |

**Known limitation.** Disabled buttons are not focusable, so a screen-reader user
tabbing through won't hear the `title`. The placeholder and the surrounding copy
carry the same instruction, so this is acceptable — but if we ever add a form with
several disabled states, switch to `aria-disabled` + an inline hint.

---

### D-004 · The paywall teaser no longer contains a fabricated paragraph

**Chosen.** `TruncatedVerdict` takes an optional `blurredParagraph`. The live
report passes the **real remainder** of this property's verdict
(`restAfterFirstSentence`). When there is no second sentence, the component
renders neutral skeleton bars. The blurred block is `aria-hidden`.

**Why.** This is the most serious thing found this session. The component
hardcoded a "paragraph 2" reading:

> Run the numbers at current rates and you are looking at **$4,733** going out
> every month against roughly **$2,900** coming in — a **$1,833** shortfall …
> The DSCR sits at **0.45×** …

Those are the landing page's _sample_ figures. On the real Sheppard Ave report the
actual numbers were $1,825 rent, $3,828 break-even, a $2,003 shortfall and a
**0.13×** DSCR. So every free-tier report in all four modes displayed a paragraph
whose numbers contradicted every other number on the page.

Blur does not make text absent. It was in the DOM, so it reached screen readers,
copy-paste, page-text extraction and search crawlers as if it were this property's
analysis. That is squarely against the data-honesty discipline the rest of the
codebase follows ("honest empty states", "no fabricated/broken values" —
`c31ba0f`).

**Alternatives considered**

| Option                                                               | Why not                                                                                                                                       |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep fabricated prose but make it obviously generic ("Lorem ipsum…") | Still fake text in a financial report's DOM. Looks unfinished rather than intentional.                                                        |
| Blur the real paragraph 2 only, drop the teaser when absent          | Loses the "there is more behind this" signal exactly when the verdict is short. The skeleton keeps the affordance without asserting anything. |
| Increase the blur so it is truly illegible                           | Does nothing for screen readers or copy-paste, which is the actual problem.                                                                   |
| Remove the teaser entirely and show only the upgrade strip           | Weakens a legitimate conversion surface for a problem that has an honest fix.                                                                 |

**Trade-off accepted.** On the free tier the API returns a one-paragraph verdict,
so what gets blurred is the tail of a narrative the user is _already_ entitled to
— they can read it by upgrading, but they could also just read the first sentence
and infer. This is honest (it is genuinely this property's text) but it is a
weaker tease than fabricated drama. Chosen deliberately: a weaker tease beats
numbers that contradict the report.

**Revisit if** the free tier ever returns multiple paragraphs — then blur the real
paragraph 2 and the skeleton path becomes dead code.

---

### D-005 · Hero photo grid pins its row height

**Chosen.** `gridTemplateRows: PHOTO_GRID_HEIGHT_PX` + `overflow: hidden` on the
grid, `minHeight: 0` on the thumbnail stack and its children.

**Why.** On the real listing the address `<h1>` rendered _on top of_ the photos.
Cause: the grid set `height: 360` but no `grid-template-rows`, so its single
implicit row was content-sized. The right-hand stack of three real photos is
intrinsically ~640px tall, which grew the row to 641px; the main photo's
`height: 100%` then resolved against the **row**, not the container, and spilled
281px past the grid onto the address. Demo fixtures used short grey placeholders,
so the row never grew and nobody saw it.

Pinning the row makes the hero independent of image aspect ratio — the real
variable, since listing photos are arbitrary.

**Alternatives considered**

| Option                                               | Why not                                                                                                                                                                                                           |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `overflow: hidden` on the grid alone                 | Hides the spill but the row is still 641px, so the grid still occupies the wrong space and the layout below still shifts. Treats the symptom.                                                                     |
| `aspect-ratio` on the grid instead of a fixed height | Cleaner in principle and worth revisiting. Rejected for now because the two-column split (2fr/1fr) plus the mobile single-column collapse would need re-deriving, and this pass wanted a minimal, verifiable fix. |
| Normalise images server-side to a fixed aspect       | Right long-term answer for payload size too, but it is a scraper/storage change, not a UI fix.                                                                                                                    |

**Verified.** Photo bottom 532px, `<h1>` top 612px, zero overlap, on the real
listing at 1440×900.

---

### D-006 · Nav opacity raised to 94% (landing) / 96% (report)

**Chosen.** `color-mix(in oklab, var(--bg) 94%, transparent)`, blur retained.

**Why.** At 78% the hero's 64px Instrument Serif headline stayed plainly legible
through the sticky bar while scrolling. It read as a rendering glitch rather than
intentional frosting. Keeping `backdrop-filter` preserves the frosted depth over
photos and maps; only the tint got stronger.

**Alternatives considered**

| Option                                    | Why not                                                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Fully opaque nav                          | Loses the frosted quality over the report's photo hero and Mapbox panels, which is a deliberate part of the design language. |
| Stronger `blur()` instead of more opacity | Blur smears but does not hide large high-contrast glyphs; the headline stayed readable in testing.                           |
| Leave as-is                               | Defensible as a style choice, but it consistently read as broken rather than intentional in side-by-side comparison.         |

**Revisit if** the design system formally adopts a translucent-nav treatment with
its own contrast rules.

---

### D-007 · Frontend surfaces the API's own error message

**Chosen.** Unknown API error codes now display `err.message` rather than
"Something went wrong — please try again."

**Why.** `apps/api/src/types/api.ts` documents `message` as _"user-facing, safe to
display"_, and the API writes genuinely useful ones — e.g. "Analysis service
temporarily unavailable — try again in a moment," which tells someone to wait and
retry. The frontend discarded it for a generic string that tells them nothing.
Known codes (`PROVINCE_NOT_SUPPORTED`, `SCRAPER_FAILED`) keep their bespoke
copy, which is more specific than the API's.

**Alternatives considered**

| Option                                     | Why not                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Enumerate every error code in the frontend | Duplicates strings across two codebases and silently regresses to "Something went wrong" for every new code. |
| Always prefer the API message              | Loses the frontend's better, more contextual copy for the two codes that have it.                            |

**Risk accepted.** This displays server-authored text to users, so `message` must
stay user-safe. `api.ts` already states that contract and `details` exists for
internal information. If that discipline ever slips, this becomes a leak — worth a
lint rule if the error surface grows.

---

### D-008 · Scrapers added to CI without installing Playwright browsers

**Chosen.** New `test-scrapers` job runs `pytest .` in `services/scrapers` with
`requirements.txt` only — no `playwright install`.

**Why.** The 180 scraper tests never ran in CI, despite the nightly scraper being
live in production. Every one of them mocks the network and the browser, so
downloading Chromium (~2 min) would buy nothing.

**Alternatives considered**

| Option                                            | Why not                                                                                                                                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install Chromium anyway, for safety               | Two minutes on every PR for a dependency no test touches. Easy to add the moment one does.                                                                                              |
| Add a scheduled smoke test against the live sites | Genuinely valuable and still worth doing — but it is a different job with different failure semantics (a third-party site changing is not a broken PR). Deliberately out of scope here. |

**Revisit if** any scraper test needs a real browser — then add
`playwright install --with-deps chromium` to that job.

---

### D-009 · Report copy rewritten for a general audience, across all four modes

**Chosen.** Every headline metric now carries a one-line, jargon-free explanation
written from that property's real numbers (`Metric.plainEnglish`). Statistical and
industry notation is replaced with plain words on the page, with the precise term
kept in a `title` tooltip:

| Was                                         | Now                                   |
| ------------------------------------------- | ------------------------------------- |
| `P25 · low` / `P50 · median` / `P75 · high` | `Lower end` / `Typical` / `Upper end` |
| `% vs P50`                                  | `% vs typical`                        |
| `GDS ratio`                                 | `Share of your income it takes`       |
| `Contract rate`                             | `Your actual rate`                    |
| `Qualifying rate (higher of)`               | `Rate you must prove you can afford`  |
| `Threshold`                                 | `Most the bank allows`                |
| `GRM` sub-label `Gross Rent Multiplier`     | `price ÷ annual rent` + a sentence    |

**Why.** The reports were readable by someone who already knew the vocabulary and
opaque to everyone else. "DSCR 0.13×" tells an analyst everything and a first-time
landlord nothing; expanding an acronym into its full name ("Gross Rent Multiplier")
explains nothing either. The explanations are generated from the actual figures, so
they stay true per property — e.g. DSCR reads _"The bank's test: does the rent cover
the mortgage on its own? Here it covers 13% of it. Most lenders want at least 100%."_

Covers all four modes: investor and landlord share the metrics grid and OSFI card;
tenant and investor share the comps bar; personal buyer has its own value bar.

**Alternatives considered**

| Option                                      | Why not                                                                                                                                                                                              |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Info icon opening a glossary modal per term | Hides the explanation behind a click, at the exact moment of confusion, and adds a modal to a page that already has several.                                                                         |
| Tooltip-only on the existing jargon labels  | Invisible on touch devices, and leaves the page reading as jargon to anyone who does not hover.                                                                                                      |
| A glossary section at the end of the report | Makes the reader hold a question across the whole page, then hunt.                                                                                                                                   |
| Drop the technical terms entirely           | Rejected — the terms are the shared language of the industry, and a Pro user comparing to a lender's numbers needs them. Both are kept: plain words lead, exact terms remain in labels and tooltips. |

**Trade-off accepted.** Tiles are taller, so the metrics grid is longer. Judged
worth it: an unexplained number the reader cannot act on is not saving space, it is
wasting it.

**Revisit if** user testing shows the explanations read as patronising to
experienced investors — the fix would be a density toggle, not deletion.

---

### D-010 · 5-year population growth computed from two censuses, not one profile

**Chosen.** New `scripts/_build_fsa_growth.py` derives `pop_growth_5y` from two
StatsCan sources and merges it into `statscan-raw/fsa_stats.csv`, which the
existing `load-neighbourhood-stats.mjs` then upserts.

**Why.** `pop_growth_5y` was null for all 1,646 FSAs, so the report's "5-year pop.
growth" tile always read "—". `_build_fsa_stats.py` was written to read
characteristic ID 3 ("Population percentage change, 2016 to 2021") from the 2021
Census Profile for FSAs — but that profile leaves characteristics 2 and 3 blank at
FSA level; only the 2021 population is published there. `NIGHT_NOTES.md:349`
recorded this at the time. Re-downloading that 645 MB file would have reproduced
the same empty column.

The figure has to be computed from two population counts:

- **2021** — WDS table `98-10-0019` ("Population and dwelling counts: Canada and
  forward sortation areas"). A **125 KB** zip covering all 1,646 FSAs.
- **2016** — 2016 Census Profile for FSAs, `98-401-X2016046`. A 49 MB zip holding
  a 317 MB CSV, streamed through `zipfile` rather than extracted.

Result: **1,625 FSAs** with real growth (518 in Ontario); only 21 remain null.
Spot-checked against known areas — Vaughan L4K +29.4%, downtown Toronto M5V
+21.8%, Mississauga L5A −0.9%, Clanton Park M3H +3.8%.

**Alternatives considered**

| Option                                                            | Why not                                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Re-download the 2021 FSA profile and re-run the original script   | The column it needs is blank at FSA level. Would have burned a 645 MB download to produce the same nulls.     |
| Estimate growth from a coarser geography (CMA or census division) | Invents a number for the FSA that no source published — exactly what the report's data discipline forbids.    |
| Leave it as an honest "—"                                         | Defensible, and what was there. Rejected because the data genuinely exists, just in two files instead of one. |
| Store the raw 2016/2021 populations and compute in the API        | More flexible, but needs a schema change and a migration for a figure the UI only consumes as a percentage.   |

**Note on volatility.** Small-population downtown FSAs swing hard — K1P reads
+89.7% on a base of 340 people. That is the true StatsCan figure, not a bug, but
if the tile ever looks absurd this is why. Worth suppressing growth below some
population floor if it misleads in practice.

---

### D-011 · Empty neighbourhood tiles are omitted, and the omission is stated

**Chosen.** `NeighbourhoodSection` renders only tiles that have a figure, then
prints one line naming what was left out: _"Not shown for this address: active
building permits, price per sqft trend. We leave a figure out rather than estimate
one."_

**Why.** The section previously rendered a fixed six-tile grid with "—" wherever
data was missing. On a real report that meant four tiles with numbers and a
trailing run of dashes, which reads as a broken page rather than an honest gap —
and it buried the tiles that did have real data.

**Alternatives considered**

| Option                                  | Why not                                                                                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep the dashes                         | Honest, but it makes a complete section look unfinished, which is the opposite of the intent.                                                        |
| Hide missing tiles silently             | Cleanest visually, and rejected on principle: the reader cannot tell the difference between "we checked and there is nothing" and "we never looked". |
| Show the tile with "not available" text | Same wall of empty tiles, more words in it.                                                                                                          |
| Collapse to a "show all fields" toggle  | Extra interaction for information most readers do not want.                                                                                          |

**Revisit if** building permits and price-per-sqft ever get a data source — the
tiles reappear on their own, since the filter is driven by whether a value exists.

---

### D-012 · Lint added to CI, and the five dead directives it had been hiding removed

**Chosen.** New `Lint — web + api` CI job running both workspaces' eslint with
`--max-warnings 0`; removed the five `/* eslint-disable no-console */` directives
that made `npm run lint --workspace=apps/api` fail.

**Why.** `npm run lint --workspace=apps/api` was failing on **master** — five files
carried a `no-console` disable that suppressed nothing, because the rule is
configured as `["warn", { allow: ["error", "warn"] }]` and those files only use
`console.error` / `console.warn`. Nothing caught it because CI ran typecheck and
tests but never lint. Verified pre-existing by checking out master and reproducing
the same five errors, so this is not a regression from this branch.

Together with the scrapers job (D-008), CI now covers every check the repo defines.

**Alternatives considered**

| Option                                      | Why not                                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Delete the failing lint scripts             | Removes the signal instead of the problem.                                                   |
| Keep the directives, relax `--max-warnings` | The directives are genuinely dead; loosening the gate to accommodate dead code is backwards. |
| Add lint to CI without fixing the errors    | Lands a red pipeline on master.                                                              |
| Fix the errors, leave lint out of CI        | Exactly how it rotted the first time.                                                        |

---

### D-013 · Stripe wired but dormant, failing with an honest 503

**Chosen.** The Stripe client is constructed lazily, and a missing key raises a
typed `StripeNotConfiguredError` that `/billing/checkout` and `/billing/portal`
turn into **503 `BILLING_UNAVAILABLE`** — _"Paid plans are not open yet —
everything on the free tier still works."_

**Why.** The billing code was already complete (checkout, portal, signature-verified
webhook); only the keys were absent, in local `.env` and in the Railway API service
alike. Two problems followed from that:

1. `new Stripe(process.env.STRIPE_SECRET_KEY!)` ran at **module load**, so an
   unconfigured environment built a client with an empty key and surfaced the
   failure at an unrelated moment.
2. Any billing attempt failed deep inside the Stripe SDK and came back as a
   **500 `CHECKOUT_FAILED`** — "Could not start checkout, please try again" — which
   tells a user the product is broken when the truth is that paid plans are simply
   not switched on yet. Retrying, as instructed, would never work.

Genuine Stripe failures still return 500; only the not-configured case is a 503.

**Alternatives considered**

| Option                                                        | Why not                                                                                                                                                                                              |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leave it — nobody can reach billing without an account anyway | The paywall CTAs are live in the UI. A signed-in user clicking "Go Pro" gets a 500 today.                                                                                                            |
| Hide every billing CTA when unconfigured                      | Better UX eventually, and worth doing — but it needs a config flag on the client, so `isStripeConfigured()` is exported ready for it. The server still must not 500 regardless of what the UI shows. |
| Throw at boot if Stripe is unconfigured                       | Would take the whole API down over a feature that is deliberately dormant.                                                                                                                           |
| Put placeholder/test keys in the repo                         | Never — keys do not go in git, and fake ones only move the failure.                                                                                                                                  |

**Setup path** is written up in `docs/ACCESS_SETUP.md` §1: three CAD recurring
products, the `price_` (not `prod_`) ids, test-mode keys, and the webhook secret.
Everything can be done in Stripe **Test mode** — no business activation, nothing
charged — which is what "in place for future billing, not activated" needs.

---

### D-014 · Comparable sales is blocked on a licensing decision, and says so

**Chosen.** Added a dedicated, clearly-marked **BLOCKED** section to
`docs/MVP_TODO.md` with the full task list, and wrote the four provider options up
in `docs/ACCESS_SETUP.md` §2. No speculative provider abstraction has been built.

**Why.** Canadian sold prices are licensed. There is no free or public source for
what a given address sold for — CREA and the local boards control it, and every
consumer site showing sold data is a licensee. I checked the free routes before
concluding this: StatsCan table 34-10-0013 ("Residential property values") is
province-level from 2005, and CREA's HPI is not published as a bulk download.

I deliberately did **not** build a provider-agnostic `comparableSalesService`
ahead of the decision: Repliers, Realtyna, Bridge and DDF differ enough in shape
that an abstraction written now would likely be the wrong one, and would have to be
rewritten against whichever is chosen. The task list is ready so the work is
mechanical once a key exists.

**Alternatives considered**

| Option                                           | Why not                                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Scrape HouseSigma / Zolo / Wahi                  | Their terms forbid it, and it is licensed board data. Legal risk to the product.                           |
| Estimate sale prices from active asking prices   | Asking is not sold. Presenting a derived guess as "recent sales" is exactly the fabrication D-004 removed. |
| Show comps from our own `listings` table         | 22 rows, all asking prices, no sale dates. Not comparable sales.                                           |
| Build the abstraction now, wire a provider later | Real risk of building the wrong shape; the interface should follow the chosen feed.                        |

**Interim behaviour is unchanged and honest**: the report states that no
comparable-sales source exists yet rather than estimating one.

---

### D-015 · Comparable sales built against Repliers' US sample data

**Chosen.** Built the full integration — `comparableSalesService.ts`, the
`ComparableSale` type, wiring through the analysis route, persistence in the
`market_data` blob, 21 tests — against the free Repliers key, which returns **US
sample data only**.

**Why.** The free key covers WA, CO, TN, FL, NC, MO, TX, KS, SC, OK and has **zero
Canadian listings** (`?city=Toronto` returns 0). But the record shape is identical
to production — `soldPrice`, `soldDate`, `lastStatus: Sld`, `details.numBedrooms /
numBathrooms / sqft`, `map.latitude/longitude` — and the API accepts exactly the
query the spec calls for (`lat`/`long`/`radius`, `status=U&lastStatus=Sld`). So the
integration can be written and genuinely proven now, and going live is a key
change rather than a code change.

Reversing the earlier position in D-014 (don't build before the provider is
chosen) is deliberate: the provider **is** now chosen, and a real key with a real
response shape removes the risk that motivated waiting.

**What this does and does not buy.** Every Ontario report still shows the honest
empty state, because there is no Canadian data behind the key. That is correct
behaviour, not a bug — and it is why the live test uses Tacoma coordinates: a
Toronto lat/long would return `[]` and prove nothing.

**Alternatives considered**

| Option                                         | Why not                                                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Wait for the paid plan before writing any code | Pays for a feed before knowing the integration works. Building first means the upgrade is a one-line change with tests already green. |
| Point the live test at Toronto                 | Would return `[]` and pass vacuously, testing nothing.                                                                                |
| Mock everything, skip live tests               | Exactly how the Bank of Canada endpoint rotted silently for months (D-001).                                                           |

**Design choices inside the service**

- **12-month cap on comps.** A two-year-old sale says little about today's market;
  a stale comp is worse than one fewer comp.
- **Unusable rows are dropped, not blanked.** A row with no sale price, address or
  date is discarded rather than rendered with a gap — same rule as D-004.
- **FMV band uses price per sqft, not raw price**, so a 600 sqft condo is not
  compared against a 2,000 sqft house on the same street. It returns null below
  three usable comps: two points is not a distribution, and a band drawn from them
  would look authoritative while meaning nothing.
- **Radius stays at 1km** per spec §7.3, even though it is sparse in low-density
  areas — the live test needed dense coordinates to find any. If real Ontario data
  proves 1km too tight, widen it deliberately rather than by accident.

**Still needed to ship**: a Repliers plan covering TRREB/Ontario, and the licence's
required attribution string (most MLS feeds mandate a "Data provided by…" line).

---

### D-016 · Sample comps keep their real addresses and are labelled, never relocated

**Chosen.** `REPLIERS_SAMPLE_MODE=true` (dev only, off by default) queries the
provider's sample coverage so §08 can be exercised end to end. The comps come back
with their **real US addresses unchanged**, the payload carries
`comparableSalesAreSample`, and the report renders an amber banner above them:
_"Sample data — not this area … Do not read them as comparables for this address."_

**Why.** The question asked was whether the US sample listings could be converted
to random GTA addresses to test the system, on the reasoning that it is just data.
It is not just data — it is the specific claim a buyer would act on.

Rewriting `6816 190th Avenue, Longbranch WA → 12 Maple Street, Vaughan ON` produces
a report stating that a named Ontario address sold for a specific price on a
specific date. No such transaction exists. That is indistinguishable from a real
comp on the page, it is the number that most directly moves a purchase decision,
and it would survive into screenshots, PDFs and a pitch demo with nothing marking
it as invented. It is the same class of problem as the fabricated verdict paragraph
in D-004, and worse, because sale prices are load-bearing.

Keeping the real Tacoma addresses makes the sample self-evident — nobody mistakes
"525 Broadway, Tacoma" for a comparable to a North York condo — while still
exercising the full path: query, mapping, filtering, persistence, shim, render.

**Alternatives considered**

| Option                                                       | Why not                                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Rewrite addresses to plausible GTA ones                      | Fabricates a specific, actionable, unverifiable claim about a real address. The core objection.                     |
| Rewrite to obviously fake addresses ("123 Test St, Toronto") | Safer, but still asserts a sale that never happened, and "Test St" reads as an unfinished product in a demo.        |
| Keep the section empty until the paid plan                   | Leaves the render path completely unexercised — the double "bed" label below would not have been caught.            |
| Seed a local fixture file instead of calling the API         | Tests the renderer but not the integration: the mapping, the filters and the live response shape all go unverified. |

**Caught because of this.** Running real data through the renderer immediately
exposed two display bugs invisible to fixtures: the row template appends `" bed"`
to a field that already contained it (`"1 bed · 1 bath bed"`), and an unknown bed
count rendered `"— bed"`. Both fixed; the service now returns just the count.

**Turn it off** by removing `REPLIERS_SAMPLE_MODE` from `.env`. It must never be
set in production — comps would then describe the wrong continent, labelled or not.

---

## Open items — deliberately not done this session

Recorded so they are not mistaken for oversights.

- **`aspect-ratio` for the photo grid** (see D-005) — a cleaner fix than a pinned
  pixel height; needs the mobile collapse re-derived.
- **Comparable recent sales is empty** on real reports: _"No comparable-sales
  source yet."_ Honest, but it is a visible hole in the investor report. Needs a
  sold-price data source (Teranet is listed as out of MVP scope).
- **Active building permits and price-per-sqft trend** still have no data source.
  They are now omitted from the grid rather than shown as dashes (D-011), with the
  omission stated in prose. 5-year population growth is **resolved** (D-010).
- **Google Places** still returns `[]` until Places API (New) + billing are enabled
  on the Cloud project, so nearby transit/grocery/highway distances stay blank.
- **`docs/MVP_TODO.md` mode naming**: the API accepts `investor` while the DB
  check constraint stores `investment`. Not a bug today (the API maps them) but a
  trap worth unifying.
