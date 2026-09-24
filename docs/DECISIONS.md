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

### D-017 · Amenity results beyond the search radius are dropped

**Chosen.** `nearestPlaceKm` returns null when the match is farther than
`SEARCH_RADIUS_M` (8km) from the property.

**Why.** With Places live, the first real report showed **"Highway on-ramp —
15.62 km, ~31 min"** for a North York condo. The 401 is roughly 2km away, so the
number was visibly wrong to anyone who knows Toronto — the worst kind of error in
a pitch, because it discredits the numbers that _are_ right.

Cause: `locationBias` is a _preference_, not a limit. Few places are literally
named "highway on-ramp", so Places reached past the circle and returned one in
Etobicoke. `locationRestriction` is not a usable substitute — it returns nothing
at all for these queries, which was checked before settling on the cap.

A "nearest amenity" 15km away is not an answer to the question the section asks,
so it is omitted. The other three targets (transit 70m, grocery 0.99km, pharmacy
0.56km) are unaffected and correct.

**Alternatives considered**

| Option                                    | Why not                                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Show it with a caveat                     | The tile has room for a number, not an explanation. A wrong number with a footnote is still a wrong number.      |
| Swap to `locationRestriction`             | Returns zero results for these text queries — verified. Would silently remove all four amenities.                |
| Query a place _type_ instead of free text | No Places type for a highway on-ramp; that is why it was a text query to begin with.                             |
| Drop the highway target entirely          | Over-corrects: it works in areas where on-ramps are named. The radius cap keeps it where it is genuinely nearby. |

---

### D-018 · The old Google key was in the wrong project

**Recorded because it cost real time.** `GOOGLE_PLACES_KEY` was failing with
`PERMISSION_DENIED` and the assumption — mine, and in the earlier setup notes —
was that the project simply needed billing and the API enabled.

Both were true, but insufficient: the key belonged to a **different project
entirely**. Enabling Places on the newly-billed project could never have fixed it.
The Maps onboarding flow created a fresh "Maps Platform API Key" in the correct
project (`352178646394`), and swapping to that is what actually worked.

The tell was in the error body all along, once the key was right:
_"Places API (New) has not been used in project **352178646394** before"_ — a
project id worth reading before assuming the problem is configuration rather than
identity. Noted in `docs/ACCESS_SETUP.md` §3 for the next time.

---

### D-019 · SunScout obstruction uses OpenStreetMap, not Mapbox 3D

**Chosen.** `sunscout/obstruction.py` queries OpenStreetMap via Overpass for
building footprints within 150m, converts each to a horizon profile, and the
sun-path loop drops any hour where the sun sits below that skyline.

**Why this is the differentiator.** Sun-path maths alone gives every unit in a
tower the same score — a ground-floor unit boxed in by neighbours scores
identically to the penthouse. Measured at Yonge–Dundas, south-facing:

|                              | score            | annual hours | vs open sky      |
| ---------------------------- | ---------------- | ------------ | ---------------- |
| Sun-path only                | 87.3 "excellent" | 3,619        | —                |
| Ground floor, real buildings | **72.8 "good"**  | 2,952        | **−667h (−18%)** |
| 10th floor                   | 76.0             | 3,045        | −574h            |
| 40th floor                   | 87.3 "excellent" | 3,619        | 0                |

Same coordinates, same facade. That spread is the product claim.

**Why OSM over Mapbox 3D (which spec §17 names).** Mapbox's 3D buildings are
_derived from_ OSM; reading OSM directly avoids decoding vector tiles server-side
to recover data we would then re-derive. Measured Toronto coverage:

| area          | buildings | with height/levels |
| ------------- | --------- | ------------------ |
| downtown core | 18        | 13 (72%)           |
| Yonge–Dundas  | 37        | 21 (56%)           |
| North York    | 49        | 2 (4%)             |

The raw percentages look bad until you notice **coverage correlates with the
buildings that matter**: towers are tagged (CN Tower 553m, Pantages 45 levels),
untagged ones are overwhelmingly detached houses that shade almost nothing. The
model reports how many it skipped so the report can say so.

**Alternatives considered**

| Option                                 | Why not                                                                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Mapbox 3D tiles, per spec              | Vector-tile decoding server-side for data OSM gives directly as JSON. Revisit if OSM coverage proves insufficient outside Toronto. |
| Assume a height for untagged buildings | Manufactures obstruction that may not exist. The whole point is measuring real surroundings.                                       |
| Ray-trace against a full 3D mesh       | Far more accurate and far slower; a 1°-resolution horizon is well inside the error introduced by missing heights.                  |
| Ship without obstruction (status quo)  | Leaves the score saying a basement and a penthouse are equally bright.                                                             |

**Two bugs found by checking against reality rather than trusting the output**

1. Sampling only footprint _corners_ left holes mid-wall. Fixed by filling each
   edge's arc.
2. Taking a footprint's min/max bearing broke on any building surrounding the
   observer — the Eaton Centre, 28m away, spans bearings 0°–359°, and would have
   blacked out the entire sky from one building. Fixed by walking consecutive
   vertices and always taking the short arc.

A third finding was **not** a bug: due south reading "clear" at Yonge–Dundas is
correct — the 145°–212° gap is Dundas Square itself. Worth stating, because the
instinct was to "fix" it.

**Deliberate limits, documented in the module and surfaced in the UI**

- No terrain (flat enough in urban Ontario; would matter in Vancouver).
- No trees — a summer-shaded window may score higher than it lives.
- Direct sun only; a blocked hour still has skylight.
- Untagged buildings skipped, so the result is a **floor on how much shade there
  is, not a ceiling**. The report says exactly that.

**Floor inference.** Listings expose a unit number, never a floor, and the floor
decides whether a tower matters. `infer_floor_from_address` reads the Toronto
`<floor><unit>` convention (3705 → 37, 229 → 2). It is a convention, not a rule,
so it only ever refines an estimate and is never stated back to the user as fact.
When it cannot be inferred the model assumes ground level — understating sun for a
high unit rather than overstating it.

**Failure behaviour.** Overpass is a free community endpoint that rate-limits.
An outage falls back to the open-sky figure with `obstructionAssessed: false` —
"we did not check" is never rendered as "nothing is in the way".

---

### D-020 · The one input accepts an address as well as a listing link

**Chosen.** The hero field takes either. `classifyInput` decides which before
anything is sent; an address goes to `POST /address` (geocode + province gate),
then a short details card, then the existing ModeModal and pipeline.

**Why.** The product accepted exactly one thing: a Realtor.ca URL. That works if
you are already on Realtor.ca with the tab open, and is a dead end otherwise —
someone who saw a sign on a lawn, got the address in a text, or is standing
outside the building had nothing to paste. Worse, typing a perfectly good address
returned _"That doesn't look like a valid URL"_, which reads as the product being
broken rather than the input being wrong. That is the single most likely place to
lose a first-time user.

**Still not a search box.** An address identifies _one_ property; it does not open
a catalogue. The moment we let people browse listings we are competing with
HouseSigma and Realtor.ca at what they already do well, and the thing that makes
PropScout worth using — one link, one question, one verdict — becomes a feature
buried inside a worse version of a portal. `classifyInput`'s docstring says this
so the next person does not "improve" it into search.

**What an address can and cannot give.** Location is enough for SunScout (with
real obstruction), walk and transit scores, schools, census income and growth, and
rental comps. Price does not exist in any address lookup, and inventing it would
fabricate the number the whole report turns on. So the details card asks for it.

**Alternatives considered**

| Option                                                     | Why not                                                                                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Look the address up in a listings feed and auto-fill price | Needs the paid Repliers plan; and a property not currently listed has no price to find. Would work sometimes and fail confusingly the rest of the time. |
| Separate "URL" and "address" tabs                          | Two inputs where one will do. The user should not have to classify their own input before typing.                                                       |
| Accept the address and estimate the price from comps       | Fabricates the number the report turns on. Same objection as D-004 and D-016.                                                                           |
| Keep URL-only and improve the error message                | Better message, same dead end.                                                                                                                          |

**Three real defects the live testing exposed**

1. **Wrong building.** Mapbox reads "229-701 Sheppard Ave W" as street number 229
   and returns M2N 1N2 — a different building from the real M3H 0B2 — at full
   confidence. `splitUnitPrefix` strips the unit before geocoding and re-attaches
   it after, which also feeds SunScout's floor inference.
2. **Confident nonsense.** "asdfghjkl" scored 0.66 and resolved to a real street
   in Ingleside, Ontario. A geocoder always returns _something_; a weak match
   produces a complete, plausible report about a place the user never typed.
   Matches below 0.9 relevance are now rejected (real addresses score 1.0).
3. **My own regression.** I first appended ", Ontario, Canada" to bias matching.
   It made things worse in both directions — it manufactured matches for nonsense,
   and it made a Vancouver address return "we couldn't find that" instead of
   reaching the BC waitlist gate. Removed; `country=CA` alone is correct.

**Revisit if** Repliers covers Ontario — an address could then pre-fill price and
beds, leaving the card as confirmation rather than data entry.

---

### D-021 · The details card is written for someone who is not confident with computers

**Chosen.** Confirm the matched address first with a visible way back; two
required fields (price, bedrooms); everything else visibly optional with a line
saying what it improves; plain-language labels; `inputMode` for numeric keyboards;
16px inputs; validation only on submit.

**Why each of those**

- **Confirm before asking.** Being told "that's not my building" _after_ filling a
  form is the fastest way to lose someone. The address and a "No, search again"
  button come before any field.
- **Two required, not twelve.** Asking for taxes, year built, parking and
  bathrooms up front reads as work. Price and bedrooms are the two the report
  genuinely cannot proceed without.
- **Optional means optional.** Each optional field says what it buys ("Often the
  difference between a good and bad deal"), so skipping feels allowed rather than
  careless.
- **"What's it listed for?" not "List price (CAD)."** Same field, no vocabulary.
- **16px inputs.** Below 16px, iOS Safari zooms the page on focus and the user
  loses their place — a real, common, invisible-in-desktop-testing failure.
- **`inputMode="numeric"`.** A phone shows a number pad instead of a QWERTY
  keyboard for a price.
- **No red until submit.** Per-keystroke validation marks a half-typed number as
  wrong, which reads as being told off mid-sentence.

**Verified on a 375×812 viewport**: single-column fields at full width, 16px
throughout, correct `inputMode`, no horizontal overflow.

**Alternatives considered**

| Option                                      | Why not                                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| Multi-step wizard, one question per screen  | More taps and more chances to abandon, for six fields that fit on one card. |
| Ask nothing; run with defaults              | Produces a deal score from an invented price — the worst possible failure.  |
| Ask everything the scraper would have found | Twelve fields of homework before any value is shown.                        |

---

### D-022 · Address submit hands off to the ModeModal, not straight to /analyzing

**Chosen.** After `POST /address/start` returns a token, the address path opens
the same ModeModal the listing-link path uses.

**Why.** My first version navigated directly to `/analyzing?token=…&kind=sale`.
That page expects `mode`, not `kind`, so it bounced silently back to the landing
page — the form appeared to do nothing. Beyond the bug, the mode is a real
question: an investor and a personal buyer get materially different reports for
the same address, and the product should not guess which one you are. Reusing the
existing modal keeps both entry paths converging on one flow.

---

### D-023 · The test suite must not call OpenStreetMap

**Chosen.** An autouse fixture in `services/calc-engine/conftest.py` replaces
`build_profile` with one that reports the data source as unavailable.

**Why.** Wiring obstruction into `POST /analysis/` (D-019) made every router test
issue a real Overpass request. The calc suite went from **~6s to 29–73s** and
started failing intermittently — one run reported `1 failed, 373 passed`, and the
same suite passed on rerun untouched. Overpass is a free, rate-limited community
endpoint; a test that fails because someone else's server is busy teaches nothing
and trains people to rerun until green, which is how real failures get ignored.

Returning an _unavailable_ profile is not a fiction: it is exactly what production
does during an Overpass outage, so the path under test is a real one. The
obstruction geometry itself is covered by 21 tests that pass buildings in directly
and never touch the network.

**Measured after:** 374 passed in 5.34s and 5.27s on consecutive runs.

**Alternatives considered**

| Option                                     | Why not                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Patch it in each affected test             | Seven-plus call sites, and the next test to hit the route silently reintroduces the network. |
| Record/replay HTTP fixtures                | Real fidelity, real maintenance; overkill for a dependency the suite should simply not have. |
| Leave it and tolerate the flake            | Normalises rerunning until green, which is how genuine regressions get waved through.        |
| Gate on an env var read in production code | Puts test scaffolding in the shipped path.                                                   |

**Worth noting for the future:** this only surfaced because the suite was run
twice. A single green run after a change that adds a network dependency proves
less than it appears to.

---

### D-024 · Chips carry the brand tint; the primary button stays ink

**Context.** The brief was to make the product look less machine-generated and
more human — colourway, not just copy. A DOM audit of a full report found that of
~2,100 colour declarations, only **97 carried real colour** (accent 45, sage 27,
clay 25). Everything else was the ink/muted grey ramp. Greyscale plus one dark
button is the visual signature of a template.

**Chosen — chips use `--accent-soft`.** The token's own definition is _"tinted
fills — chips, hover washes, card headers"_, but `.chip` was rendering
`--chip-bg` (neutral grey) and `--accent-soft` appeared in exactly two places,
both on the landing page. Chips repeat dozens of times per report, so this is
where a faint tint does the most work. Contrast measured before and after:
**8.08:1 → 7.80:1**, against an AA requirement of 4.5:1.

**Rejected — recolouring `.btn-primary`.** I changed it to the accent first,
reasoning from `CLAUDE.md`'s token table ("--accent … brand, Pro badge, CTAs").
That was wrong, and `src/styles/btnContrast.test.ts` caught it:

> All 13 HTML prototypes ship `.btn-primary { background: var(--ink) }`; the
> accent belongs to hover and `.btn-accent`.

So ink-at-rest is a deliberate, tested decision traceable to the design source,
and a dedicated `.btn-accent` variant already exists for accent CTAs (used by the
paywall components). `CLAUDE.md` says design wins where the two disagree, so the
change was reverted.

**Worth recording as a contradiction rather than silently resolving:**
`tokens.css` says `--accent-soft` is for chips while `global.css` gave chips
`--chip-bg`, and `CLAUDE.md`'s table says the accent is for CTAs while the
prototypes and their test say buttons are ink. The chip case had no test and the
token comment was explicit, so it was changed; the button case had both a test and
a prototype lineage, so it was left alone. If more brand colour is wanted on
primary buttons, that is a change to the design source — worth doing deliberately,
with the prototypes updated, rather than by drifting the CSS.

**Alternatives considered**

| Option                                           | Why not                                                                                                                                                                                                                                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Warm the background from cool limestone to cream | Directly reverses PR10, whose stated rationale is a _"cooler neutral ground so verdict colors and the blue accent carry the temperature"_ — and `--caution` was darkened specifically to pass AA on limestone. Undoing it would break a measured contrast decision to chase a feeling. |
| Swap the hero CTA to `.btn-accent`               | Sanctioned variant, but it makes the landing page's main button differ from every other primary button in the product. A consistency change, not a one-off.                                                                                                                            |
| Add a second accent hue for warmth               | A two-accent palette needs its own contrast work across both themes; not something to introduce mid-session without design review.                                                                                                                                                     |

---

### D-025 · Primary buttons carry the brand colour

**Chosen.** `.btn-primary` rests on `--accent` and hovers to `--accent-hover`,
reversing the previous ink-at-rest rule. `btnContrast.test.ts` and the
DESIGN_README divergence table were updated to match.

**Why the earlier reasoning (D-024) was wrong.** I reverted this once because a
test asserted `--ink`, justified as _"all 13 HTML prototypes ship
`.btn-primary { background: var(--ink) }`"_. That justification does not hold:
`DESIGN_README.md` states plainly that **`tokens.css` now supersedes every
warm-cream prototype**, and `MVP_TODO.md:394` still lists resyncing them as
outstanding. The prototypes carry the _retired terracotta_ palette. The test was
pinning the most prominent element on every screen to a design source the project
had already formally replaced.

Deferring to the design source was right in principle; I just had not checked
whether that source still governed. Worth remembering: "there is a test for it"
answers what the rule is, not whether the reason behind it survives.

**Measured effect.** Brand-colour declarations on the landing page went from a
handful to **296** (harbour 223, sage 31, clay 12, amber 12, accent-soft 18). The
DOM audit that prompted this found only 97 across an entire report.

**Contrast, both themes.** Light: white on `#1F4E68` = **8.94:1**. Dark: the token
system flips to `#0C1116` on `#5E93B0` = **5.67:1** — verified live rather than
assumed, because a naive swap would have put white on the lightened blue at
2.72:1, which the token comment had already warned about.

**Alternatives considered**

| Option                                           | Why not                                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Use the existing `.btn-accent` on hero CTAs only | Makes the landing page's main button differ from every other primary button. Inconsistency reads as an oversight, not a choice. |
| Keep ink, add colour elsewhere                   | Tried — chips alone (D-024) moved the needle far too little. The primary button is the single most repeated coloured surface.   |
| Warm the whole neutral ground                    | Reverses PR10's measured decision and breaks `--caution`'s AA margin on limestone.                                              |

**Not done, and deliberately.** The 13 prototypes in `docs/design_handoff/` are
still on terracotta and are now one rule further out of date. Resyncing them is
already tracked (`MVP_TODO.md:394`); doing it properly means regenerating them
against current tokens, which is a design task rather than a code one.

---

### D-026 · The hero leads with a verdict, not a stock image

**Chosen.** Split the hero into two columns: the headline and the input on the
left, and on the right a small card showing a real product output — a deal score
of 15, "Hard pass", against a $3.5M Mississauga listing with −$23,534/mo cash
flow. Added one contrastive line under the `<h1>` in Instrument Serif and
`--accent`: _"We don't list properties. We tell you whether to buy one."_

**Why.** The reference the user supplied (nothtechnologygroup.com) works on two
devices: a short contrastive claim that says what the company is _not_, and a
cinematic hero. The claim transfers directly. The cinematic part does not — its
imagery is a stock close-up of an eye, which is the single most worn AI-company
trope; copying it would land us exactly where the user said not to be.

The honest translation is to make the hero image _the thing the product
produces_. Nobody else scores a Canadian listing and makes a call on it, so the
verdict card is both the most distinctive asset we have and a truthful preview.

**Deliberately a bad score.** The showcase verdict is a hard pass, not a
recommendation. A tool that only ever shows good news is an advert, not an
advisor, and the product's entire claim is that it will tell you not to buy.

**Alternatives considered**

| Option                                      | Why not                                                                                                        |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Full-bleed photograph of a house or skyline | Every real-estate site on earth opens this way; it says "listings", which is the one thing we are not.         |
| Abstract gradient / mesh hero               | The exact "AI-looking" surface the user asked to move away from, and it proves nothing about the product.      |
| Keep the single-column typographic hero     | Was working, but the first product evidence sat two full screens down. The strongest asset was below the fold. |
| Show a strong score (e.g. 78) instead       | Reads as marketing. The hard pass is more distinctive and more honest about what the product is for.           |

---

### D-027 · The showcase's largest panel shows a rent distribution, not an empty map

**Chosen.** Replaced the 200px placeholder box inside the showcase "Rent
positioning" card — a grey rectangle captioned _"Toronto · M4Y · 1km radius"_ —
with a distribution of the 36 comps behind the quoted range: ten $50 buckets
from $1,800 to $2,300, the market-mid bucket in `--accent`, the asking-rent
bucket in `--caution`.

**Why.** It was the biggest single element in the page's only piece of product
proof, and it rendered as a rectangle with nothing in it. To a first-time
visitor that reads as unfinished software, which undoes everything the rest of
the page is arguing.

A map would have been the wrong replacement twice over. The showcase already
renders a real Mapbox comps map in the column beside this one, so it would have
been a duplicate; and a map answers _where_, while the panel is titled "Rent
positioning" and is asking _how much_.

The distribution answers it, and it carries the argument the panel exists to
make: the mass of the building sits in the low $1,900s and this ask is out in a
thin tail with three comps behind it. That is the negotiation case, and it is
precisely what a listing site will never show you.

**Alternatives considered**

| Option                                           | Why not                                                                                                                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Render a second real Mapbox map                  | Duplicates the comps map already in the adjacent column, and costs a tile request on every landing-page view.                                                           |
| Keep the placeholder, restyle it                 | The problem is that it is empty, not that it is ugly.                                                                                                                   |
| Drop the panel and let the range bar stand alone | The range bar gives three numbers with no sense of shape; "$2,150 against a $1,800–$2,300 range" sounds unremarkable until you see that almost nothing trades up there. |
| Wire it to live comp data                        | The landing page must render identically for everyone and is snapshot-tested; live data would make it flaky and slow.                                                   |

**Also changed.** The closing CTA read _"Stop building the spreadsheet again.
Paste the URL."_ Since D-020 the input takes an address too, so the page was
contradicting itself between the hero and the footer. Now: _"Paste a link, or
type an address."_

---

### D-028 · Address-entered listings get their own row (`source_url` is NULL, not `''`)

**Chosen.** Made `listings.source_url` nullable (migration
`20260906_listings_source_url_nullable.sql`), write NULL rather than `''` for
listings that came from a typed address, and insert rather than upsert when
there is no source URL.

**The bug.** `source_url` was `text unique not null`, written on the assumption
that every listing comes from a page we scraped. Address entry (D-020) has no
URL, so every such listing was stored with the empty string — and the UNIQUE
constraint meant they all competed for one row. `saveListing` upserted on
`source_url`, so the collision was silent rather than an error: **each new
address overwrote the previous listing, and share tokens issued earlier
repointed at whatever property was entered most recently.** Two people
analysing two addresses would each see the other's property.

Found by running the flow end to end, not by a unit test — every unit test
mocked the database, so the constraint that caused it was never exercised.

**Why NULL rather than a synthetic URL.** Postgres treats NULLs as distinct for
uniqueness, so scraped listings keep deduplicating on their URL while every
address-entered listing gets its own row. NULL is also what "there is no source
page" actually means; a synthetic `address://<uuid>` would put a non-URL in a
column named `source_url` and mislead the next person to read the table.

**Alternatives considered**

| Option                                          | Why not                                                                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Synthetic unique value, e.g. `address://<uuid>` | No migration needed, but stores something that is not a URL in `source_url` and leaves the misleading NOT NULL invariant.   |
| Drop the UNIQUE constraint entirely             | Breaks scraped-listing deduplication, which is the reason the constraint exists.                                            |
| Key address listings on a normalised address    | Two people analysing the same building would share one listing row and overwrite each other's price. Same class of bug.     |
| Leave the upsert and accept overwrites          | This is the bug. A user's saved report silently becoming someone else's property is the worst failure the product can have. |

**Regression cover.** `supabaseService.test.ts` now asserts that a listing with
no URL is inserted and never upserted, that a scraped listing still upserts on
`source_url`, and that two addresses produce two rows.

---

### D-029 · Comparable sales render on the personal buyer report, labelled by provenance

**Chosen.** Wired `PBSalesSection` to the comps the analysis actually returns.
On a live report it renders them when there are any and keeps the honest empty
state when there are none. When the comps came from the provider's sample
coverage area, the section says so in `--caution`: _"Real sales from the
provider's sample coverage area — not this neighbourhood."_

**Why.** The comps integration landed in the API and reached the investor
report, but the personal buyer report — where comparable sales are the headline
section (§03) — still rendered the demo fixtures' empty state regardless. The
data was being fetched, mapped, and thrown away.

**What is deliberately not filled in.** The feed carries sold price and date but
no days-on-market and no distance from the subject. Those columns render an em
dash. A zero in a DOM column reads as "sold the same day" and is
indistinguishable from a real figure, so the type makes them `number | null`
and the absence is explicit rather than encoded as a plausible number.

**§02 Fair market value stays empty on purpose.** It would be trivial to derive
an FMV band from these comps, and it would be wrong: while sample mode is on
they are Tacoma sales, and positioning a Vaughan condo against them would be
confidently incorrect in a way nothing on the page would reveal. It switches on
when the Repliers plan covers Ontario.

**Alternatives considered**

| Option                                       | Why not                                                                                                         |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Render sample comps with no provenance label | Presents Tacoma sales as this listing's neighbours. Exactly the fabrication the empty state existed to prevent. |
| Keep the empty state until Ontario data      | The pipeline then ships untested; this is what let the wiring gap survive unnoticed in the first place.         |
| Show 0 for days on market                    | A precise-looking lie. Worse than a dash, because nothing signals it is unknown.                                |
| Derive the FMV band from sample comps        | Confidently wrong. See above.                                                                                   |

---

### D-030 · The maintenance reserve does not assert a build era it does not know

**Chosen.** `maintenanceNote(0)` now returns _"1.5% of value / yr · build year
unknown"_ instead of _"pre-1980 build"_.

**Why.** `yearBuilt` is 0 when the listing did not state one, which is always
for address-entered listings. Zero fell through to the final branch, so the
report told the user their possibly brand-new condo was a pre-1980 build. The
1.5% rate is kept — the conservative choice when age is unknown — but the
stated reason is now the true one.

**Alternatives considered**

| Option                                 | Why not                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Use the 0.5% rate when unknown         | Understates the reserve on an old building, which flatters the deal. Wrong direction to be wrong in. |
| Hide the note when the year is unknown | The user then cannot see why the reserve is what it is, and the figure looks arbitrary.              |
| Ask for build year in the details card | Another required field on a form deliberately kept to two (D-021), for a second-order number.        |

---

### D-031 · Rental comps widen by radius when the FSA has none

**Chosen.** `fetchRentalComps` now takes the subject's coordinates. When the FSA
search finds nothing, it searches outward — 5km, then 10km — using a bounding
box in Postgres trimmed to a true circle by haversine. The radius used is
returned as `radiusKm` and shown in the report: _"within 5km, not this postal
area"_. Confidence is capped at medium for 5km and low for 10km.

**Why.** The existing fallbacks widened the date window (90→180 days) and the
bed count (exact→±1) but never the location, so an FSA with no scraped rows
returned nothing. Vaughan's L4K — the Metropolitan Centre, a dense condo
corridor — had **zero** rows while **86 comps sat within 5km**. Every report
there fell back to the gross-yield proxy and told the user no comps existed.

That fallback was not neutral. The proxy assumes ~6% gross yield, which on a
$729,900 listing implies about $3,650/mo. The real local median is **$2,475**.
The proxy was overstating rent by roughly 47% and making a bad deal look
survivable: the same listing scores 13 on the proxy and **8** on real comps,
with cash flow moving from about −$1,833 to −$2,724. The missing-data path was
flattering exactly the deals the product exists to warn people off.

**Why not just scrape more.** Worth doing, and the seeds already cover 23 GTA
municipalities, but coverage will always have holes — new FSAs, thin weeks,
sources changing markup. The report should degrade to "comps from nearby,
disclosed" rather than "no data", regardless of how good coverage gets.

**Alternatives considered**

| Option                                      | Why not                                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Fall back to the neighbouring FSA by string | L4K and L4J happen to be adjacent; L4K and L4B are not. FSA codes are not ordered geographically, so this is right by luck.     |
| PostGIS / a stored procedure                | Correct at scale, but a dependency and a migration for what is a fallback path. Bounding box + haversine uses existing columns. |
| Keep the gross-yield proxy                  | It is the bug. A silently wrong rent is worse than a disclosed nearby one.                                                      |
| Widen without disclosing                    | Presents a Mississauga median as Vaughan's. The whole point is that the reader can discount it.                                 |

---

### D-032 · The golden dataset covers every flag, positively and negatively

**Chosen.** Expanded `golden_cases.json` from 3 cases (12 assertions, 8 flags)
to 51 cases (78 assertions) covering all 15 regex flags, each with at least one
case asserting it _should_ fire and one asserting it _should not_. Added two
tests beside the accuracy gate: one failing if any flag lacks positive or
negative coverage, one failing on duplicate case ids.

**Why the negative cases matter most.** The old suite passed at 100% while
testing three flags. A pattern that matched everything would have passed it.
The first run of the expanded set immediately caught a real contradiction:
_"Sorry, no pets permitted"_ fired **both** `no_pets` and `pets_allowed`,
because `pets (welcome|allowed|ok|permitted)` matches inside "no pets
permitted". A tenant reading that report would have been told the building was
pet friendly when the listing said the opposite. Fixed with negative lookbehinds
for "no " and "not "; accuracy went 98.7% → 100%.

**Honest limit — these are not scraped listings.** The spec asks for 50 _real_
Ontario listing descriptions. These are written to read like real ones and are
labelled by what a careful human would conclude, but they are synthetic. They
prove the rules behave as intended on the language they target; they do **not**
prove real Realtor.ca prose falls inside that language. Collecting genuine
descriptions needs the scraper running at volume, and should replace or extend
this set rather than sit alongside it.

**Alternatives considered**

| Option                                      | Why not                                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Wait for real scraped descriptions          | The gate stays untested meanwhile, which is how the pets contradiction survived. Synthetic now, real later, is strictly better. |
| Generate cases from the patterns themselves | Circular — every case passes by construction and nothing is ever caught.                                                        |
| Positive cases only                         | What the old set effectively was. Rewards over-matching, which is the dominant failure mode of a regex pipeline.                |
| Label these as real listings                | They are not. Presenting invented prose as scraped data is the exact dishonesty the rest of the product avoids.                 |

---

### D-033 · The golden dataset is validated against real listings, not just itself

**What was asked.** Whether the expanded golden dataset (D-032) is _reliable_.

**Finding: it was not, as evidence about real listings.** The dataset passed at
100%, but I wrote both the cases and the patterns, so the cases used the exact
vocabulary the patterns already matched. That is circular — it proves the rules
are self-consistent, not that they work.

**How it was checked.** Ran the extractor over the **22 real Realtor.ca
descriptions** already in the `listings` table (average ~1,000 characters).
Only **6 of 22** fired any flag. Inspecting the silent 16 showed genuine misses,
not clean listings:

| Real phrasing (verbatim from scraped listings) | Should fire          | Did fire |
| ---------------------------------------------- | -------------------- | -------- |
| "Fully Renovated Two-Bedroom Condo"            | `recently_renovated` | no       |
| "Completely Renovated In 2023"                 | `recently_renovated` | no       |
| "Professionally renovated in May 2025"         | `recently_renovated` | no       |
| "Maintenance Fees Include Hydro And Cable"     | `utilities_included` | no       |
| "The Maintenance Fee Includes All Utilities"   | `utilities_included` | no       |
| "one dedicated parking space"                  | `parking_included`   | no       |

Only `newly renovated` was matched; every other way a listing says the same
thing was invisible.

**Fixed.** Widened the three patterns against that evidence and locked the real
phrasings in as golden cases gc-052…gc-058. Real-world recall went **6/22 →
10/22** while the synthetic set stayed at 100%, which is the check that matters:
the wider patterns did **not** start over-matching. Specifically `gc-001`
("Condo fee includes water and building insurance") stays negative — the
utilities rule is deliberately limited to hydro, heat and "all utilities",
because water alone does not change the monthly cost — and gc-017/gc-018
("parking may be rented", "no parking space") stay negative too.

**A qualifier is required for renovation.** Bare `renovated` would fire on
"renovated in 1998", which is not what the flag means. The list of qualifiers is
taken from observed prose, not invented.

**Still true, and worth repeating.** 22 listings is a small sample from a
handful of Toronto FSAs. It is enough to disprove "the rules work on real
prose"; it is not enough to prove they do. The set should grow as the scraper
runs, and gc-052…gc-058 are marked as real-derived so the distinction survives.

**Alternatives considered**

| Option                                         | Why not                                                                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Trust the 100% synthetic pass                  | Circular. It was 100% before the pets contradiction was found too.                                                         |
| Match bare "renovated" / "parking"             | Fires on "renovated in 1998" and "no parking space". Recall bought with false positives is a bad trade.                    |
| Mutation-test the patterns instead             | Would show the dataset constrains the regex, but still never leaves the vocabulary I chose. Real prose is the harder test. |
| Wait for a larger scrape before touching rules | Six concrete misses were already in hand. Fixing them now is strictly better than fixing them later.                       |

---

### D-034 · A report never shows photo frames for photos it does not have

**The problem, as seen on screen.** Every report opened with a four-frame photo
grid — a large "exterior · condo" tile, thumbnails labelled "living",
"kitchen", "floorplan", and a **"+ 18 more"** badge — rendered whether or not
the listing had a single photo. A listing entered by address never has any,
because there is no page to take them from. So the first thing a reader studied
was 360px of empty grey claiming eighteen photos that did not exist.

It made a finished report look broken, and it invented content, which is the one
thing this product must not do. The "+ 18 more" was a literal hardcoded string
in `TenantReport.tsx` and `LandlordPropertyHero.tsx`.

**Chosen.** One shared `ListingVisual` used by all three heroes:

- photos exist → main image plus **however many thumbnails there actually are**,
  and "+ N more" only when N > 0;
- exactly one photo → it fills the width instead of sitting beside empty frames;
- no photos → the property on a real map, with the caption _"No listing photos ·
  report built from the address"_.

The map is honest, useful, and carries the same visual weight, so the page still
opens on something worth looking at. When the hero shows a map, the section map
lower down is suppressed — rendering the same map twice read as a fault.

**Alternatives considered**

| Option                                     | Why not                                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Keep the grid, drop the "+ 18 more"        | Four empty grey frames still imply four missing photos.                                  |
| Stock or illustrative imagery              | A picture of a building that is not this building is a fabrication, just a prettier one. |
| Collapse the hero to text only             | The report then opens on nothing, and the page loses its anchor.                         |
| Scrape photos for address-entered listings | There is no listing page to scrape. That is the premise of address entry.                |

---

### D-035 · Report layout collapses via CSS, not `window.innerWidth`

**The bug.** At 375px the report hero stayed in two columns and the page
scrolled sideways by 348px. `PropertyHero` chose its columns with
`window.innerWidth <= 480` — and `innerWidth` reports the **overflowing** width,
not the viewport. Content overflowed → `innerWidth` read 723 → the check said
"not mobile" → two columns → which caused the overflow. The measurement was
downstream of its own effect.

**Chosen.** `.report-hero` in `global.css` with a media query, which reads the
viewport and cannot be fooled. `minmax(0, 1.5fr)` rather than `1.5fr`, because a
bare `fr` floors at min-content and refuses to shrink. `matchMedia` where JS
still needs the breakpoint (gauge size), so it agrees with the stylesheet.

Also raised `.grid-1col-mobile` from 480px to 900px and applied it to the eight
report sections that had fixed two-column grids. A two-column section does not
become usable at 481px — its content has a minimum width, so below roughly 900px
the columns stop shrinking and push the page sideways instead.

**Nav.** The report nav's Share / Sign in / Save row is 422px wide and would not
shrink, shoving itself off screen. Share and Save are already offered by
`StickyActionBar` on mobile, so they are hidden there — a duplicate removed, not
a capability. The breadcrumb gets `min-width: 0` so it truncates instead of
pushing the buttons out.

Horizontal overflow at 375px went from **348px to 10px**; desktop is unchanged
at 0.

**Alternatives considered**

| Option                                 | Why not                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Fix the JS threshold (480 → 900)       | Still measures the wrong thing. The feedback loop remains; it just triggers at a different width. |
| `ResizeObserver` on the container      | Correct but heavy for what one media query expresses, and it still disagrees with the stylesheet. |
| Leave sections at the 480px breakpoint | Measured: they overflow well above 480px, which is what pushed the page sideways.                 |
| Let the nav row wrap                   | A two-line nav on every report is worse than hiding two buttons duplicated below.                 |

**Not fixed, and honest about it.** ~10px of overflow remains from the sticky
action bar. And the in-app browser here renders WebGL through Microsoft Basic
Render Driver, so Mapbox paints intermittently for me — it renders correctly in
a normal browser, so the map is **not** known-broken; I simply cannot judge it
reliably from this environment.

---

### D-036 · Depth and motion become tokens; a report gets a section rail

**Asked for:** modern and appealing to use, explicitly _not_ cinematic.

**What was actually missing.** The token file had **two** shadows, three tight
radii, and **no motion tokens at all**. `.card` — the single most repeated
surface in the product, dozens per report — had no transition and no hover
state. Every surface therefore sat at the same depth and nothing responded to
being touched. That is why better formatting still read as "the same look":
the page was well arranged and completely inert.

**Chosen.**

1. **A three-level elevation scale** (`--shadow-sm` / `--shadow-card` /
   `--shadow-raised`), each a tight contact shadow plus a wide soft one. The
   contact shadow is what stops a card looking pasted onto the background. Dark
   mode carries depth through an inset top highlight instead, because a shadow
   on a dark ground reads as nothing.
2. **Motion tokens** — `--ease`, `--dur-fast`, `--dur`, `--dur-slow`. These
   timings were already specified in CLAUDE.md but retyped at every call site,
   so they had drifted from 0.12s to 0.3s across components.
3. **Radii up one step** (6/12/18 → 8/14/20). The cheapest single change that
   stops a dense data page reading like an internal admin tool.
4. **`.card-interactive`**, deliberately separate from `.card`. Almost no report
   card is clickable; giving every one a hover lift would promise an
   interaction that is not there, which is worse than being inert.
5. **`ReportSectionRail`** — a fixed rail in the left margin listing the
   report's sections, tracking the reader on scroll and jumping on click.

**Why the rail is the "appealing to use" half.** A report is eleven sections and
several thousand pixels of dense numbers, and the only way through it was to
scroll and hope — no sense of how much was left, which section you were in, or
how to get back to one. The rail gives the document a visible shape.

It **reads the DOM rather than keeping a list**: sections come from
`[data-section]` and labels from a `data-section-topic` that `SectionHead` now
emits, so a section added, removed or renamed appears correctly with no second
place to update. A hardcoded table of contents would drift silently.

**Deliberate limits.**

- Labels appear only above 1620px. At 1440px the margin is 80px, so a 190px
  label would sit on top of the report; below that the rail stays a column of
  numbers, which still answers "where am I" and "how much is left".
- Hidden below 1240px — it lives in a margin that does not exist on a phone.
- A scroll listener, not `IntersectionObserver`: sections are taller than the
  viewport, so several intersect at once and the observer cannot say which one
  is being read without re-deriving positions anyway.
- `prefers-reduced-motion` keeps the colour and shadow changes and drops the
  transform. The state change is information; being moved around is not.

**Alternatives considered**

| Option                                       | Why not                                                                                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Full-bleed cinematic sections, scroll motion | Explicitly ruled out. It also does not transfer: most of the surface is a report, not a landing page.                         |
| Restyle the type scale and palette           | The palette is PR10's measured, contrast-checked system. Changing it to look different would trade accessibility for novelty. |
| Hover lift on every `.card`                  | Implies clickability across dozens of inert surfaces.                                                                         |
| A horizontal sticky tab bar of sections      | Eats vertical space on every screen and truncates at eleven sections.                                                         |
| Hardcode the rail's section list             | Drifts the moment a section is renamed, and silently.                                                                         |

**Not claimed.** This is a foundation and one navigational addition. The report's
own visual identity — the score card is still nine rows of small grey text
around an underplayed gauge — is untouched and is the obvious next move.

---

### D-037 · The investment verdict leads the score card

**Chosen.** A headline verdict, a prominent monthly cash-flow panel, and weighted
component bars replace the centered gauge and equal-width hairlines. Keep the
PR10 palette and assigned font roles. Spacing, typography, rules, and motion use
tokens; reduced motion disables gauge and bar transitions. The backend remains
the authority for both the score and verdict. Explain the 95-point component
scale and normalized 100-point display, including risk limits. Zero points have
zero fill; invalid points show an em dash rather than a plausible score.

**Why.** A reader should see the recommendation and monthly financial consequence
before studying the inputs. Weighted tracks expose the different contribution
limits rather than implying every component matters equally.

**Alternatives considered**

| Option                                      | Why not                                                               |
| ------------------------------------------- | --------------------------------------------------------------------- |
| Cinematic imagery or a new palette          | Outside the owner's direction and the contrast-checked design system. |
| Make only the gauge larger                  | Still makes the verdict and cash loss secondary.                      |
| Equal-length tracks or minimum visible fill | Misrepresents weights or gives zero-point components apparent credit. |
| Infer the verdict from component totals     | Would bypass backend risk ceilings.                                   |

---

### D-038 · Measure extraction on full, traceable listing prose

**Chosen.** Add 38 verbatim Ontario descriptions: 22 from the approved database
archive and 16 fresh successful scrapes, out of 21 attempted URLs. Five pages
yielded no usable description and were excluded. Every new case carries its
source URL, address, scrape timestamp, acquisition method and description hash.
Keep the original 58 cases (51 synthetic, seven real-derived excerpts) intact.
The dataset now has 96 cases and 653 assertions.

Manually label the 15 regex flags, leaving current-tenancy labels unset in two
ambiguous descriptions. Widen only evidenced phrase variants for parking,
utilities, pets, tenancy, basement suites and renovation. Remove the bare
dated-renovation pattern: a renovation in 2014 is not evidence of a recent
renovation. Qualified language such as "fully renovated" remains supported.
Add negation and older-renovation counterexamples. No flag severity changes.

**Why.** Before these fixes the expanded aggregate still scored 97.1%, masking
19 errors. On the fully labeled real positives, precision was 30/31 (96.8%) and
recall 30/48 (62.5%). Both are now 48/48 with no false positives on this corpus.
Enforce separate 95% real precision and recall gates plus exact preservation of
the original cases. These are development-corpus results, not held-out accuracy.
The prior "10/22 recall" was a listing activation count, not labeled flag recall.

**Alternatives considered**

| Option                                                  | Why not                                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Add more synthetic prose                                | Does not test vocabulary the rule author did not choose.                        |
| Use aggregate accuracy alone                            | Negative labels concealed real missed flags.                                    |
| Treat ambiguous historical tenancy as current occupancy | Would invent a present fact.                                                    |
| Claim 100% real-world extraction                        | Rules were tuned on this corpus; broader and held-out coverage is still needed. |

**Handoff correction.** The Haiku extractor exists and is invoked by the analysis
router. Its broader semantic recall has not been established by this regex suite.

---

### D-039 · Live verification exposes display assumptions and duplicated tax

**Chosen.** Preserve unknown year as the display model's zero sentinel. The
investor maintenance display then uses the backend's 1% unknown-year assumption
and explicitly labels it. Address entry does not collect parking, so show
"— parking · not provided" instead of a claimed zero. For live investor reports,
cash invested is down payment plus the API closing-cost total: that total already
includes land transfer tax. Show the remaining costs separately from LTT.

**Why.** The live report hid the invented build year while still using it to
understate displayed maintenance at 0.5%. It also counted $11,073 of tax twice:
cash to close was $170,526 instead of $159,453. These are display corrections;
the backend reference remains 8 / hard pass and −$2,723.68/month.

**Alternatives considered**

| Option                                                   | Why not                                                        |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| Hide the build year but keep an estimated age internally | The invented age still changes displayed costs.                |
| Assume address-entry parking is zero                     | The form never asked for it.                                   |
| Add LTT to closingCostsTotal                             | The backend already includes it, so this double counts tax.    |
| Change backend scoring to match the old display          | Would make correct underwriting conform to a presentation bug. |

**Verification and limits.** The owner approved four fresh shared-database
verification reports, one per mode, plus reading archived descriptions. All four
completed and kept distinct listing IDs and correct share-link properties after
subsequent creations. No production deployment or merge was authorized.
Vercel's environment-variable list confirms VITE_API_URL is assigned to both
Production and Preview. Automatic approval review blocked opening its secret
value; coverage is verified, the endpoint value is not.

The live AI narrative also proposed a roughly $300,000 target price without a
provided calculated target. Treat that as an unresolved narrative-grounding
issue before release, not a verified negotiation recommendation. Personal-buyer
maintenance defaults and demo closing-cost conventions need a separate parity
review; do not infer that every mode's financial presentation is validated here.

---

### D-040 · A live personal report stays unscored until pricing is sourced

**Chosen.** Live personal reports always pause their aggregate Home Score until
verified Ontario fair-market-value data exists. Schools and SunScout still render
in their own sourced sections; the paused score card shows only validated risk
points. A photo-less address entry uses `ListingVisual`'s real map and caption,
and missing parking says it was not provided. Tenant asking rent likewise shows
an em dash plus the reason when the address workflow supplied none. Utility and
insurance notes identify estimates without claiming a heating system, provider,
or housing type the listing did not establish.

**Why.** The live Buttermill personal report awarded 18/25 pricing points from an
FMV band mechanically centered on asking, then displayed 83 / “Make an offer.” It
also rendered four empty photo frames and “+ 28 more.” Those outputs looked
authoritative while being derived from missing data. School data does not make
the asking price fair, and a zero rent or parking count is not the same as an
unknown value.

**Alternatives considered**

| Option                                                       | Why not                                                |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| Enable Home Score when either schools or FMV exists          | Schools cannot validate the pricing component.         |
| Show known component points beside fabricated pricing points | The resulting total still flatters an unverified deal. |
| Keep labelled photo placeholders in live reports             | Labels and a “more” count imply photos exist.          |
| Render `$0/mo` or `None` for absent inputs                   | Those are factual claims, not empty states.            |

---

### D-041 · Mobile report grids may shrink below their contents

**Chosen.** Mobile one-column helpers use `minmax(0, 1fr)` and set direct grid
children to `min-width: 0`. The investor expense breakdown becomes one column
below 900px, and personal-report action rows wrap. The personal demographic strip
uses the same collapse helper.

**Why.** At a 375px viewport the document was 385px wide in investor/landlord
mode and 520px wide in personal mode. DOM bounds traced the first overflow to
the two-column expense rows and the larger one to a fixed four-column statistics
strip plus button rows. After these changes, measured document and viewport
width are both 365px (the browser reserves 10px for its scrollbar).

**Alternatives considered**

| Option                               | Why not                                                           |
| ------------------------------------ | ----------------------------------------------------------------- |
| Hide horizontal overflow on the page | Clips content and leaves the broken layout in place.              |
| Shorten labels until they fit        | Content changes would only mask the fixed-width grid.             |
| Add another JavaScript width check   | CSS owns layout and avoids the feedback loop documented in D-035. |

---

### D-042 · Reject AI narratives with unprovided dollar claims

> **Superseded by D-043.** This boundary protected the brief Sonnet narrative
> path. Verdict prose is now deterministic and no longer calls Sonnet.

**Chosen.** Narrative prompts forbid calculated dollar amounts, and the service
post-validates every currency claim against the numeric fields supplied to the
model. It compares exact rounded dollar values while accepting commas, spacing,
and negative signs. Any unprovided or decimal currency amount rejects the whole
narrative and returns the existing explicit temporary-unavailable fallback.
Tenant targets may repeat a supplied asking, low, mid, or high rent.

**Why.** The real Buttermill narrative proposed a roughly $300,000 purchase
target. The calculation engine supplied asking price, rent, cash flow and
break-even rent, but no purchase target. A prompt instruction alone cannot make
fabricated money safe; a deterministic output boundary can.

**Alternatives considered**

| Option                               | Why not                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Strengthen the prompt only           | The model can still disobey it, as the live run demonstrated.                                                                        |
| Allow arithmetic-derived dollar gaps | Reimplements financial calculations in prose without a tested source field.                                                          |
| Delete only the offending sentence   | Sentence splitting can leave dependent claims and produce incoherent advice.                                                         |
| Validate every number in the prose   | Addresses, scores, percentages, counts and ordinary quantities need different semantics; currency is the observed high-risk failure. |

**Limit.** This boundary does not prove that non-currency prose or percentages
are grounded. Add typed source fields and validators when a real failure exposes
those classes; do not claim general narrative factuality from this guard.

---

### D-043 · Generate verdict prose deterministically in the backend

**Chosen.** `generateNarrative` is now a fixed backend formatter over validated
structured inputs. Each report mode has explicit branches for known and missing
evidence. It makes no model call, ignores subscription tier when choosing words,
and produces byte-for-byte identical prose for identical inputs. Claude Haiku
remains confined to structured listing-description flag extraction.

**Why.** Even a language model called with temperature zero can vary between
runs or model revisions. PropScout's verdict is decision support: two checks of
the same inputs must not offer different advice. Deterministic branches also
make missing evidence and negotiation limits testable instead of prompt wishes.

**Live verification.** Four fresh Buttermill reports, one per mode, were run
twice through the real local API/calc/shared-Supabase stack. Each second pass
retained its listing ID, score, verdict, and byte-identical SHA-256 narrative
hash. All four stayed at 8 / hard pass and −$2,723.68 monthly cash flow; the
tenant and personal prose explicitly withheld conclusions that lacked asking
rent or local comparable-sale evidence.

**Alternatives considered**

| Option                                      | Why not                                                                                             |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Keep Sonnet at temperature zero             | Temperature zero reduces randomness but does not guarantee identical output.                        |
| Cache the first model response per listing  | Freezes an opaque response and can serve stale prose after calculations or evidence change.         |
| Seed the prompt and validate dollar claims  | Still depends on model behaviour and only catches selected error classes after generation.          |
| Generate once and reuse across report modes | Investors, personal buyers, tenants, and landlords need different decisions from the same property. |

**Limit.** Identical prose requires identical structured inputs. A later rate,
comparable, or verified-risk update can correctly change both metrics and text.

---

### D-044 · Use full clockwise score rings and code-rendered landing previews

**Chosen.** Every numeric score uses a full circular track that starts at twelve
o'clock and fills clockwise. Verdict pills sit outside the ring. The landing
mode cards now render responsive HTML previews instead of cropped WebP report
screenshots; chips live in normal document flow, and the SunScout summary uses
shrinkable grid columns with a one-column phone layout. Tenant checklist and
rent-alert actions also stack at the phone breakpoint so their controls cannot
widen the document.

**Why.** The 270-degree demo gauge looked incomplete and did not match the live
report gauge. Cropped screenshots baked overlapping headers into the marketing
page and could not reflow when the card width changed. Moving the verdict out of
the ring prevents long labels from colliding with the number at every gauge size.

**Alternatives considered**

| Option                                 | Why not                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Keep the 270-degree speedometer arc    | The owner prefers the clock treatment, and the two styles made scores look unrelated.          |
| Re-crop the existing WebP screenshots  | A fixed image can reproduce the same overlap at another width and cannot respond to text size. |
| Patch each screenshot with new artwork | Maintains two visual implementations and lets marketing previews drift from product UI again.  |
| Put verdict text inside the ring       | Long verdicts compete with the score and label, especially at the 84px and 120px sizes.        |

---

### D-045 · Allow scoped Vercel Previews and preserve report error truth

**Chosen.** The API CORS allowlist keeps the configured canonical frontend and
also accepts HTTPS origins belonging to PropScout deployments under the owner's
Vercel project namespace. The saved-report client returns `null` only for API
404/410 responses; network and unexpected server failures produce a separate
temporary-unavailable state.

**Why.** The corrected Preview API URL still could not load a known report even
though the same endpoint returned it directly. Response headers proved that the
API always emitted the production origin, so the browser rejected Preview
requests. The client then swallowed that network error and falsely said the
report had expired or never existed. Both behaviours prevented honest
pre-merge end-to-end verification and misrepresented a service outage as data
loss.

**Alternatives considered**

| Option                                      | Why not                                                                                 |
| ------------------------------------------- | --------------------------------------------------------------------------------------- |
| Set `FRONTEND_URL` to the current Preview   | Breaks browser access, redirects, and PDF rendering for `propscout.ca`.                 |
| Allow every `*.vercel.app` origin           | Grants credentialed CORS access to unrelated Vercel projects.                           |
| Add only the current branch alias           | The next branch or immutable deployment URL would fail again.                           |
| Keep returning `null` for every fetch error | Tells users their report is gone when the service or browser connection is unavailable. |

**Limit.** The CORS change takes effect only after the API branch is deployed.
The Vercel frontend variable was corrected and its Preview rebuilt, but Preview
cannot complete a browser E2E run against production API until this backend
change ships.

---

### D-046 · Use one full-width listing-type bar in every mode preview

**Chosen.** Each landing-page report preview starts with the same 30px,
full-width listing-type bar. The three compact previews use one fixed 194px
canvas, and the small investor clock splits “Deal score” and “/ 100” across two
centered lines inside a 92px ring.

**Why.** Inline chips produced three different apparent header widths and made
the cards look unrelated. The investor's longer one-line score label exceeded
the usable width inside the dial, while its taller content made that preview a
different height from its neighbours.

**Alternatives considered**

| Option                                | Why not                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------- |
| Give each chip the same fixed width   | A fixed chip still reads as a tag rather than a consistent card header. |
| Make only the investor preview taller | Preserves the uneven row the owner identified.                          |
| Shrink the label onto one line        | The text becomes too small before it fits comfortably inside the ring.  |
| Move `/ 100` outside the dial         | Separates the scale from the score it explains.                         |

---

### D-047 · Derive live tenant advice only from listing-specific evidence

**Chosen.** Live tenant checklists use the scraped listing and its fired risk
flags. A bedroom-window question appears only when the analysis found an
unverified-bedroom, glass-door-bedroom, or no-exterior-window flag. Negotiation
targets start at the observed comparable-range low rather than three percent
below it. A scraped parking-space count remains “confirm” until the listing data
proves it is included in rent. SunScout describes low sky openness even when
modeled direct-sun loss rounds to zero, and it states that buildings with unknown
heights were omitted. Annual savings use the asking rent minus each end of the
target range, so the negotiation and monthly-cost sections agree.

**Why.** The real one-bedroom Yonge Street run inherited a demo-only “second
room” question. It also proposed $1,900 when the lowest observed comparable was
$1,959, and called the skyline effectively open beside a 14% openness reading.
Each statement went beyond or contradicted the available evidence.

**Alternatives considered**

| Option                                               | Why not                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Keep one generic demo checklist for every report     | It introduces room and amenity claims that may not apply to the listing. |
| Keep a 3% below-range negotiation anchor             | No observed comparable supports that number.                             |
| Treat a nonzero parking-space count as included      | The scrape proves the count, not whether the landlord charges extra.     |
| Calculate savings from the width of the target range | That does not measure savings from the rent the tenant was asked to pay. |
| Describe obstruction only from lost direct-sun hours | A zero rounded loss can coexist with a heavily obstructed sky dome.      |
| Treat buildings without recorded heights as low-rise | Their heights are unknown, so the report cannot make that claim.         |

---

### D-048 · Preserve explicit tenant facts and label modeled proximity honestly

**Chosen.** Strict deterministic phrases such as “Includes Parking and Locker”
now confirm those amenities in a live tenant report, while utilities and other
lease terms stay unknown. Nearby amenities show straight-line distance without
inventing drive time. Saved tenant reports pass their analysis token to
SunScout so the user can replace its south-facing default with the real facade
direction. School copy names only the EQAO data that is present and states that
attendance boundaries are not verified. Empty listing sections distinguish “No
supported flags” from “Viewing required.” Unsourced light-demand marketing and
inactive rent-alert and personal-buy controls are removed or labeled unavailable.

**Why.** The Yonge Street listing explicitly includes parking and a locker, but
the report discarded both claims. Its location section converted straight-line
distance into a supposed drive time using a fixed 30 km/h speed. Its school
footer claimed Fraser rankings and highlighted catchments even though every
Fraser value was null and boundaries are not ingested. SunScout exposed its
direction control in other saved report modes but omitted it from the tenant
page. The conversion area also promised monitoring and local valuation actions
that had no working handler or Ontario sales source.

**Alternatives considered**

| Option                                                 | Why not                                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| Treat any parking or locker mention as included        | A mention does not prove that the amenity is part of the monthly rent.      |
| Keep the fixed-speed drive-time estimate               | It ignores the road network and traffic while presenting a precise minute.  |
| Keep Fraser and catchment copy as future-facing UI     | It describes data the current report does not contain.                      |
| Leave SunScout permanently on the south-facing default | The actual facade is knowable by the user and materially changes the model. |
| Give both empty sections “Not enough detail”           | The two states have different causes and different next actions.            |
| Keep inactive forms as visual previews                 | Users can reasonably believe a submitted email started real monitoring.     |

---

### D-049 · Keep side-score stickiness only while the hero is side by side

**Chosen.** Tenant, personal-buyer, and landlord side-score cards remain sticky
above 900px, where they occupy a separate column beside the property visual. At
the existing 900px one-column breakpoint, their position becomes static and the
top offset is cleared. The score can still be ordered before the photos on
smaller screens, but it scrolls away as ordinary content.

**Why.** Inline sticky positioning survived the responsive grid collapse. Once
the photo column moved underneath the score, the full score card stayed pinned
for the height of that photo column, making the images visibly travel behind it.
The sticky relationship is useful only while the two columns are actually side
by side.

**Alternatives considered**

| Option                                           | Why not                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| Remove sticky positioning at every width         | The desktop side-by-side card can remain visible without covering media. |
| Raise the score card's background or z-index     | This hides the symptom while preserving the obstructive scroll behavior. |
| Move photos above the score on all small screens | It changes the established score-first reading order unnecessarily.      |
| Use JavaScript to toggle position on resize      | CSS already owns the grid breakpoint and cannot drift out of sync.       |

---

### D-050 · Collapse the schools grid on phone widths

**Chosen.** The tenant schools section keeps three columns above 640px and
collapses to one column at and below 640px.

**Why.** Its fixed three-column grid relied on each track's minimum content
width. At 375px, the third column began beyond the viewport and widened the page
by 84px. One full-width column keeps school names, board labels, distance, and
quality readable without horizontal scrolling.

**Alternatives considered**

| Option                                      | Why not                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| Force three narrower columns at every width | School names and the card footer would become too narrow to read.         |
| Hide horizontal overflow on the whole page  | A global mask could conceal unrelated responsive defects elsewhere.       |
| Use a horizontally scrolling school row     | Core report content should read in the document's normal vertical scroll. |

---

### D-051 · Align rent-marker tooltips inward at the chart edges

**Chosen.** The rental-comps marker keeps its centred tooltip through the middle
60% of the range. Within the outer 20% on either side, the tooltip aligns inward
from the marker and moves its pointer to match.

**Why.** On the live Yonge Street report, the asking rent sat near the high end
of the comp range. Its visually hidden tooltip still extended past the 375px
viewport and widened the whole document by six pixels. Edge-aware positioning
keeps the tooltip available on hover and keyboard focus without creating
horizontal page movement.

**Alternatives considered**

| Option                                           | Why not                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| Hide horizontal overflow on the whole page       | It masks future responsive defects and can clip legitimate focused UI. |
| Remove the marker tooltip on phones              | Touch and keyboard users would lose the exact asking-rent explanation. |
| Make every tooltip left- or right-aligned        | Middle markers read most clearly when the label remains centred.       |
| Shorten the tooltip text until it happens to fit | Copy length is not a reliable layout constraint across viewports.      |

---

### D-052 · Preserve empty report sections and disclose rent-comp provenance

**Chosen.** Empty tenant sections keep the same `data-section` identifier as
populated sections so the report rail and audit tools can still reach them.
The rent-positioning and market-evidence sections name Rentals.ca, Kijiji, and
PadMapper as nightly asking-rent sources and state whether the result came from
the first three postal characters or a widened radius search.

**Why.** Missing evidence is part of PropScout's conclusion and should remain a
first-class section rather than disappear from navigation. The live report also
showed a precise comp median and count without telling the reader whether those
records were sample data, sold leases, or current asking rents. Provenance and
geographic scope are necessary to judge how much confidence to place in the
range.

**Alternatives considered**

| Option                                       | Why not                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| Omit identifiers from empty states           | Navigation then skips the sections where the report admits missing proof. |
| Describe the source only as “market data”    | It does not let a reader distinguish asking rents from completed leases.  |
| Always claim the comps are from the same FSA | The API widens to a radius when the FSA has no usable records.            |
| Call the feeds comparable leases             | The records are scraped listing asks, not verified signed lease amounts.  |

---

### D-053 · Treat zero listing tax as unknown and canonicalize municipality names

**Chosen.** A scraped annual-property-tax value counts as known only when it is
greater than zero. A `$0` Realtor.ca value is stored as unknown, and the analysis
uses the existing conservative city-rate estimate. Realtor.ca city labels with a
parenthesized neighbourhood, such as `Toronto (Yonge-Eglinton)`, are reduced to
their municipality for tax rates, CMHC vacancy data, and Toronto municipal land
transfer tax. The analysis route also recognizes the suffixed form so reports
already saved under it remain correct when recalculated.

**Why.** The live Hillsdale listing published `$0` tax and called its city
`Toronto (Yonge-Eglinton)`. Accepting both literally removed all property tax
from operating expenses and all Toronto MLTT from closing costs. Each error made
the investment look better than the available evidence supports.

**Alternatives considered**

| Option                                                   | Why not                                                                    |
| -------------------------------------------------------- | -------------------------------------------------------------------------- |
| Accept `$0` whenever Realtor.ca publishes it             | A zero placeholder does not establish a legal tax exemption.               |
| Leave tax unknown in the calculation                     | The calc engine requires a value and zero would understate carrying costs. |
| Use the Ontario default rate for suffixed Toronto labels | A municipality-specific rate is already available and more accurate.       |
| Fix only newly scraped city names                        | Existing saved listings with the suffix would still omit Toronto MLTT.     |

---

### D-054 · Persist effective tax provenance and use Toronto's actual MLTT brackets

**Chosen.** Completed analyses persist the annual property tax used by the
calculator and whether it was estimated. Personal and investor reports use that
same value for their itemized costs, label estimates for verification, and keep
older reports compatible when the fields are absent. The web calculator now
uses Toronto's municipal LTT brackets independently from Ontario's provincial
brackets.

**Why.** After the backend correctly replaced Hillsdale's `$0` placeholder with
a city-rate estimate, the personal page still printed `$0/yr` and the investor
expense rows omitted tax because both recalculated from the raw listing. The
Toronto cash-to-close card also claimed `$72,750` in total LTT while its own
provincial and municipal rows summed to `$72,000`; the schedules diverge between
`$55,000` and `$400,000` and cannot be modeled by simply doubling provincial
tax.

**Alternatives considered**

| Option                                        | Why not                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| Let each page estimate tax independently      | Rates and provenance could drift from the backend calculation.                  |
| Replace the raw listing tax with the estimate | It would present an inferred value as a scraped listing fact.                   |
| Hide tax whenever the listing omits it        | Monthly totals would still need a value and could silently disagree.            |
| Model Toronto MLTT as equal to provincial LTT | The bracket schedules differ and produced contradictory totals on this listing. |

---

### D-055 · Keep displayed units and Toronto-tax copy aligned with the calculation

**Chosen.** Personal-school footers describe EQAO composites as values out of
100, matching the cards and stored data. The Toronto financing control says it
adds municipal LTT using Toronto's bracket schedule. The saved investor report
uses the persisted effective tax and its provenance rather than a separate
raw-listing mapper.

**Why.** The Hillsdale audit showed 90.0/100 school cards followed by “out of
10,” and an MLTT control claiming municipal tax doubled the provincial amount
after the calculator was corrected to the actual municipal schedule. A second
investor mapper also kept rendering an unknown tax as zero after the shared
mapper had been fixed.

**Alternatives considered**

| Option                                           | Why not                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| Convert stored EQAO composites to a 0–10 display | Every card and score calculation already uses the 0–100 composite. |
| Keep “doubles provincial” as shorthand           | It is numerically false wherever the two bracket schedules differ. |
| Maintain separate tax logic in both mappers      | The paths had already drifted and produced contradictory reports.  |

---

### D-056 · Show school distance as measured and let financing presets wrap

**Chosen.** Real personal-buyer school cards show the stored straight-line
distance and label it “straight-line.” They omit drive time until a routing
source supplies one. Financing preset buttons wrap onto another line when the
available card width is too small.

**Why.** The personal report converted school distance to a precise “1 min
drive” using a fixed two-minutes-per-kilometre multiplier even though no route
was queried. At a 310px app viewport, the four financing presets also widened
the document by 36px and caused horizontal scrolling.

**Alternatives considered**

| Option                                       | Why not                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| Keep the drive time with an “approx.” prefix | A fixed multiplier still ignores streets, crossings, and traffic.      |
| Hide school distance entirely                | The straight-line distance is real and useful when clearly identified. |
| Clip or horizontally scroll the preset row   | The buttons fit cleanly when normal flex wrapping is enabled.          |

---

### D-057 · Collapse investment metric tiles before their content overflows

**Chosen.** The investment metric grid switches from four columns to two below
701px, and every tile may shrink within its grid track. The personal-buyer
checklist follows section 07 as section 08 now that the unused comparable-sales
map is not rendered.

**Why.** A six-viewport audit found that the DSCR and break-even tiles widened a
640px page to 647px while every other tested sale-report width fit. The same
audit exposed a visible section-number jump from 07 to 09 on the personal
report. Both defects came from desktop assumptions that no longer matched the
rendered report.

**Alternatives considered**

| Option                                     | Why not                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| Hide horizontal overflow on the report     | It would conceal clipped values and future responsive defects.           |
| Shrink the metric labels and values        | The report would become harder to read while still depending on content. |
| Collapse every two-column utility at 700px | Only the investment metric grid failed at that width.                    |
| Keep section 09 as a placeholder for a map | A reader should not see a missing section number for absent content.     |

---

### D-058 · Keep provider sample sales out of local market claims

**Chosen.** When Repliers returns its Tacoma sample coverage, the investor card
is titled “Provider sample sales,” its count says “provider sample sales,” and
the empty appreciation card states that no local series is connected. Investor
and personal reports name Teranet, Statistics Canada, or a trend period only
when the corresponding value actually came from that source; an empty value
instead says that no source or result is connected.

**Why.** The Hillsdale report correctly warned that the Tacoma rows were sample
data while the same card called them “verified sales” under “What sold nearby.”
The adjacent all-dash card also attributed nonexistent values to Teranet and
public MLS. Those labels could make a reader treat demo coverage as Toronto
evidence despite the warning.

**Alternatives considered**

| Option                                      | Why not                                                              |
| ------------------------------------------- | -------------------------------------------------------------------- |
| Keep the local headings beside the warning  | Contradictory labels make the provenance warning easy to misread.    |
| Hide the Tacoma rows                        | They remain useful for exercising the UI when plainly identified.    |
| Fill appreciation from the two Tacoma sales | Two unrelated sales cannot establish a Toronto appreciation series.  |
| Always show the Teranet attribution         | A source should be named only when the displayed value came from it. |

---

### D-059 · Remove inert promises and decorative placeholder metrics

**Chosen.** The STR preview states that revenue figures are unavailable and no
longer renders a blurred metric grid or an inactive notification button. The
personal report removes inactive agent-email and referral buttons, describes
the missing integrations, and gives its investment action a working route back
to the analyzer. An empty investor risk scan is amber and says only that no risk
language was found in the listing description.

**Why.** The live sale audit found controls that promised email, referral, and
notification actions but had no handlers or connected service. It also found a
green “No red flags” result based only on description parsing. Interface
decoration and reassuring copy must not imply data or capabilities that the
product does not have.

**Alternatives considered**

| Option                                       | Why not                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| Leave the controls enabled for visual polish | A working-looking control is a product claim, even before a backend exists. |
| Disable the same buttons without explanation | It would still leave the reader guessing why the action cannot run.         |
| Keep blank blurred STR tiles                 | Decorative metrics imply a modeled result where no source is connected.     |
| Treat an empty wording scan as a pass        | Listing copy cannot clear inspection, title, flood, or building risks.      |

---

### D-060 · Treat zero parking as unknown until the source proves absence

**Chosen.** Every report mapper renders `parkingSpots <= 0` as
“— parking · not provided.” A positive count is still shown normally. The
upstream schema should eventually carry explicit parking provenance so a
verified zero can be distinguished from a missing value.

**Why.** The live Buttermill sale returned zero in the normalized field without
evidence that the listing said there was no parking. The personal report turned
that ambiguous default into the factual claim “None.” The current API shape does
not expose a `parkingKnown` flag, so zero cannot safely support that claim.

**Alternatives considered**

| Option                                     | Why not                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| Continue treating zero as no parking       | The normalized default does not prove the listing explicitly reported zero. |
| Infer parking from the building or address | That would fabricate a listing fact from a plausible association.           |
| Hide the parking field                     | The reader should see that this due-diligence item is still unresolved.     |
| Add `parkingKnown` in this UI fix          | Correct long term, but it requires scraper, API, and stored-schema changes. |

---

### D-061 · Codex is the only unattended builder; Claude builds only with an explicit acknowledgement

**Chosen.** `.agent-loop/config.json` sets `defaultBuilder: "codex"`. `init --builder claude`
is refused unless the operator also passes `--acknowledge-unsandboxed-claude-builder`, and the
choice is written to the task state and decision record as `builder_sandboxed: false`. The
coordinator additionally: bootstraps each worktree (`npm ci` plus a per-worktree Python venv)
before the first round; treats the task time cap as hard (per-turn and per-gate timeouts are
derived from the remaining budget, and gates past the deadline are skipped); takes the lock on
`approve` and `reject`; validates reviews against the JSON schema including
`additionalProperties: false`; resolves every citation at the candidate SHA; logs gate stdout and
stderr on failure; removes lanes created by a partially failed `init`; runs Black and Flake8 as
gates; and resolves npm `.cmd` shims on Windows to `node <entry>.js` rather than a shell.

Second-pass hardening after Codex's counter-review of the first: gates and bootstrap run with
an allowlisted environment and under a process-tree-killing timeout wrapper; the test-only
environment seams are refused without `--allow-test-seams`; shim resolution rejects traversal and
checks the real path; citations must have an ordered line range; the state-record write is inside
the `init` rollback; no promotion starts past the deadline. POLICY.md now states that **gates run
candidate code outside every sandbox** and that the loop is not unattended in the security sense
until bootstrap and gates run in a container — a limit no code change here removes.

Third pass, after Codex's review of the second: a failed tree kill is a failed run (exit 125,
not a silent wait); descendants are swept on every exit path, so a detached grandchild does not
survive its parent's successful exit; the wrapper's grace is reserved inside the budget rather
than added after the deadline; `.cmd` shims resolve only from npm's global prefix, never `PATH`;
`doctor` refuses a redirected repository before touching it. Codex's two "failing tests" were
not reproducible on the host (49/49, three runs) and are consistent with `taskkill` being denied
inside Codex's own sandbox — which is exactly the silent-failure case the first fix removes.

Fourth pass (Codex verdict: merge for supervised trials; three residual P2/P3s, all landed): a
model turn that cannot fit in the remaining budget stops for a human instead of being clamped to
1 ms and granted the grace; a sweep that cannot run or cannot kill fails the run even when the
child exited cleanly; kill and snapshot helpers are individually bounded inside the grace;
PowerShell runs with `PSModulePath` pinned to the inbox modules; `npm prefix -g` ignores ambient
`NPM_CONFIG_*`.

First observed real run (2026-09-11), three stops before the builder produced anything, none
visible to the fixture suite: the venv used Python 3.14 (pins have no wheels; now `py -3.11`);
the 3-hour cap counted calendar time (now run time); `codex exec` 0.125 had no
`--ask-for-approval` flag. Fourth stop, after the builder had correctly identified the five
functions to fix: Codex's Windows sandbox is off by default, so `workspace-write` ran read-only and
every patch was rejected. The coordinator now passes `-c windows.sandbox="unelevated"`, verified to
deny writes outside the worktree and all outbound network; doctor checks the resolved mode.

Second real run: bootstrap, the builder turn, the candidate commit and all ten gates (~1m50s) ran
clean on a real change for the first time. The fifth stop was the first real reviewer turn:
`claude --print --json-schema` validates its argument with a draft-07 validator and rejects the
`"$schema": …draft/2020-12` URI the schema file declares. The coordinator now drops that key for
the Claude call only (the file, Codex's `--output-schema` and the coordinator's own validator are
unchanged) and reports an `is_error` envelope from the CLI as the CLI's message instead of a JSON
parse failure. Neither path had coverage: the fixture suite replaces both CLIs.

Sixth stop, on the resumed review: the terminal `claude` had never been signed in on the machine
(its credential file held empty tokens; the desktop app authenticates separately), yet doctor showed
every check green because `--version` proves installation, not access. Doctor now runs
`claude auth status` and `codex login status` — both offline and deterministic — and fails on
either.

**The loop then closed a task end to end, unattended** (task `docstring-args-returns`, PR #29):
Codex built at `bf488ce`, the coordinator committed candidate `08d9482`, ten gates passed in ~1m50s,
Claude reviewed that exact SHA read-only and accepted with no findings, and the coordinator
fast-forwarded to `05d9166`. One round, no disputes, no human gate. 6m40s of charged run time
across the six stops. Two things the fixture suite could not have told us: the reviewer's
`--allowedTools` denies `Bash(python -m black …)` and an `awk` line-length check, so the reviewer
reasoned about formatting rather than measuring it (the `python format` gate had already passed
outside the sandbox, so this cost nothing here); and Black hangs inside Codex's unelevated sandbox —
multiprocessing appears to be blocked — so the builder cannot self-check formatting and correctly
reported that as incomplete rather than claiming a pass.

**Why.** The Codex lanes run under an OS-level sandbox (`--sandbox workspace-write` /
`read-only`, networking off). The Claude builder’s tool allowlist is not a boundary:
`Bash(npm run *)` and `Bash(python -m pytest *)` execute files the builder can `Write`, and the
path policy runs only after the turn. The first review of the loop described the Claude lane as
bounded; the counter-review showed it was not, and a system that is unattended must not depend
on a control that a model can route around. The other hardening items were each a concrete way
the first implementation could either not complete a round (no dependencies in the worktree)
or could overstate what it had checked (schema, citations, deadline, lock, logs).

**Alternatives considered**

| Option                                             | Why not                                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Keep Claude as default and widen protected paths   | Raises the cost of an escape; does not close it. Documented as insufficient in POLICY.md. |
| Remove the Claude builder entirely                 | Useful when attended, and for an eventual external-sandbox run; keep it behind a flag.    |
| `shell: true` to launch npm-installed CLIs         | Reintroduces argument interpolation the loop was written to avoid.                        |
| Rely on lint-staged for Python formatting          | Coordinator commits use `--no-verify`; the hook never runs on candidate commits.          |
| Declare readiness from unit tests of policy/claims | They never drove a round. Readiness is now defined by the fixture e2e suite (8 paths).    |
| Add a token or monetary cap                        | Neither CLI exposes one the coordinator can enforce; documented as a known limit.         |

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

---

### D-062 · Break-even appreciation is reported; the score stays untouched

**Chosen.** A new `calculations/hold_case.py` computes, for 5/10/20-year holds, the **minimum**
annual price growth required to return every dollar the hold consumes — deposit, purchase closing
costs and every monthly shortfall — after discharging the mortgage and **before the costs of
selling**. It reaches the investor report as a card under the equity chart, labelled "at least".
It does **not** feed the deal score.

**Selling costs are excluded rather than assumed.** The first version of this used a 5%
commission and a flat sale legal fee, marked unsourced. The owner's instruction was to remove
anything not confirmed, and commission is the clearest case of that: it is negotiated per deal,
not regulated or published, and the result is sensitive to it. Excluding it makes every figure a
floor, which is the safe direction to be incomplete in only if the report says so — so the copy
reads "a year, at least", states that a real sale costs money, and explains why no number is put
on it. A test asserts the page never prints a commission figure of its own.

That is the same call as D-019 (SunScout reports "a floor on how much shade there is, not a
ceiling" rather than assuming heights for untagged buildings) and D-011/D-058 (omit rather than
estimate). Note the asymmetry that makes labelling essential: an unlabelled floor _understates_
the bar a deal has to clear, which is the direction that flatters it.

**Why.** `docs/product-audit/INVESTOR_METHOD_RESEARCH.md` established that a shortfall is not
automatically a loss: "A $1,000 monthly shortfall is not automatically a $12,000 annual economic
loss if the mortgage balance falls by more than $12,000. It is still a $12,000 annual **liquidity
requirement**." The report could show a deep negative cash flow and a hard-pass verdict with no way
for a long-term holder to see whether paydown covers it. The audit listed this as owner decision
#4 and it was never recorded; this entry settles the narrow part of it.

On the calibration property (−$2,126.82/mo) the numbers are the argument: **at least 1.91%/yr over
5 years, 1.45% over 10, 0.75% over 20**. The same property needs well over twice the annual growth
over five years that it needs over twenty.

**The presentation risk, and what was done about it.** 1.01% a year reads as _this deal is fine_
until you see that reaching year 20 takes **$669,890** of cash, none of which earns anything in
this model, in equity that cannot be spent until sale. The rate is therefore never rendered
without the cash beside it, the copy says plainly that breaking even is not a return, and a test
asserts the cash line appears for every rate. This is the same failure mode as D-004: a number
that is individually true and collectively misleading.

**What it deliberately does not do**

| Decision                                        | Why                                                                                                                                                       |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does not change the deal score or verdict       | Spec §10 requires the score to be reproducible from property and financing alone; D-037 makes the backend its sole authority.                             |
| Does not credit positive cash flow against cost | A surplus reducing the cost basis would let strong rent flatter the required rate. Surplus contributes zero; the figure stays conservative.               |
| Does not clamp negative rates to zero           | A property that can decline and still return the cash is a real, favourable result. Hiding it would only ever understate the good case.                   |
| Does not say whether the rate is achievable     | No local appreciation series is connected (D-058). Stating a required rate is arithmetic; judging it would be invention.                                  |
| Does not model rent or expense growth           | That is the full hold-case engine (IRR, NPV, equity multiple) the audit proposes. Labelled "at today's rent and costs" rather than implied.               |
| Does not assume any selling cost                | Commission is negotiated, not published. The figure is a floor and says so; no commission knob exists on the function, so one cannot be quietly supplied. |
| Does not ask the user for a hold period         | The 5/10/20 snapshots already exist for the equity chart, so the two read against each other and the change needs no new input.                           |

**Alternatives considered**

| Option                                                                             | Why not                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full strategy lens (Income-first / Balanced / Appreciation-led) changing the score | What the audit actually recommends, and still open. It needs a `score_version` bump, spec §10 changes, recalibration against real Ontario properties and the "Income fundamentals" rename — weeks, and a decision of its own. |
| A declared "max monthly contribution" input                                        | Adds a field and a persisted value to answer a question the derived figure already answers without asking. Revisit if users ask to model reserves.                                                                            |
| Compute it client-side beside the equity curve                                     | The equity curve is slider-live; cash flow on the live report is not (it comes straight from the API). A client-side break-even would mix live paydown with stale cash flow — one number describing two scenarios.            |

**Known limit.** Because selling costs are excluded, the gap between the reported floor and a
real break-even is exactly the owner's own cost of selling — on a $730k property a 4–5%
commission is roughly $30k, which over a ten-year hold is around 0.4pp of annual growth. The
report says the figure is a minimum; it cannot say by how much.

**Revisit if** a local appreciation series is connected — the report could then place the required
rate against what the area has actually done, which is the single thing that would make this figure
actionable rather than merely honest.

---

### D-063 · The live report's sliders recompute every financing-dependent metric

**Chosen.** `ReportPage` now derives its metrics by feeding the API's NOI-stable values through
`computeDemoMetrics` and then `enrichMetrics`, so a slider move recomputes the mortgage payment,
cash flow, DSCR, cash-on-cash, break-even rent, cash-to-close, LTT, OSFI, the equity curve and
break-even appreciation. `useInvestorReport` already did exactly this for its own live path; the
page was duplicating the wiring and got it wrong.

GRM is **not** financing-dependent — it divides by price, not by the loan — so it passes through as
the engine calculated it.

> **Corrected by D-067.** This entry originally said the same of NOI and cap rate. That holds for
> the down payment, the rate and the amortization, but not for the management-fee toggle, which is
> an operating expense inside NOI. This change therefore left that one desynced; D-067 fixes it. The deal score still does not move: sliders
> explore the numbers, they do not re-grade the deal (D-037).

**Why.** `enrichMetrics` spreads the API's metrics through untouched, so cash-to-close, LTT and the
equity curve tracked the sliders while cash flow and DSCR stayed at whatever financing was
submitted. Dragging down payment from 20% to 50% produced a page showing a 50%-down cash-to-close
beside a 20%-down cash flow, with nothing saying the two described different scenarios. The comment
above the code claimed all of them were live, and the demo routes — which call `computeDemoMetrics`
— genuinely were, so live and demo disagreed. No test covered slider-driven recomputation on the
live path, which is why it survived.

**The prerequisite, found on the way in, and the reason this is one change and not two.** The
client calculator divided the annual rate by twelve. That is the US convention; the Interest Act
requires semi-annual compounding for Canadian fixed-rate mortgages, and the calc engine has always
done it correctly. On the Vaughan property the client said $3,342.48/mo against the engine's
$3,326.64 — $15.84 a month, $4,751 over the amortization — and the client was wrong. Making the
report recompute locally _without_ fixing that would have switched every metric onto the wrong
convention: live but wrong, which is worse than stale but right. Fixed first, and both calibration
mortgages are now pinned against the engine's values with the annual/12 answer asserted absent.

**Verification that the recompute is faithful.** With the conventions aligned, the client
reproduces the engine exactly on the test fixture — municipal LTT $10,323, cash to close $169,776,
cash flow −$1,493.31, DSCR 0.5511. A test asserts the page shows the engine's figures at the
submitted financing, so the recompute cannot silently shift the numbers merely by loading.

**A fixture that had been hiding a second inconsistency.** `INVESTOR_ANALYSIS` described a Toronto
property (55 Front St, M5J) with `lttMunicipal: 0`, a $2,600 payment and −$800 cash flow — none of
which that property could produce. The page had therefore been showing Toronto's municipal LTT in
its bracket table while omitting it from cash to close. The fixture now carries the engine's own
figures, and the D-039 double-count guard asserts against both the old double-count and the new
one that the extra LTT could create.

**Alternatives considered**

| Option                                                    | Why not                                                                                                                                                                |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Re-run the analysis through the API on each slider move   | What `useInvestorReport` does for its own live path, but `/r/:token` is a shared report a viewer may not own; re-running would mutate stored analysis on their behalf. |
| Label the sliders exploratory and leave the metrics stale | Honest, and smaller, but spec §6 promises live recalculation on every slider move, and the mixed-scenario page is the actual defect.                                   |
| Keep the API's LTT rather than recomputing it             | The LTT table was always client-computed, so the total disagreeing with the table was the inconsistency. Recomputing both makes the section agree with itself.         |
| Take break-even appreciation from the API                 | It depends on every slider. Held at the submitted financing it would describe a different scenario from the cash flow printed beside it — the bug, reintroduced.       |
| Leave the mortgage convention alone for now               | It is the load-bearing input. Recomputing on top of it would have spread a wrong payment across every live metric.                                                     |

**Known limit, deliberately accepted.** Break-even appreciation now exists twice — `hold_case.py`
and `computeBreakEvenAppreciation` — which is the drift D-054 and D-055 record. The mitigation is a
test pinning the TypeScript result against the Python regression floors (1.91% / 1.45% / 0.75%),
so the two cannot diverge silently. The same tripwire now covers the mortgage payment, which had
already drifted before anyone noticed.

---

### D-064 · The account page shows the user's own data, or says it has none

**Chosen.** `AccountPage` no longer carries fixture data. Identity comes from the Supabase session
and `GET /me`; usage comes from a real count; saved analyses and invoices are honest unavailable
states. `/me` now returns `analysesThisMonth` (using the existing `getMonthlyAnalysisCount`) and
`createdAt`. A new `useAccount` hook holds the wiring, and everything it returns is either real or
null — a null renders as an unknown, never as a plausible value.

> **Correction (D-071).** "Usage comes from a real count" was true of the query and false of the
> data: at the time of this decision no analysis had ever been attributed to a user (`user_id` was
> null on every row — see D-071), so the figure was a real query over an empty set and read 0 for
> everyone. It was still not a fixture, but it was not the user's usage either. D-071 makes it so.

**Why.** This was the audit's first P0 and the counter-review's first implementation step. Three
separate fabrications were shown to any signed-in user as their own record:

| Fixture          | What it claimed                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `USER`           | A name, email and join date belonging to nobody ("Marcus Reilly", March 2026).                           |
| `SAVED_ANALYSES` | Eight analyses with real Toronto and Vaughan addresses, scores, verdicts, "3 hours ago" and open counts. |
| `INVOICES`       | Three "Investor Pro · monthly · $10.00 · **Paid**" rows — a payment history for users who never paid.    |

**It also drove the paywall, which is what makes it worse than a cosmetic fixture.**
`remaining = freeLimit - SAVED_ANALYSES.length` rendered "You've saved **8 of 10** on the free plan
· 2 slots left", and the upgrade nudge fired at `>= freeLimit - 2` — so the invented history
manufactured scarcity against a limit the user had not touched, and pushed them toward paying for
it. A fabrication that shapes a purchase decision is a different class of problem from one that
merely looks untidy.

**Two contradictions found while removing it**

- `TIER_DETAILS.free.cycleNote` said "3 reports/mo" while `FREE_TIER.MONTHLY_ANALYSIS_LIMIT` and
  `CLAUDE.md` both say 10. It now reads from the constant, so the product cannot state two
  allowances. **Which number is right, and enforcing it server-side, remains open** (R-02): the
  limit is still referenced nowhere in the request path, so nothing rejects an analysis past it.
- Both paid tiers claimed "Renews May 24, 2026". Stripe holds the real renewal date and the billing
  portal is one click away, so the note points there rather than naming a day.

**Saved analyses say "not available", not "none yet".** There is no save-to-account feature — the
"Save" control on a report opens sign-in or the upgrade modal — and no endpoint lists a user's
analyses. "You haven't saved any" would imply the user could have and didn't. The copy instead
explains that every report keeps a 30-day share link, which is true and actionable. Same
distinction as D-052 (an empty result is not an absent source) and D-059 (no inert controls).

**Reporting usage is not enforcing it.** `analysesThisMonth` is a display fix. It is noted in the
`/me` docstring and in this entry so a later reader does not mistake it for an entitlement change.

**Alternatives considered**

| Option                                              | Why not                                                                                                                                      |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Build the saved-analyses feature now                | A real feature (endpoint, ownership, pagination, deletion) behind a P0 that is about not lying. The empty state removes the harm today.      |
| Keep the fixtures behind a `DEMO` flag              | One wrong deploy flag away from showing invented financial history again, and the landing page already has a sanctioned demo surface.        |
| Render the quota as 0 when `/me` fails              | Zero is a claim that the user has run none. Null has to stay distinguishable from zero, which is why the hook and the route keep them apart. |
| Fetch invoices from Stripe and render them properly | Right eventually, but it needs a new authenticated endpoint; the portal already shows them and "Manage plan" already opens it.               |
| Fix the "3 reports/mo" copy by editing the constant | That decides the entitlement question by accident. The display now follows the constant; the decision stays open and visible.                |

**Known limit.** Three integration tests asserted the fabricated content (the Buttermill address,
"Marcus Reilly", and filter chips over the fake rows) — they were pinning the defect in place.
They now assert the honest states and that each fabricated string is absent, so a future reviewer
reading only the tests cannot conclude the fixtures were load-bearing.

---

### D-065 · A share token is a viewing capability, not proof of ownership

**Chosen.** Writes to `/analysis/:token/overrides` now require a session whose user owns the
analysis: 401 without one, 403 when the caller is not the owner. Reads stay token-scoped. `GET
/analysis/:token` accepts optional auth and returns `canOverride`, and the report renders the
Dismiss/Restore controls only when it is true. An analysis with no owner is never writable.

**Why.** This was the last open P0. The route's own docstring described the defect as the design:
_"Anyone with the share token can manage overrides for that analysis — same trust model as viewing
the report."_ But viewing and rewriting are not the same trust model. A dismissal is forwarded to
the calc engine on the next `POST /analysis`, which drops that flag's deduction — so a recipient
could change the **stored deal score** of someone else's property analysis. The report's own
comments call the score "one source of truth"; this let a third party edit it.

**Why an unowned analysis is refused rather than open.** `createPendingAnalysis` sets no user and
`saveAnalysis` accepts `userId: null` — anonymous analyses are a real flow, and they get a 30-day
expiry where owned ones never expire. For those, nobody _can_ prove authorship: the only
credential is the token every viewer holds. Treating "no owner" as "unowned, so anyone may write"
would have preserved the hole for exactly the analyses least able to defend themselves. The cost is
that an anonymous user cannot dismiss flags on their own report — accepted, because the alternative
is an authorization check that anyone can satisfy.

**401 and 403 are not interchangeable here.** Authentication is checked _before_ the analysis is
looked up, so an unauthenticated prober gets 401 for real and fake tokens alike and learns nothing
about which tokens exist. And a non-owner gets the same 403 whether the analysis belongs to someone
else or to nobody — distinguishing them would tell a link-holder whether the report has an account
behind it.

**RLS could not have done this.** `flag_overrides` has row-level security enabled, but the API
holds the service-role key, which bypasses it. The check has to be in the route; the RLS only
protects against direct client access.

**A bug in the first implementation, caught by the test rather than review.** The guard originally
returned `reply.code(401).send(...)` and the handler branched on `denied != null`. `send()`
resolved to `undefined`, `undefined != null` is false, and so the route **sent a 401 and then
performed the write anyway**. The test caught it only because it asserted the service call had not
happened, not merely the status code — a 403 that still writes is the original defect with a better
status code. The guard now returns a plain `Denial` value and the handler sends it, so an
authorization gate never depends on a framework's return-value semantics.

**Verified by negative control**, not just by passing: with the server guard bypassed 10 API tests
fail; with the client's `canOverride` reverted to the old `token != null`, 3 report tests fail.

**Alternatives considered**

| Option                                                        | Why not                                                                                                                                        |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep writes open but scope them per viewer                    | Every viewer's private dismissal set is a bigger feature than the P0 needs, and the owner's score would still be the thing being argued about. |
| A second secret "edit token" alongside the share token        | Invents a credential system when sessions already exist, and the edit token would leak the same way the share token does.                      |
| Enforce with RLS instead                                      | Impossible as deployed: the service-role key bypasses RLS.                                                                                     |
| Let the client keep deciding `canOverride`                    | The client cannot know ownership without asking, and a client-side gate is decoration — the API was accepting the write regardless.            |
| Allow writes on unowned analyses so anonymous users keep them | That is the vulnerability, restricted to the analyses with no owner to protect them.                                                           |
| Return 403 for unknown tokens too, for symmetry               | Would confirm to a prober that authentication was the only thing standing between them and the analysis; 401-before-lookup reveals less.       |

**Known limits.** `resolveUser` was extracted because overrides would have been the fifth inlined
copy of the same JWT block; `/me`, both billing routes and the PDF route still carry their own and
should migrate, which is a refactor rather than part of this fix. And the honest consequence of
this change is a capability removed from anonymous users — if that matters, the answer is letting a
signed-in user claim an analysis they created, not loosening the check.

---

### D-066 · The password reset form sends the email

**Chosen.** `PasswordResetRequestPage` calls `resetPasswordForEmail`. The confirmation is shown
only when the send succeeds; a failure surfaces the error; an address that cannot be one is
rejected before any call; the button shows progress and cannot be double-submitted.

**Why.** The submit handler was `onClick={() => setSubmitted(true)}`. It rendered "Reset link
sent. If that address is in our system, you'll get an email shortly" without calling anything, so
a user locked out of their account was told help was on the way and nothing happened. They would
wait, check spam, and try again — with the same result. It is the smallest fix on the audit list
and the most directly harmful thing still outstanding after the P0s, which is why the
counter-review put it second.

**Wire rather than remove, because the rest of the chain already worked.** `resetPasswordForEmail`
existed and was correct. `/auth/reset/confirm` was fully wired — it calls `updatePassword`,
validates length and match, and surfaces errors. Only this one call was missing, so wiring it
completes a working feature rather than exposing a half-built one. Removing the form would have
stranded the confirm page with no way to reach it.

**The confirmation deliberately does not say whether the address exists.** "If that address is in
our system" is kept verbatim. Supabase returns success either way, and a reset form that
distinguishes "sent" from "no such account" is an account-enumeration oracle. The honest-looking
alternative ("we've emailed you") would be a stronger claim than the product can make.

**Errors are not swallowed into the confirmation.** Reaching the success state regardless of
outcome is precisely what made the page lie, so `{ error }` from the service now blocks it. A rate
limit or an unconfigured auth client is visible instead of being reported as a sent email.

**What the test does, and what the old test did not.** The two existing tests asserted the
headline and the button label — both passed against the broken page, because a page that renders
the right words and does nothing satisfies them. The new test asserts `resetPasswordForEmail` was
**called with the typed address**, which no assertion on the confirmation text can substitute for:
the old code showed that text too. Verified by negative control — restoring
`onClick={() => setSubmitted(true)}` fails five of the six.

**Alternatives considered**

| Option                                                | Why not                                                                                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Remove the form until auth is finished                | Auth is finished; only this call was absent. Removing it would orphan a working confirm page and a working service function. |
| Show the confirmation regardless, and log failures    | The defect exactly. A user cannot act on a server-side log.                                                                  |
| Say "we've emailed you" instead of "if that address…" | A stronger claim than Supabase's response supports, and it turns the form into an account-enumeration oracle.                |
| Validate the address against the users table first    | Same enumeration problem, plus a new endpoint, to save a wasted email.                                                       |
| Leave validation to the browser's `type="email"`      | Does nothing on a programmatic click and gives no message; the inline error is what a locked-out user needs.                 |

---

### D-067 · The management fee changes NOI, because that is what it is

**Chosen.** The calc engine echoes `management_fee_included` — the state it actually used — and the
report restates NOI by exactly the fee when the user's toggle disagrees with it. Cap rate follows
NOI, and every metric derived from NOI (cash flow, DSCR, cash-on-cash, break-even rent) follows
with it. The expense table is unchanged; it was already right.

**Why.** Audit finding R-01. `computeExpenses` recomputes the expense rows in the browser from the
live toggle, while NOI comes from the backend, which ran with management **off** by default and
never reported which state it used. Ticking "Include 8% management fee" therefore added the fee to
the expense rows and moved nothing else: on the reviewer's figures, $22,020.50 of expenses beside
an NOI of $7,139.50 on $27,000 gross rent — a **$2,160 contradiction, exactly 8% of gross rent**.
A reader summing the rows could not arrive at the NOI printed beside them, which is the arithmetic
the product sells.

**This is partly a regression I introduced.** D-063 made the sliders recompute every
financing-dependent metric and stated that "NOI, cap rate and GRM are NOT financing-dependent —
they divide by price, not by the loan." True of the down payment, the rate and the amortization;
false of the management toggle, which is an operating expense inside NOI. So the slider fix left
this one desynced and the claim in D-063 is wrong as written.

**The invariant, now asserted.** Gross rent minus every expense row equals NOI. It holds because
the engine deducts vacancy from income while the table lists it as an expense — algebraically the
same — so the two presentations are interchangeable _only_ while they agree about management. A
test pins the identity for both toggle states and both baseline states, which makes this class of
drift a test failure rather than a reading exercise.

**NOI is adjusted, not re-derived.** Only the one term that changed is added or removed. The full
NOI formula stays in the calc engine, so this does not become a third place where the same
arithmetic lives (D-054, D-055).

**A correction to the earlier triage.** This item entered the working list as "the expense table
implies NOI of $20,652 against the engine's $22,000, a $1,348 gap". That figure was wrong: it came
from a test fixture that paired a hardcoded NOI with an estimated tax from a different property.
Re-derived from the real calibration inputs, the table reconciles to the cent with management off.
The defect is real but it is the management fee specifically, not a general mismatch.

**Alternatives considered**

| Option                                                      | Why not                                                                                                                                               |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hide the management row unless the saved NOI included it    | Keeps the page consistent by removing a control the spec asks for (§6, "management fee 8%, toggleable"), and the reader still cannot model it.        |
| Re-run the analysis through the API when the toggle changes | Correct, but the toggle is an exploration control and `/r/:token` is a shared report a viewer may not own — the same reason D-063 recomputes locally. |
| Recompute NOI from its parts in TypeScript                  | A third implementation of the NOI formula. Adjusting by the single changed term needs no duplicate of the whole calculation.                          |
| Infer the baseline from the default instead of echoing it   | `include_management_fee` defaults to false today, so it would work — until a request carries it, at which point the page is silently wrong again.     |
| Leave it and document the discrepancy                       | It is a number contradicting another number on the same screen, which is the failure mode this codebase keeps finding (D-004, D-039, D-058).          |

**Known limit.** The restatement assumes the fee is 8% of gross rent in both layers;
`PROPERTY_COST_ESTIMATES.MANAGEMENT_FEE` now mirrors the engine's `MANAGEMENT_FEE` and the
reconciliation test fails if they diverge, but they are still two constants rather than one source.

---

### D-068 · Polling stops after three minutes and says so honestly

**Chosen.** `AnalyzingPage` bounds its poll loop at three minutes, measured from a timestamp rather
than a tick count, and then shows a state distinct from the error state: _"This is taking longer
than it should… the analysis may still finish on its own, or it may have stopped — we can't tell
from here."_ The user can check again (resumes polling, starts no second analysis) or start over.

**Why it could run forever, which is worse than the audit's framing.** The audit recorded "failed
analysis can poll forever". The mechanism is that **failure is never recorded at all**:
`updateAnalysisStatus` in the API is a **no-op**, and `getAnalysisStatus` derives state purely from
whether `calculated_metrics` is set — null reads as `'pending'`. So the route's four
`updateAnalysisStatus(token, 'failed')` calls do nothing, the client's `status === 'failed'` branch
is unreachable, and a run that died server-side leaves a row that says "pending" indefinitely. The
page polled it every two seconds for as long as the tab stayed open, with a progress bar implying
work was happening. That is every failure, not an edge case.

**Why the copy does not say "failed".** We stopped checking; we do not know that it failed, and it
may still complete. "Analysis could not complete" is the existing error state and is a stronger
claim than the page can support. The two states are separate and a test asserts they never
substitute for each other.

**Measured in wall-clock, not ticks.** A background tab throttles `setInterval`, so a tick count
would mean a different real bound depending on whether the user watched the page.

**What is deliberately NOT fixed here: the server half.** The audit's item is "persist analysis
status **and** bound polling". Persisting it needs a `status` column on `analyses` — the table has
`created_at` but no status and no `updated_at` — and schema changes are a human gate
(`humanGatePaths` in `.agent-loop/config.json`, and CLAUDE.md §4). Writing a migration nobody
applies would add a second unapplied file to the one already sitting in `supabase/migrations`
(`20260701_add_schools_name_postal_unique.sql`), so the schema would describe something that is not
true. Tracked separately instead.

**And why not infer staleness from `created_at` server-side.** Tempting, and it needs no migration:
metrics null plus a row older than N minutes is almost certainly dead. Rejected because a user can
re-trigger an analysis on an existing token — `triggerAnalysis` runs on every visit to the page —
so an old row with work genuinely in flight would be reported as timed out while it was running.
That trades an infinite wait for a false failure, which is the worse error.

**Alternatives considered**

| Option                                              | Why not                                                                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Cap the number of polls instead of the elapsed time | A throttled background tab would then wait far longer than three minutes, or a foreground tab far less. The bound must be wall-clock. |
| Show the error state on timeout                     | Claims the analysis failed. It may be running; we only know we stopped asking.                                                        |
| Navigate home on timeout                            | Discards the token, so a run that does finish becomes unreachable.                                                                    |
| Keep polling but slow down (backoff)                | Still unbounded, and a page that quietly polls for an hour is the same defect with a smaller bill.                                    |
| Infer staleness from `created_at` on the server     | False "timed out" on a legitimate re-trigger. See above.                                                                              |

**Known limit.** Three minutes is a judgement call against a pipeline that takes roughly 25–60
seconds (scrape, calc engine, narrative). It is generous rather than tuned; if the pipeline gets
slower the bound needs revisiting, and the test that asserts polling continues right up to the
bound is what will catch it.

---

### D-069 · A report renders the listing it was computed from

**Chosen.** `saveAnalysis` and `updateAnalysisByToken` store the listing as `listingSnapshot`
inside `market_data`, and `getAnalysisByToken` renders that snapshot in preference to the joined
`listings` row. Analyses saved before this fall back to the join.

**Why.** `listings` rows upsert on `source_url` (D-028 made that deliberate for scraped listings:
re-analysing the same page should not create a duplicate row). But `analyses.listing_id` is a
foreign key and `getAnalysisByToken` selects `'*, listings(*)'`, so the report rendered whatever
that row says **now**, while `calculated_metrics`, `deal_score`, `risk_flags` and the narrative are
frozen at analysis time.

So: someone analyses a listing at $729,900 and shares the link. The price drops, anyone re-analyses
the same URL, and the row is overwritten. The original report now shows **$650,000 in its header
and chips beside a cap rate, cash flow, DSCR and land-transfer tax computed from $729,900** — with
nothing on the page indicating the two disagree. Beds, taxes, condo fee, photos and year built
move the same way. It needs no malice and no bug: it is the normal path for any property analysed
twice, which is exactly what a price-drop watcher does.

**The snapshot goes in `market_data`, not a new column.** That jsonb blob is already where
`sunScout`, `holdCase`, `schools` and `comparableSales` live, so this needs no migration — and
migrations are a human gate (D-068 has the same constraint). The trade is that the snapshot is not
queryable as columns; nothing queries listings through analyses today, and if that changes it
argues for a proper `analysis_listings` table rather than for reading live rows again.

**A second thing it fixes.** `analyses.listing_id` is `ON DELETE SET NULL`, so a deleted listing
made `getAnalysisByToken` return null and an issued share link 404. With a snapshot the report
outlives its listing row, which is what a point-in-time report should do.

**What this does not do.** It does not tell the reader the live listing has since changed. That
would be genuinely useful — "this listing was updated after your report was made" — but it needs a
comparison and a definition of what counts as a change, and it is a feature rather than the
correctness fix. Deliberately out of scope; noted rather than silently skipped.

**Alternatives considered**

| Option                                                        | Why not                                                                                                                                         |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Insert a new `listings` row per analysis instead of upserting | Reverses D-028's deduplication and multiplies rows for every re-analysis of the same page; the rental-comp and dedupe indexes assume otherwise. |
| Version the listings table (`valid_from` / `valid_to`)        | The correct long-term answer and a real schema change — human-gated, and much larger than the defect.                                           |
| Copy only price into the analysis                             | Taxes, condo fee, beds, year built and photos all feed the metrics or the page. Half a snapshot is a subtler version of the same contradiction. |
| Show the live row and flag it as changed                      | Presents figures the analysis never used as though they were its inputs, and the flag would have to explain away the whole page.                |
| Re-run the analysis when the listing has changed              | Silently rewrites a report someone already read and shared, and on a share link the viewer may not own it.                                      |

**Known limit.** Existing analyses have no snapshot and keep the old behaviour — there is no
backfill, because the data to snapshot retrospectively is exactly the data that was overwritten.
They degrade to the current join, which is the best answer that still exists for them.

### D-070 · The landlord page renders no fixture when given a real analysis

**Chosen.** `LandlordPage` keeps its demo route unchanged, but every path that showed Harbour
Street data regardless of props is now driven by the analysis it is given: rent positioning comes
from `analysis.rentalComps` (via `shimToLandlordRentComps`), the slider bounds derive from that
range instead of a fixed $2,500–$3,800, the "individual listings" card says the listings are not
available rather than listing eight invented units under "Your building · live", the verdict hero
renders the analysis narrative — or, when there is none, a fallback built from the property's own
numbers — and the Harbour Street prose is gated behind an explicit `demo` prop. Live financing
inputs are derived from the analysis (real `isToronto`, rate and amortization) instead of the
demo's Toronto/3.49%/30%-down defaults. When the analysis has no comparables, the section says
so and the hero has no gap line.

Separately, `MiniMap`'s SVG placeholder no longer scatters five invented rents around the
subject pin. Every live report without coordinates or a Mapbox token was showing "$2,850 …
$3,200" comps that never existed; the placeholder now shows only the pins it is given.

**Why.** Audit L-02: the page's props permitted real data but three things read the fixture
unconditionally, so routing live landlord traffic to it would have promoted a latent P2 to a live
P1 — a real property's report naming two units in a building it is not in, at rents no one
measured. The audit's own remedy was "remove fixture dependencies before, or atomically with,
routing". This is the "before".

**What this deliberately does not do: route live landlord traffic here (L-01).** Two reasons.

1. **L-03 is an open owner decision.** The backend computes the investor acquisition score for
   every mode. A landlord who already owns the unit is not underwriting a purchase; "cash to
   close", "OSFI stress test" and "land transfer tax" are the wrong questions, and the 76/100 is
   an acquisition verdict wearing a landlord label. Routing before that is decided would trade a
   report that is honestly the investor view for one that looks landlord-specific and is not.
2. **`LandlordPage` lacks the plumbing the live investor path has gained since it was built** —
   break-even appreciation (D-062), owner-only flag overrides (D-065), NOI/management-fee
   reconciliation (D-067) and the D-054/D-055 slider recomputation contract. Routing would
   regress those for landlord users on the same day it fixed L-01.

So the page is now safe to route; whether to route it, and what a landlord score means, are put
in front of the owner rather than decided in a fixture-removal change.

**Alternatives considered**

| Option                                                   | Why not                                                                                                                                         |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Route live landlord traffic in the same change           | Above — L-03 undecided, and the page would lose D-062/D-065/D-067 behaviour the investor branch already has.                                    |
| Keep the fixture units as "illustrative" with a caption  | An eight-row table of addresses and rents reads as data whatever the caption says; the audit's complaint was exactly this.                      |
| Keep the placeholder map's demo pins on demo routes only | Needs a flag threaded through `ListingVisual`, `PropertyHero` and both page heroes for five decorative labels in a map that says "placeholder". |
| Synthesise `liveListings` from the P25/P50/P75 aggregate | Fabricates individual comps from a summary — the thing this change exists to stop.                                                              |
| Delete the demo route                                    | It is the design-fidelity reference for the landlord report and the only place the section set can be reviewed end to end today.                |

**Known limit.** With `rentalComps` present the positioning bar still labels its range "Lower
end / Typical / Upper end" from a P25/P50/P75 the shim sets to low/mid/high — the analysis exposes
a range, not percentiles, and the labels are a reading of that range rather than a claim of
percentile precision.

### D-071 · The free tier is ten analyses a month, counted and enforced at the API

**Chosen.** Ten analyses per UTC calendar month for a signed-in free-tier account, enforced in
`POST /analysis` before the pipeline runs. Tenant mode is exempt (spec §4 makes it unlimited on
every tier) and Pro, Professional and Team are unlimited. The eleventh request returns
`402 FREE_LIMIT_REACHED` with `{ used, limit, resetsAt }`, and the analyzing page renders the
existing `HardLimitGate` from those figures, with a working "Upgrade now" that starts Pro checkout.
The spec's feature matrix and the landing page said three; both now say ten, and the landing copy
reads the constant so it cannot drift again. The owner's call (audit list item #4, "go with 10").

**What had to be built first: attribution.** `FREE_TIER.MONTHLY_ANALYSIS_LIMIT` was referenced
nowhere in a request path — but the deeper reason it could not be enforced was that **no analysis
was ever attributed to anyone**. `createPendingAnalysis` wrote no `user_id`; `POST /scrape` and
`POST /analysis` read no session; the browser sent none. Every row in `analyses` had `user_id`
null. Three things followed:

- `getMonthlyAnalysisCount` existed and was correct, and always returned 0.
- The account page's "N analyses this month" (D-064) was always 0 — corrected in place above.
- The owner-only override policy (D-065) had no owners: on the live site, nobody could dismiss a
  flag on any report, because no report belonged to anyone. That policy was right; this is what
  makes it apply.

So the browser now sends the session with the trigger, and `claimAnalysisForUser` sets `user_id`
and the chosen `report_mode` on the row — **only if it is unowned**. A share link is not a transfer
of ownership; re-triggering someone else's token matches zero rows and steals nothing.

**Order of operations.** Check, then claim, then run. The check happens before the pipeline
because the pipeline is what costs money (scrape, calc engine, two Claude calls). The claim
happens before the pipeline so a run that dies mid-way still counts: the quota is on analyses
_started_. Counting only completions would let a failing upstream hand out free retries.

**The window is the UTC calendar month**, from one helper (`lib/billingMonth.ts`) that both the
count and the reported `resetsAt` read, so the gate can never show a reset date the count
disagrees with. Not a rolling 30 days: the account page says "resets monthly", the Stripe cycle is
monthly, and a rolling window makes "when can I run another one" a question with no plain answer.

**The client sends the session before triggering, and waits for it.** `AuthProvider` reads the
stored session asynchronously; firing the trigger on mount ran every signed-in user's first report
as a guest. `AnalyzingPage` now holds until `loading` is false.

**Alternatives considered**

| Option                                           | Why not                                                                                                                                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Three a month, as the spec matrix said           | The owner chose ten. Three was in the spec's matrix and landing copy; ten was in both constants files, CLAUDE.md and the account page. One number had to win and it was their call.    |
| Enforce at `POST /scrape`                        | The mode is not known yet, so tenant could not be exempted; and scraping a page the user then abandons at the mode modal would burn quota on a report that never ran.                  |
| Enforce client-side from `/me`                   | The audit's point exactly: "the client should render the server decision". A quota in JavaScript is a suggestion.                                                                      |
| Count completed analyses only                    | Hands out free retries whenever the pipeline fails, and the row exists either way.                                                                                                     |
| Attribute at scrape time instead of trigger time | Would also need the session on `/scrape` and `/address`; attributing where the mode is chosen and the cost is incurred needed one change and gives the same ownership.                 |
| Downgrade an invalid session to guest            | Silently runs an un-ownable, uncounted analysis for someone who believes they are signed in. 401 tells them; the client only sends a token it holds as current.                        |
| Rolling 30-day window                            | No reset date to print, and "resets monthly" on the account page would be false.                                                                                                       |
| Meter guests by IP                               | IPs are shared (offices, carriers, VPNs) and trivially rotated. The existing 10 req/min IP rate limit bounds abuse; a per-IP monthly quota would lock out a whole office for one user. |

**Known limits.**

- **Guests are not counted.** The limit is per account; a guest has none. Signing out and running
  as a guest is therefore a bypass. The spec's answer for guests — "one free analysis with email
  capture" (§5) — is a separate feature, not built here; when it is, it needs its own gate.
- **Analyses run before this change have no owner** and are not in anyone's count. There is no
  backfill because there is nothing to backfill from.
- **The count is on `created_at`, which is the scrape time, not the trigger time.** A listing
  scraped on the 31st and triggered on the 1st counts in the earlier month. Rows are created
  seconds before they are triggered, so this is a boundary curiosity, not a loophole.
- `HardLimitGate`'s `onUpgrade` is optional only for the design-review mount in `App.tsx`; every
  live mount must wire it.

### D-072 · One rule for a fact the source did not provide

**Chosen.** `Listing.beds`, `baths` and `parkingSpots` are `number | null` on both the API and
the web, where `null` means the source did not provide it. Readers treat `0` the same way. One
module — `apps/web/src/lib/listingFacts.ts` — turns a count into what the report says
(`bareCount`, `countLabel`, `bedBathLabel`), and every report shim calls it instead of deciding
for itself. The address path stores what its form did not collect as `null`; the scrape path
keeps the scraper's `null` for parking instead of coercing it to `0`; the row reader passes
`null` through instead of `?? 0`.

**Why.** Audit P2 #9: unknown-fact preservation had become piecemeal rather than absent. D-030
fixed the build year in one note, D-053 fixed taxes in one mapper, D-060 fixed parking in every
mapper — each right, each a different rule in a different place. Meanwhile the API type said
`beds: number`, so `POST /address/start` stored a blank bathroom field as `0`, the row reader
turned a null into `0`, and the investor hero printed **"2 bed · 0 bath"** for a property whose
owner never said how many bathrooms it had. The same unknown was "0 bath" on one report,
"Not listed" on another and "—" on a third, and nine separate `parkingSpots > 0` checks were the
only thing between a stored zero and a rendered claim.

**Why 0 is treated as not provided.** The Realtor.ca scraper writes `0` when the bedroom or
bathroom count is missing from the page (`beds_raw = … or "0"`), and every row stored before
this decision holds `0` for "absent". A zero therefore cannot be told from a gap, on either path.
"— bed" is a floor; "0 bed" is a claim — the same reasoning D-060 gave for parking, now applied
to every count instead of one. The cost is that a genuine studio renders "— bed" until the
scraper carries a `beds_known` flag the way it already carries `taxes_known`, `condo_fee_known`
and `year_built_known`. That is the right place to fix it, and it is out of scope here: the
scraper is a separate service and the contract must hold for the rows that already exist.

**What the engine sees.** The calc engine's `PropertyInput` requires integer `beds`/`baths` and
uses neither in a calculation, so the route sends `?? 0` there as a schema placeholder. The
report renders the nullable `Listing`, never the engine payload. `fetchRentalComps` already
accepted `beds: number | null` and skips the bedroom filter for null — it was the one consumer
that had the contract right.

**Alternatives considered**

| Option                                           | Why not                                                                                                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep `number`, render 0 as "—" at each call site | Nine call sites already did that for parking and none for baths; this is the piecemeal state the audit named. The type has to say what the data means.                 |
| Add `bedsKnown` / `bathsKnown` flags end to end  | The right long-term shape (the schema already has three such flags) but it needs the scraper to emit them and a migration to store them — a human gate, larger change. |
| Render 0 as "Studio" for beds                    | A claim the source may not have made; the scraper's `or "0"` makes it unknowable today.                                                                                |
| Require bathrooms on the address form            | Would remove one source of unknowns while leaving the rendering rule as scattered as before; and a person genuinely may not know.                                      |
| Backfill stored zeros to null                    | Cannot distinguish the genuine zeros; reader-side tolerance gives the same result without touching rows.                                                               |

**Known limits.** A genuine zero (studio, no parking) renders as not provided until the scraper
proves it. `sqft` and `yearBuilt` were already nullable and are unchanged; `annualTaxes` keeps
D-053's `> 0` rule, which this decision generalises rather than replaces.

### D-073 · The demo report and the live report render the same sections

**Chosen.** §02–§07 of the investor report — financing, rental comps, cash to close, OSFI, risk
flags, equity — are single components under `components/investor/`, and both the demo route
(`/investor-report`) and the live route (`/r/:token`) render them. The demo differs from the live
report only in where its data comes from. A parity test renders both pages and compares their
section outlines, and checks the specific things that had drifted.

**Why.** Audit P2 #10: demo/live divergence. Both pages carried their own copy of five sections,
and copies drift. By the time of this decision the demo — the page prospects are shown first —
was missing the break-even appreciation card shipped in #32 (D-062); itemised **"Legal fees",
"Title insurance", a $600 "Home inspection" and "Miscellaneous"** as cash-to-close line items,
none of which the analysis produces; reported "Passes GDS test" at a household income it never
showed, where the live page has an income input; and did not disclose a radius-widened comp
search. Every one of those is a claim the demo made that the product does not. Meanwhile the
live page asked "Does the deal _pencil_?" and then "Does the deal _pencil_ at your numbers?" as
consecutive section questions; the demo's distinct "How do the _numbers_ change?" was better and
both now use it.

**Which copy won.** The live implementation in every case: it is the one that has received
D-062, D-065 and D-067, and it is the one the customer pays for. Where the demo was better
(the §02 question) that wording moved into the shared component rather than the demo keeping a
private one.

**What is deliberately still separate.** The hero, the verdict block and the loading/error
states differ because their inputs genuinely do (a demo has no share token, no overrides, no
poll). The landlord and personal-buyer demo routes are not touched here — L-04 records that the
landlord demo and the live landlord view are different products, and that is bound up with L-03
(D-070), which is the owner's decision.

**Alternatives considered**

| Option                                                     | Why not                                                                                                                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Render the demo through `InvestorReportContent` outright   | It needs an `Analysis`, a token, an overrides hook and a session; synthesising all of those for fixtures is a second fixture layer with its own drift.   |
| Keep the demo's itemised closing costs as "typical" values | They are typical of nothing in particular and the analysis does not compute them; a demo that shows lines the product cannot produce is an overclaim.    |
| Snapshot-diff the two pages                                | A snapshot pins one page, not the relationship between two; the parity test compares the two renders directly so a change to either shows as their diff. |
| Delete the demo route                                      | It is the sanctioned marketing surface and the only way to see a full report without an analysis; it is now the same product, which is the point.        |

**Known limit.** The parity test compares section numbers and topics plus the specific contents
that had drifted; it does not diff every pixel. A future section added to one page and not the
other fails the outline; a copy edit inside a shared component cannot diverge, because there is
one component.

### D-074 · Financing presets are relative to what the analysis ran with

**Chosen.** `FinancingSliders` takes a `base` — the down payment, rate and amortization the
engine actually used — and expresses its presets against it: "Base" restores it, "OSFI" is the
B-20 qualifying rate for _that_ rate (`max(rate + 2%, 5.25%)`, from one shared `OSFI_STRESS`
constant `computeOSFI` also reads), "35% down" changes only the down payment, and "vs Base"
compares to it. The live report passes the analysis's financing; the demo routes keep the demo
assumptions by default. Two smaller findings from the same run: the hero printed **"0 sqft"** for
a size the source did not give (now "— sqft", the D-072 rule), and the OSFI card called a pass at
GDS 43.7% against a 44% limit _"comfortably under"_ (now states the figure and the margin, and
calls under two points a thin one).

**Why.** First end-to-end run on production (2026-09-12, Buttermill Ave via the address path).
Every headline figure reproduced independently — payment, cash flow, DSCR, cash-on-cash, OSFI
payment and GDS, five-year paydown, break-even appreciation — at the live 4.45% Bank of Canada
rate the engine had fetched. Then "35% down" was clicked and the payment went from $3,216 to
$2,703 while the rate label read **4.79% · vs Base +0.00%**: the preset carried a hardcoded
4.79% from the demo constants, so it silently replaced the rate the report was built on, and the
"Base" it claimed parity with was a number this analysis never used. The figures after the click
were internally consistent and wrong for the property.

**Alternatives considered**

| Option                                             | Why not                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Presets change only their named term               | Right for "35% down", but "Base" has to restore something, and "OSFI" is defined relative to a contract rate. |
| Drop the "vs Base" line                            | It is useful once it compares to the real base; the defect was the constant, not the comparison.              |
| Keep 4.79% and refetch the live rate in the slider | The analysis already carries the rate it used; the report must not disagree with itself about it (D-054/55).  |

**Also seen, not fixed here.** The analyzing screen says "Fetched listing from Realtor.ca" and
"Connecting to Realtor.ca…" for an address-entered property (audit J-09). Break-even rent is
defined as current rent minus current cash flow, which holds the vacancy allowance at today's rent
rather than the break-even rent — self-consistent with the cash-flow figure beside it, about
$140/mo low for this property, and a definition question rather than a bug.

### D-075 · The account page belongs to a session

**Chosen.** `/account` with no session renders a sign-in card ("Sign in to see your account")
and the sign-in modal — not the account shell. While the stored session is still being read it
renders nothing, so a signed-in user does not see the card flash. The sidebar's plan card now
shows the resolved tier rather than a hardcoded "free" (audit A-05).

**Why.** Seen on the first production run (2026-09-12): a signed-out visit to `/account` showed
the sidebar, an "Account · FREE" chip, and _"We couldn't load your usage just now."_ Nothing had
failed to load — no request was made, because there was no session to make it with. D-064 made
the page stop inventing data; this makes it stop describing the absence of a session as an error.

**Also from that run, recorded here because it is operational rather than code:** production
sign-in was broken because `VITE_SUPABASE_ANON_KEY` on Vercel held the anon key with the Mapbox
token concatenated onto it (Supabase's gateway answered 401 "Invalid API key" to every magic-link
request). Fixed by re-creating the variable as a Vercel _Config_ variable holding the publishable
key alone; `.env.example` and the README now say so. And Supabase's built-in mailer is limited to
a handful of auth emails per hour across all users — hit within minutes of testing — so custom
SMTP is required before anyone but the owner signs in.

| Option                                     | Why not                                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Redirect `/account` to `/` when signed out | Loses the intent; the person navigated to their account and should be offered the way in.           |
| Keep the shell and change the copy         | A plan chip and a sidebar for someone with no plan is the same false statement in a different font. |

### D-076 · The plan view shows only what is measured

**Chosen.** "This month's usage" on the Plan & billing tab shows one real figure — the
quota-consuming analyses the API counts (D-071), against the free limit — and puts **no number**
on tenant reports (unlimited, not counted), PDF exports (no counter exists) or saved analyses
(not a feature; the row is gone). The free-plan description reads the limit from the constant.
A missing price ID for a tier now raises `StripeNotConfiguredError`, so "Upgrade" answers 503
"paid plans are not open yet" rather than 500 "try again".

**Why.** First signed-in production run (2026-09-12). The user had run three analyses that
day and no tenant reports; the plan tab said **"Sale-listing analyses 2 / 3"**, **"Tenant
reports 8"**, **"Saved analyses 8 / 10"** and _"Three sale-listing analyses per month"_. These
were the same fixtures D-064 removed from the Saved tab, missed on this one — invented usage
against an invented limit, on the page where someone decides whether to pay. And "Upgrade"
returned 500. The secret key was set (the route's 503 path checks that), so the failure was
downstream; a missing `STRIPE_PRICE_PRO` threw a plain `Error` and read as a crash. Retrying a
missing environment variable cannot help; the honest answer already existed one branch up.

**Verified on the same run, for the record.** Attribution (D-071): "1 analysis this month"
after one signed-in run. Ownership (D-065): the owner sees Dismiss, dismissal persists, a stranger
on the share link sees the flag struck through with no controls, and an unowned guest report
offers no controls to anyone. Presets (D-074): OSFI gave 6.45% against a 4.45% base. Real Mapbox
maps rendered once the token variable was separated (D-075).

| Option                               | Why not                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------ |
| Count tenant reports and PDFs too    | Nothing counts them today; a number here would be another fixture with a different origin. |
| Render 0 when usage cannot be loaded | Zero is a claim (D-064); the row says "unavailable" and draws no bar.                      |

**Open, operational:** `STRIPE_PRICE_PRO` (and the other tiers) must be set on the API's
Railway environment before checkout can work; whether the key is live or test is the owner's call.

### D-077 · Report chrome tells the truth about who is looking and what is happening

**Chosen.** The report nav reads the session: a signed-in viewer gets **Account** (to
`/account`), a visitor gets **Sign in**, and on the live report that button opens the sign-in
modal instead of calling a no-op. "Share link" copies the URL and says so. Paid tiers get no
"Save to account" button, because there is nothing to save to (D-064); the free tier keeps the
locked control that explains the upgrade. The analyzing screen describes what the pipeline is
_attempting_ — "Looking up rental comps for the area" — not what it has _achieved_, and its
reassurance strip says three things that are true before the run finishes.

**Why.** Two things from the production runs of 2026-09-12.

The owner opened their own freshly-made report and the nav offered them **"Sign in"**; the
`ReportPage` passed `onSignIn={() => undefined}`, so it did nothing when clicked, and "Share
link" beside it had no handler at all. A control that does nothing is a claim (D-059), and a
sign-in prompt to a signed-in person is a false one.

The analyzing screen announced **"Fetched listing from Realtor.ca"** and **"Connecting to
Realtor.ca…"** for a property typed in by address (audit J-09), **"Price confirmed"** and
**"Comps pulled"** on a timer with no signal from the server, **"Rental comps verified"** for
figures that are asking rents and may be absent, and **"No data leaves your account"** while the
address goes to the geocoder, the comps and walk-score services and the model. The list still
advances on elapsed time — that is a progress indicator, not a log — but every line is now true
of an attempt, and the report says what actually came back.

| Option                                      | Why not                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Drive the step list from real server events | Needs persisted job status, which is a migration (BACKLOG); the copy fix removes the false claims now. |
| Keep "Save to account" as a disabled button | Disabled is still a promise of a feature; the account page already says it does not exist.             |

### D-078 · Auth pages report what the provider said, and an unconfirmed plan is not "free"

**Chosen.** Two audit items, both about the client presenting a guess as an answer.

_A-08 — the magic-link landing page._ `/auth/confirm` reads Supabase's error fragment first
(`#error=access_denied&error_code=otp_expired&…`) and says what it says — "expired or already
used; links work once and expire ten minutes after sending" — instead of showing "Signed in
successfully" on mount and then, six seconds later, guessing "may have expired". Without an
error it shows "Confirming your link…", checks for a session once as well as subscribing, and only
after fifteen seconds says it has **not heard back** — which is what it knows — with a way to check
the account or request a new link.

_A-10 — the tier._ `useTier` now returns a `status` (`signed-out | loading | resolved |
unavailable`) and retries once. The tier value still falls back to `free` when `/me` fails —
the gates need a value and the server enforces real entitlements — but `PaywallContext` carries
the status and a global `TierUnavailableNotice` says "we couldn't confirm your plan; paid features
may look locked until we can; nothing about your account has changed", with a retry.

**Why.** On the first production sign-in (2026-09-12) an already-used link landed on a page
that said "You're in · Signed in successfully" for six seconds and then "this link may have
expired", while the URL carried `otp_expired` the whole time. And a paying user whose `/me` call
failed would, until now, have been shown locks and upgrade prompts as fact — the placeholder
`free` was indistinguishable from an answer.

| Option                                                | Why not                                                                                                   |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Treat an unconfirmed tier as `pro` to avoid upselling | Unlocks free users' UI when the API blips; PDF then fails server-side with no explanation. Still a guess. |
| Block the whole app until the tier resolves           | A report is readable without knowing the plan; the notice is enough.                                      |
| Keep a short timer as the expiry signal               | A timer measures the network, not the link; the provider already reports the reason.                      |

### D-079 · The theme belongs to the person, not the page

**Chosen.** One app-wide theme store (`hooks/useTheme.ts`): first use reads the saved choice,
then the OS `prefers-color-scheme`, then light; every toggle writes `data-theme` on `<html>` and
saves the choice; every page's toggle calls the same store. Tests reset it between cases.

**Why.** Audit UI-04. Seven pages each held their own `dark` boolean and wrote the attribute
themselves. The landing page went further and re-applied its own `false` on mount, so navigating
home from a dark report flipped the whole app to light; a reload always came up light; and a
person whose OS is dark got a white flash regardless. A module-level store rather than a Provider:
pages and tests call `useTheme()` without wrapping, and there is exactly one writer of the
attribute the tokens read.

| Option                                       | Why not                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| A React Provider in `App.tsx`                | Every page and page test would need wrapping; the attribute is global anyway.          |
| Read `data-theme` from the DOM on each mount | What `AccountPage` did; it papers over the landing page's reset and remembers nothing. |
| OS preference only, no saved choice          | A toggle that forgets is worse than none.                                              |

### D-080 · Triggering an analysis is idempotent by token

**Chosen.** `POST /analysis` treats a finished analysis as an answer and a running one as
already started. A token whose metrics exist returns the stored report (`cached: true`) without
running anything and without touching the quota; a token running in this process answers
`202 processing`; only a token that is neither is claimed, counted and run. The in-flight mark
is held by the request that set it and released when that request ends, success or failure — a
request answered 202 never releases another's. The analyzing page also checks for an existing
report before it triggers, so a reload of a finished run goes straight to `/r/:token`.

**Why.** Audit J-11. Reloading `/analyzing` re-POSTs the same token, and every reload started a
second scrape, calc-engine call and two Claude calls, all racing to write the same row — and,
since D-071, would have re-checked the quota against a count that already included the row, so
an owner at their tenth run could be refused their own report.

**The scope of the guarantee is one process.** Job status is not persisted (D-068), so the
database can only say "no metrics yet" or "done"; an in-process set is what can honestly be
promised, and one API instance serves production. A second instance needs the status column in
`docs/BACKLOG.md`, at which point the set becomes a row-level claim.

| Option                                     | Why not                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Refuse a re-trigger of a finished analysis | The person reloaded; they want the report, not an error.                                         |
| Client-side guard only                     | A second tab, a retry button or a curl still re-runs the pipeline; the cost is server-side.      |
| Wait for the running request and return it | Holds a second HTTP request open for a minute; the page polls anyway, so 202 is the right shape. |

### D-081 · Schemas decide shape, handlers decide meaning; a flag override must name a flag on the report

**Chosen.** Every public route validates its params and body against a JSON schema
(`lib/requestSchemas.ts`) before the handler runs: strings are strings with a maximum length and,
for tokens and flag IDs, a pattern; numbers are finite and in range; unknown properties are
stripped. A validation failure is answered in the API's one error shape as `400 INVALID_REQUEST`
with the field named, by a handler registered inside each route plugin so the route tests see
production's behaviour. The API-wide body limit is 64 KB. And a flag override is accepted only
for a flag ID the analysis actually raised — otherwise `422 UNKNOWN_FLAG` — checked after
ownership, so a stranger learns nothing about the report's flags.

**Why.** Audit API-04 and API-05. Handlers defended themselves piecemeal: one checked
`typeof flagId === 'string'`, another `!token`, a third a bearing's range, and nothing bounded a
token's length, a URL's length, or a body's size, so a 2 MB "token" reached a database query and
an object where a string belonged reached a service. Flag IDs were any string, persisted as a
dismissal — meaningless for a flag the report never had, and a latent dismissal of any flag the
engine might emit under that id later.

**The division of labour is deliberate.** The schema answers "is this the right shape and
size"; the handler keeps answering "does this mean anything" with its own codes (`INVALID_MODE`,
`NOT_FOUND`, `UNKNOWN_FLAG`). Putting the enum for `mode` in the schema would have moved a
meaning question into a shape error and changed the code clients see for it.

**Fastify's defaults shape two edges, recorded rather than fought.** Its validator coerces
scalars (a bare `42` becomes `"42"`) and removes unknown properties rather than rejecting them;
both are fine here because a coerced scalar still has to pass the length and pattern, and a
stripped property never reaches a service. Its router caps a path parameter at 100 characters
before any schema runs, so an over-long token is a 404 and the pattern guards the rest.

| Option                                             | Why not                                                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Validate against the static `FLAG_LABELS` registry | The engine can emit an id the API only humanises; the report's own flags are the registry that matters.             |
| Put every check in the schema, drop handler codes  | Clients and tests would see `INVALID_REQUEST` for "mode we do not serve"; that is a meaning, not a shape.           |
| Reject unknown properties instead of stripping     | Fastify's default is to strip; changing it API-wide for no observed benefit is a behaviour change for its own sake. |

### D-082 · A property type the source did not give is "unknown", not condo or detached

**Chosen.** `PropertyType` gains `'unknown'`. The address form asks "What kind of home?" with
"Not sure" as the default and sends null for it; the API stores `unknown`; the row reader passes
an empty column through as `unknown`; the scraper's fallback for a type it cannot recognise is
`unknown`; readers render it as "Property type not provided" and put no chip in the hero. The
request schema accepts only our six types or null. The form also sends a blank bathroom count as
null (D-072 had made the API store null, but the form was still sending 0).

**Why.** Audit API-01 and API-03, confirmed open in the reconciliation pass. The address path
defaulted to `'condo'`, so every house entered by address was flagged "condo fee unknown" and
rendered with a Condo chip; the row reader defaulted to `'detached'` on the theory that it is
"the more common Ontario type" — a guess rendered as a fact, the D-072 rule applied to a string.
The engine branches on `property_type == "condo"` for exactly one thing (that flag); `unknown`
takes the non-condo path, which is the honest one, and the residual-expense table already had a
documented "unknown" value.

| Option                                    | Why not                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| Infer condo from a non-empty condo fee    | A fee is evidence, not a statement; the form now asks directly and the fee stays a fee.      |
| Keep `detached` as the row-reader default | The reader cannot know; "more common" is a prior, and the report presents facts.             |
| Make the type required on the form        | Some people will not know; the honest answer for them is "not provided", not a forced guess. |

### D-083 · One failed poll is not a failed analysis

**Chosen.** The analyzing page tolerates up to two consecutive failed polls and gives up on the
third (`POLL_MAX_CONSECUTIVE_FAILURES = 3`); a successful poll resets the count. A definitive
answer — `NOT_FOUND` or `EXPIRED` — still sends the user home at once. The three-minute wall-clock
bound (D-068) is unchanged and still governs the "taking longer than it should" state.

**Why.** Audit J-08. A poll is a plain GET every two seconds; one dropped request — a phone
changing networks, a Railway cold restart, a 502 from the edge — ended the whole flow with
"Something went wrong" while the pipeline was still running and would have finished seconds
later. The user then pressed "try again" and re-triggered work that D-080 now dedupes, but the
error was never true.

| Option                               | Why not                                                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Retry forever until the wall clock   | A dead API would show a progress bar for three minutes; three misses (six seconds) is enough to know. |
| Exponential backoff between retries  | The interval is already two seconds and bounded; backoff adds latency to the common "one blip" case.  |
| Treat 5xx as transient, 4xx as final | The only 4xx that matter are already handled by code; other 4xx on a GET by token are not expected.   |

### D-084 · A for-rent address asks for running costs only from the owner

**Chosen.** When the address form is switched to "For rent", the condo-fee and property-tax
fields are hidden behind one checkbox, "I own this unit — add its running costs". Unchecked, the
form sends null for both, even if something was typed while the form was still "For sale". The
for-sale form is unchanged. The hint under the fee reads for an owner ("comes out of the rent
before anything else") rather than for a buyer.

**Why.** A tenant does not pay either cost and usually does not know them; asking made the form
look like it was for someone else, and a guess typed in to get past it would have become a fact
(D-072). The mode (tenant / landlord) is chosen _after_ this form, so the form cannot branch on
it; the ownership question is the earliest point at which the fields make sense.

| Option                              | Why not                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------- |
| Ask the mode before the form        | Reorders the whole funnel (spec §5) to save one checkbox.                   |
| Hide the fields on for-rent, always | A landlord's report needs them; hiding them for everyone loses real inputs. |
| Keep the fields, reword the hints   | Still asks a renter for numbers they do not have.                           |

### D-085 · Obstruction shade from a minority of the skyline is "indicative", not "checked"

**Chosen.** `lib/sunCoverage.ts` computes coverage = buildings with a known height ÷ all nearby
buildings. Below `SUN_OBSTRUCTION_COVERAGE.INDICATIVE` (0.5) the SunScout panel's eyebrow reads
"Real surroundings · indicative" instead of "· checked", and the footnote says "Only 2 of 30
nearby buildings had a height on record … treat the shade figure as indicative". The hours
figure is still shown; it is still a floor. No change to the score or the engine.

**Why.** Audit counter-review: coverage was disclosed ("13 more had no height on record") but
nothing drew a line, so a result built from 2 measured buildings out of 30 carried the same
"checked" label and the same confident hours figure as one built from 17 of 20. The threshold is
a starting point; the surroundings dataset has no ground truth to calibrate it against yet, which
is why it lives in `constants/thresholds.ts` with that note.

| Option                                          | Why not                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Hide the obstruction result below the threshold | It is still true as a floor; hiding it loses information the footnote can qualify.               |
| Discount the score below the threshold          | A score change is an engine decision (spec §17) and needs calibration data first.                |
| Threshold on absolute count instead of share    | 2 of 2 is full coverage of a quiet street; 2 of 30 is not — the share is what the caveat is for. |

### D-086 · "Analyze another listing" goes to the input; the tenant crumb says when, not "refreshed"

**Chosen.** On every report, "Analyze another listing" navigates to `/`. The tenant hero's
freshness line reads "Analyzed 12 Sep 2026" from `analysis.createdAt` on a live report and
"Sample report" on the demo. `TenantListingData.analyzedAt` carries the time; the shim sets it.
The landlord hero's dead `href="#"` is `/`.

**Why.** Audit UI-03. Investor and tenant used `history.back()`, which from a share link left
the site; personal used a real link to `/`; landlord linked to `#` and did nothing. Four heroes,
three behaviours, one of them nothing. The tenant crumb also said "Refreshed 3 min ago" on every
report, live or demo — a live-data claim with nothing behind it (the same class as J-09).

| Option                                      | Why not                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Keep `history.back()` when there is history | Two behaviours for one label; the label says what it does.                                 |
| Show the comps' nightly refresh time        | The nightly job's schedule is unconfirmed (BACKLOG §2); the analysis time is what we know. |
| Drop the freshness line entirely            | When a report was produced is worth a few characters; it just has to be true.              |

### D-087 · Job status is persisted, and the code runs on either side of the migration

**Chosen.** `20260913_add_analyses_status.sql` adds `analyses.status` (pending / processing /
complete / failed), `status_updated_at` and `failure_code`. `updateAnalysisStatus` — a documented
no-op since the schema merge — now writes them, with the failure code the route already had
(`CALC_ENGINE_UNAVAILABLE`, `CALC_ENGINE_ERROR`, `RENT_OUT_OF_BOUNDS`, `INTERNAL_ERROR`); a retry
clears the code when it marks the row processing; a saved result marks it complete.
`getAnalysisStatus` reads `calculated_metrics` first (results are authoritative), then the
column. Both functions detect "column does not exist" (Postgres `42703`, PostgREST `PGRST204`)
and fall back to the old behaviour — derived two-state status, silent no-op write — so the API
can deploy before the owner applies the migration and nothing breaks in between.

**Why.** Audit J-06 / T-02: a run that died server-side left a row that read "pending" forever;
the analyzing page could only say "taking longer than it should" after three minutes (D-068).
Migrations are a human gate (`docs/agent-loop/POLICY.md`), so the code could not assume the
column; making it tolerant is what lets this ship now instead of waiting on the gate.

| Option                                            | Why not                                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Ship the code only after the migration is applied | Ties a code deploy to a dashboard action nobody can schedule from a PR.                 |
| Store status inside `market_data` JSON instead    | Avoids the migration but hides a queryable state in a blob; wrong shape for a job flag. |
| Treat "processing for > N minutes" as failed      | Still worth doing after apply; it is a heuristic and this row is the fact it needs.     |

### D-088 · The report carries a ledger of what its numbers rest on, and a default is called a default

**Chosen.** Every live report ends with a "Sources" section: one row per modelled number with a
basis (Observed / Published / Estimate / Default), a source, an as-of date where one exists, and
a one-sentence method. The calc engine echoes every constant it applied
(`AssumptionsAppliedOutput`) so the API never restates engine values from a copy; the API adds
the rate feed's source and fetch time, the comps' count and radius, and whether tax or value were
estimated, in `lib/assumptionLedger.ts`; the rows are stored with the analysis. The verdict
counts the defaults. The demo investor report shows the same section from a fixture (D-073). The
landing headline changed from "every number has a source, a date, and a method" to "every
assumption is listed with its source, date, and method" — the first was not true and the second
is what ships. The CMHC per-city table and the cap-rate table are labelled Default, not Published,
because their own files say they are placeholders.

**Why.** Audit product-claims table: the methodology claim was untrue of insurance (0.35%), the
maintenance bands, the $1,500 legal fee, the vacancy table. The choice was to build the ledger or
drop the claim; the ledger is what makes the claim honest without hiding that most of the
constants are still starting points. Labelling them is also the shortest path to replacing them:
each Default row says what would replace it (a quote, a bill, a refreshed table).

| Option                                          | Why not                                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Drop the landing claim and ship nothing         | The report still rests on unlabelled constants; the audit's point was the reader can't tell. |
| Per-figure badges inline in every section       | Fourteen sections to touch and a denser page; one ledger is findable and complete.           |
| Keep engine constants in the API for the ledger | Two copies drift; the engine already knows what it ran and now says so.                      |
| Call the CMHC / cap-rate tables "Published"     | Their files say placeholder; the ledger would be lying in the one place it must not.         |

### D-089 · Walk and Transit scores carry their fetch time

**Chosen.** `walkScoreService` stamps `fetchedAt` on a successful call; it is stored with the
analysis (`market_data.walkScore`), the neighbourhood tiles read "Very walkable · as of 13 Sep
2026", and the Sources ledger (D-088) gets a Published row "Walk / Transit Score — Walk Score API,
as of …". Fixtures and older analyses have no time and show none.

**Why.** Backlog "Walk Score source dates": the score is fetched once at analysis time and never
refreshed; a report opened months later was presenting it as current. Same rule as the tenant
crumb (D-086) — say when, not "live".

### D-090 · A scan that did not run is reported as such, never as clean

**Chosen.** The engine reports `extraction_status` — `ok`, `partial` (regex ran, the Haiku read
failed), `failed` (the pipeline raised), `no_text`. `extract_flags_with_haiku` gains
`raise_on_failure` so the router can tell a failed call from an empty result; the router still
never fails the analysis over it. The API validates the value and stores it in `market_data`
(no migration); `lib/scanState.ts` on the web turns flag count + text presence + status into one
of five states, and every flags section — investor/landlord §06, tenant §02, personal risks —
reads from it: "Scan did not run" / "Partial scan" with copy that says the section is unchecked,
and flags from a partial scan carry a note that they came from patterns alone. Reports saved
before this have no status and read as they did.

**Why.** Audit counter-review, left open after #60: a Haiku failure (no API key, a 429, a JSON
parse error) returned all-false flags and the report said "No risk language was found" — the
one sentence it must not say when nothing was read. #60 separated "no text"; this separates
"did not run".

| Option                                  | Why not                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| Fail the analysis when extraction fails | The rest of the report is still good; the rule is one section's failure never blanks it. |
| A column on `analyses`                  | Needs the migration gate; `market_data` already carries per-analysis facts.              |
| Treat a Haiku failure as `failed`       | Regex flags still fired and still deducted; `partial` tells the truth about both.        |

### D-091 · Pricing sells what exists, and every paywall control does something

**Chosen.** Pricing CTAs are wired: "Start free" opens sign-in (signed out) or goes to the
account (signed in); "Go Pro" / "Start Professional" open Stripe Checkout for that tier when
signed in and show the API's answer inline — today the 503 "paid plans are not open yet" (D-076)
— or open sign-in first; "Talk to us" is a `mailto:` to `VITE_CONTACT_EMAIL` when set and
otherwise the card says "contact channel not open yet". Features that are not built carry a
"planned" tag with a dot instead of a check: saved analyses, portfolio tracker, white-label PDF,
bulk analysis, priority refresh, seats, API access, portfolio reporting, onboarding. The
`UpgradeModal` "Upgrade now" button starts Pro checkout when signed in, sends a signed-out user to
the account's sign-in card, shows a failure inline, and is not rendered at all when nothing is
wired to it. The `HardLimitGate` design-review mount in `App.tsx` renders only in dev builds.
The "Share or export" feature card no longer says "save to portfolio".

**Why.** Audit J-03 and the paywall rows: the page sold four things that do not exist and had
five buttons with no handler. The owner ranked paywall work low, which is why this touches no
prices, tiers or feature sets — it only makes the existing page true. Tagging rather than
removing keeps the roadmap visible and leaves the build-or-drop decision where it belongs.

| Option                                   | Why not                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| Remove the unbuilt features from pricing | A product decision (the tiers are priced on them); "planned" is true today either way.  |
| Hide paid CTAs until price IDs exist     | A visible 503 with a real message is more honest than a page that looks unfinished.     |
| Hard-code a contact address              | Nobody has chosen one; an env var makes it a 30-second owner action, not a code change. |

### D-092 · A stated zero is a studio; an unstated count is a gap

**Chosen.** The scraper reports `beds_known` / `baths_known` — whether the page's dataLayer
actually carried the field. The API stores a count the page did not carry as null (D-072) and
keeps a stated 0; `bedsKnown` / `bathsKnown` ride on the `Listing` and therefore on the listing
snapshot the report renders (D-069), so no `listings` column is needed. `listingFacts.knownCount`
takes the flag: a known 0 is a count, an unknown 0 is still a gap. Reports render "Studio" for a
known zero-bedroom unit and "—" for an absent count, in the hero chips, the tenant facts and the
personal facts table. Rows stored before this and the address path (which asks for beds) carry
no flag and read exactly as before.

**Why.** BACKLOG §3 "`*_known` flags", planned as a migration: the parser used "0" for a missing
field, so a genuine studio (`bedrooms: '0'` on Realtor.ca) rendered "— bed". The snapshot already
carries every fact the report uses; putting the flag there closes the row without the human gate.
`type_known` from the same row is already covered by D-082 (`'unknown'` is the type's own
"not stated").

| Option                                 | Why not                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Add `beds_known` columns to `listings` | Needs the migration gate; the snapshot is what renders, and it is JSON.    |
| Treat 0 from the scraper as a studio   | Rows stored before the flag hold 0 for "absent"; the flag is the evidence. |

### D-093 · The landing page is composed from one-file sections

**Chosen.** `pages/LandingPage.tsx` (3,085 lines) is now 86 lines that compose
`components/landing/*` — one component per file, as the coding standard already required:
`Hero`, `ReportShowcase`, `HeroStaticMap`, `ReportsSection` (+ `ModePreview`, `ModeStatTiles`),
`HowSection`, `CoverageSection`, `FounderNoteSection`, `LandingSunScoutSection`,
`PricingSection`, `FAQSection`, `CTASection`, `SectionHeader`, the six `Showcase*` visuals,
`sampleListings.ts` and `landingHelpers.ts`. Pure extraction: no markup, copy or behaviour
changed; the landing and theme tests pass unchanged. The static SunScout section is renamed
`LandingSunScoutSection` so it cannot be confused with `sunscout/SunScoutPanel`.

**Why.** Audit J-04: one file carried the input orchestration, the demo visuals, the pricing
logic and the FAQ, and every landing change went through a 3,000-line diff.

| Option                       | Why not                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Fewer, larger files          | The standard is one component per file; the showcase visuals are separate things. |
| Move sections under `pages/` | They are components, not routes.                                                  |

### D-094 · `/health` says which commit is running

**Chosen.** The API and the calc engine echo `RAILWAY_GIT_COMMIT_SHA` (as `commit` and a
7-character `shortCommit` / `short_commit`) from `/health`; null where the variable is not set.

**Why.** Every production check this week started with "has Railway deployed master yet?" and
had no answer but waiting. Railway sets the variable on every deploy; echoing it costs nothing
and turns the question into a curl.

### D-095 · Checklist ticks are kept in this browser, per report, and the page says so

**Chosen.** `hooks/useChecklist` keeps a checklist's ticked items in localStorage under
`propscout:checklist:<share token>:<section>`; all four report checklists (investor due diligence,
tenant before-you-sign, buyer conditions, landlord prep) use it on live reports and show one line:
"Ticks are kept in this browser for this report — not in your account, not on the shared link."
The demo routes pass no key and keep nothing. Storage is best-effort and a corrupt value reads as
nothing ticked.

**Why.** Roadmap "Checklists: saved progress": every list forgot its ticks on reload, which made
them decoration. Account-side storage needs a table (human gate) and a product decision about
sharing; per-browser storage is what can ship now, and the sentence under the list keeps it from
being mistaken for either.

| Option                    | Why not                                                                     |
| ------------------------- | --------------------------------------------------------------------------- |
| A `checklist_state` table | Migration gate; and whether ticks travel with the share link is a decision. |
| Keep ticks in the URL     | Leaks progress into the shared link by default.                             |

### D-096 · Nearby-amenity times are routed, and the formula is labelled when it is used

**Chosen.** `mapboxService.routeMinutes(profile, from, to)` calls Mapbox Directions (walking and
driving); `getNearbyDistances` routes each found amenity and reports `walkMin`, a routed
`driveMin` and `routed: true`. When the router does not answer, `driveMin` is the old
straight-line ÷ 30 km/h estimate with `routed: false`, and the report says "~4 min drive,
straight-line estimate". The Sources ledger gets a "Travel times" row: Published (Mapbox
Directions, as of the analysis) or Estimate. The tenant location section shows "12 min walk ·
4 min drive" instead of "km straight-line". Eight Directions calls per analysis (4 targets × 2
profiles), inside the free tier.

**Why.** Roadmap "Location: routing API": the report printed "min drive" figures that were a
straight-line distance divided by 30 km/h — a formula presented as a measurement. The Mapbox
token was already in the API for geocoding.

| Option                       | Why not                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Mapbox Matrix API (one call) | Needs the driving/walking split anyway; eight cheap calls are simpler and per-target failures stay isolated. |
| Google Distance Matrix       | A second billed product for something the existing token covers.                                             |
| Transit routing              | Mapbox has no transit profile; needs another source (BACKLOG).                                               |

### D-097 · The investment down-payment slider starts at 20%, and says why

**Chosen.** `FINANCING_SLIDER.MIN_DOWN_PAYMENT = 0.20`; the slider's range is 20–50% with ticks
20/30/40/50 and one line under it: "20% is the floor for a rental purchase — insured (high-ratio)
mortgages are not available for non-owner-occupied properties." A stored value below 20% renders
at 20%.

**Why.** Spec §6.5 has always said 20–50%; the component shipped 5–50%. Below 20%, a rental
purchase needs default mortgage insurance, which the insurers do not offer for non-owner-occupied
1–4 unit properties — so the 5–15% scenarios were mortgages nobody would write, with no premium
modelled either. Same class as the audit's "formula presented as a fact".

| Option                           | Why not                                                                    |
| -------------------------------- | -------------------------------------------------------------------------- |
| Keep 5% and add the CMHC premium | The premium does not apply — the product is not available for rentals.     |
| Silently clamp without the note  | A user who wants 10% down should be told why the slider will not go there. |

### D-098 · The sun figures say which facade they were computed for

**Chosen.** A SunScout recalculation stores `facadeBearing` and `facadeConfirmed: true` with the
figures, and refreshes the Sources ledger's "Primary facade" row from "south (assumed) · Default"
to the chosen direction · Observed ("You — set in the SunScout section"). The panel starts from
the stored bearing and says "Assumed south · set it if you know" or "Set by you · figures
recomputed for it". An analysis with a sun model gets the assumed row from the start.

**Why.** Roadmap "SunScout: label inferred vs confirmed". The recalc already persisted the
figures but not the facade, so a reload showed west-facing numbers under a select that read
"South" — the stored result contradicted its own label.

### D-099 · The comps behind the rent band are shown, sanitised

**Chosen.** `fetchRentalComps` returns `rows` — the comparable rentals that survived outlier
removal, capped at 12, nearest first when the search used a radius and cheapest first otherwise —
with rent, beds, sqft, FSA, straight-line distance, source site and the date the scraper last saw
the listing. No address and no URL leave the API. Stored with the analysis
(`rentalComps.rows`); `CompRowsTable` renders them under the investor/landlord §03 band and the
tenant §01 band, with "Showing 12 of 30" when capped and "asking rents as scraped, not signed
leases; addresses are not republished". Fixtures and older analyses carry no rows and show no
table.

**Why.** Roadmap "Comparables: individual comp rows". A band was a number with no way to judge
it; the rows are the evidence. Addresses are withheld because the scraped listings are the
source sites' content to publish, and the FSA + distance + size say everything a reader needs.

| Option                   | Why not                                                                      |
| ------------------------ | ---------------------------------------------------------------------------- |
| Show addresses and links | Republishes scraped listings; not ours to publish.                           |
| All rows, uncapped       | 60-row tables on a phone; 12 nearest/cheapest are the evidence that matters. |

### D-100 · School walk times are routed; the straight-line estimate says it is one

**Chosen.** `lib/schoolWalkTimes.withSchoolWalkTimes` routes a walking time (Mapbox Directions)
to each of the up-to-nine nearby schools and stores `walkMin` on the school; the tenant schools
section shows "9 min walk" when routed and "~7 min walk, straight-line estimate" when not; the
personal schools card shows the routed walk time and nothing otherwise. School coordinates
(public data) now ride on the school object so the routing can happen.

**Why.** Roadmap "Schools: pedestrian routing"; same class as D-096 — a fixed pace over a
straight line was printed as "~14 min walk" with nothing to say it was a formula.

### D-101 · No comps is a finding, not a missing section; the proxy rent is named where it is used

**Chosen.** `metrics.rentUsedMonthly` and `metrics.rentIsProxy` record the rent the engine scored
with and whether it was the price-based proxy. With zero comps, §03 stays on the page with
"No comparable rentals found" and one paragraph: every rent-dependent figure assumes $X/mo,
which is 0.5% of the asking price, not a market observation. The break-even copy reads "No
comparable rentals were found, so this assumes $1,745 (0.5% of the price)" instead of "The market
pays about $0". The web's rent fallback chain is comps mid → listed rent → the engine's rent.

**Why.** Found on the 2026-09-14 rural production run (Bancroft): §03 vanished, the outline
skipped 02 → 04, the headline cash flow and score rested on a proxy disclosed only in the Sources
ledger, and the break-even line said the market pays $0. The client had no way to know the
engine's rent when comps were null.

| Option                                    | Why not                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| Suppress the investor score without comps | The tenant report does; for the investor it is an S-\* scoring decision (BACKLOG §1). |
| Keep dropping §03                         | The numbering gap was the only hint, and the ledger is the last section.              |

### D-102 · Editing the landing input drops a finished sample preview

**Chosen.** Typing or pasting into the hero input resets the sample stage to idle. Before, "Try
one of ours" left the stage at `done`, and `handleAnalyze` checks that first — so any listing
URL entered afterwards opened the demo modal and landed on `/r/demo`, never touching the
scraper. Found on the 2026-09-14 production run when a pasted Realtor.ca link produced the
Hamilton demo.

**Why.** The sample flow and the real flow share one input and one button; the state that
distinguishes them has to follow the input.

### D-103 · A listing with no sale price shows no price-derived metric tile

**Chosen.** When `listing.price` is 0 — a for-rent listing rendered by the investor/landlord
report — §01 shows only NOI and break-even rent, the verdict reads "Operating view · no purchase
price", and one sentence says cap rate, cash-on-cash, DSCR, mortgage payment and gross yield need
a price and are not shown. A priced listing is unchanged.

**Why.** The 2026-09-14 review run of three rental listings in landlord mode showed "$19,154 a
year on $0 — before any mortgage", "Monthly payment $0" and cash-on-cash on $0 invested. The
landlord report's own method is an owner decision (L-03); printing nonsense while it waits is not.

### D-104 · A rental listing's hero shows no purchase score

**Chosen.** When the report renders a for-rent listing (`price` 0 — landlord mode today), the
sticky score card becomes "Operating view · No purchase score" with the listing's asking rent and
the comps' market rent (with the comp count), and the crumb reads "Rental listing · operating
view". The investment verdict, gauge, cash flow, breakdown, cap rate and DSCR are not rendered
for it. `ListingData.askingRent` carries the listed rent separately from `rentEstimate`.

**Why.** The 2026-09-14 review run of three rental listings in landlord mode showed "Hard pass ·
14", "Monthly cash flow $1,596" (no mortgage in it), "DSCR 0.00×", "Live recalc · sliders below"
with no sliders, and the comps median under the label "Asking rent". L-03 (what a landlord score
should mean) is still the owner's decision; not printing the wrong score meanwhile is not.

### D-105 · Days-on-market and rent trend are measured from the comps table or score nothing

**Chosen.** The two demand inputs the engine used to fill with `21 days` / `"flat"` (4 of the
score's 10 demand points, awarded to every property in the province) are now measured by the
API from the nightly `rental_listings` table for the listing's FSA — `lib/marketDemand.ts`,
constants in `MARKET_DEMAND`:

- **Days on market** = median (last seen − first seen) over listings first seen in the last
  90 days that have not been seen for 2+ nightly runs, any bedroom count. Needs 8.
- **Rent trend** = median asking rent of listings first seen in the last 30 days against those
  first seen in the 60 days before, same bedroom count when the subject's is known. Needs 8 in
  each window; within ±2% is flat.

Below the sample the input is `null`, the engine scores it **0** (`_score_market_demand` accepts
`None`), the request model rejects any trend outside `rising|flat|declining`, and the ledger row
reads "not observed · 0 of 3 points" with the sample it did find. A measured input is an
`observed` row with the sample size and the FSA. The engine echoes both in
`AssumptionsAppliedOutput`. The narrative input no longer says `rentTrend: 'flat'` for every
listing.

**Why.** Audit S-02 / backlog owner decision, taken 2026-09-15: a constant added to every score is
not information, and #56's labelling left the points counted. Option A alone (always 0) would
have thrown away the one table that can measure both; option B alone would have needed a
default for the thin months. Today the table goes back to ~2026-09-05, so most reports land on
the fallback until November for DOM and December for the trend — which is the honest state.

**Effects on pinned values.** `test_regression.py` and the calibration cases pass DOM / trend
explicitly to `calculate_deal_score`, so they do not move. A live report loses up to 4 points
against yesterday's until its FSA has enough departed listings; the ledger says so per row.

**Known limits.** Kijiji re-posts read as new listings, which shortens Toronto DOM until dedupe
learns to fold re-posts; the DOM measures scraped asking listings, not signed leases; both
inputs are FSA-wide, not building-level. Tenant-mode ledgers carry the rows too — the tenant has
no score, but the same measurement sits behind the negotiation copy's "leverage" once it exists.

**Alternatives considered**

| Option                                 | Why not                                                                                         |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Keep the defaults, labelled (#56)      | Still 4 points for nothing; the audit finding stands.                                           |
| Always 0 (option A alone)              | Throws away a measurement the table can already support in the dense FSAs.                      |
| Drop the two inputs and rescale demand | Changes spec §10's formula and every pinned score; the inputs are sound, the defaults were not. |
| Measure city-wide rather than by FSA   | Larger sample sooner, but a Toronto-wide DOM says nothing about M4Y; the sample gate is honest. |

### D-106 · The CMHC vacancy table is the published October 2025 survey, and the fallback is the Ontario aggregate

**Chosen.** `constants/cmhcVacancy.ts` now holds the Total column of CMHC's Rental Market
Report data tables, Ontario, **Table 1.1.1 "Private Apartment Vacancy Rates (%), by Bedroom
Type — Ontario 10,000+", Oct-25** (released 2025-12-11) for every CMA and CA row CMHC rates
a/b/c, with each municipality keyed to the survey area it belongs to (the GTA municipalities to
Toronto CMA, Burlington to Hamilton CMA, Whitby and Clarington to Oshawa CMA, per the report's
zone descriptions). `CMHC_VACANCY_SURVEY` records the survey month, release date and table so
the ledger cites them; the row's basis is `published` with `asOf` = the release date. A
municipality with no row gets the same table's **Ontario 10,000+ aggregate, 3.2%**, instead of
the previous unsourced 5%. `cmhcService` strips a scraped neighbourhood suffix ("Toronto
(Yonge-Eglinton)") the way the tax-rate lookup does, so those listings no longer fell to the
default.

**Why.** The table was documented as "placeholder starting values keyed to indicative ranges"
and the ledger had to call it a _default_. The survey is public; the figures above were read
from CMHC's own `rmr-ontario-2025-en.xlsx` on 2026-09-15 and cross-checked against the report
text (Toronto 3.0, Ottawa 3.0, Hamilton 3.6, London 4.0, Windsor 3.7, St. Catharines–Niagara
3.9, Kitchener–Cambridge–Waterloo 4.1). The old placeholders (Toronto 1.8%, Hamilton 3.3%) were
a full bracket off for most cities — every GTA score has been earning 4 vacancy points on a 2024
number.

**Effects.** Vacancy points fall from 4 to 1 for the GTA (3.0% is the 3–5% bracket) and for
Ottawa, and rise for Sudbury and Kingston. `test_regression.py` passes vacancy explicitly and
does not move. The spec's 5% is the vacancy _allowance_ in the expense model (unchanged); the
demand input is a market observation and should come from the survey.

**Refresh rule.** Every January, download the new Ontario data table, copy the Oct-NN Total
column for a/b/c rows, update `CMHC_VACANCY_SURVEY`, run `cmhcService.test.ts`.

### D-107 · A landlord states the property's value in the hero and the report is re-run on it

**Chosen.** L-03, decided by the owner on 2026-09-15 as spec §9 already reads: the landlord
report is acquisition underwriting on the landlord's own numbers, not a separate scoring method.
A for-rent listing never states a value, so the hero's "No purchase score" card (D-104) now asks
**"What is it worth?"**; the value goes to `POST /analysis/:token/value`, which persists it as
`Analysis.ownerInputs` (`market_data.ownerInputs` — no migration) and re-runs the same pipeline
`POST /analysis` ran, with the value in place of the rent-derived estimate. The response is the
fresh analysis; the page swaps it in, the card becomes the scored card with "Value · you entered
$X · Change", and every price-dependent section (metrics, financing sliders, cash to close, OSFI,
equity, break-even) renders as it does for a sale listing. The Sources ledger carries "Property
value · $X · observed · You entered it · as of <date>" in place of the cap-rate estimate row.

Mechanics: the pipeline body is now `runAnalysisPipeline()` (steps 3–10) shared by both routes;
the value route is landlord-only (409 otherwise), bounded by `OWNER_VALUE` (50k–50M; 400
outside), one re-run per token at a time, not counted against the free quota (a re-run of a
report the person already has, like the facade recalc), and not owner-gated — the share token
is the capability, the same policy as the facade (D-098). The web has `OwnerValueForm`
(rendering only), `useOwnerValue` (request, busy, error) and `analysisService.setOwnerValue`.
`toListingData` reads `analysis.ownerInputs?.value ?? listing.price`, so nothing downstream
needed to learn a new field.

**Why option 1.** The spec's own §9; the investor engine, sections, sliders and ledger already
exist and every input then came from the landlord; the score is defensible as "what this would
pencil at as a purchase today". A separate pricing-health score (option 2) needs the S-02 demand
data to mean anything and is a new method with regression cases — a post-launch item once the
comps table has months of history. Leaving the operating view (option 3) gives a landlord no
verdict at all.

**What it deliberately does not do yet.** Mortgage balance and rate inputs. An owned-outright
property has no debt service; `calculate_dscr` raises on zero debt, the sanity bounds assume
0.5–5×, and the web renders `dscr.toFixed(2)`. Modelling "no mortgage" honestly is an engine
change (DSCR = not applicable, CoC on full value) that touches the score, the sanity checks and
the tiles — logged in BACKLOG §8 rather than faked with a 5% mortgage. Until then the sliders'
20–50% down payment is the landlord's equity lever, labelled as a down payment. Cash to close and
OSFI render as a purchase — which is what §9 says the report is.

**Verified 2026-09-15** on the live Westcroft and Russett landlord reports through the local API
(same Supabase project): value → engine re-run in ~10 s, card scored, ledger row present,
`Change` re-opens the form pre-filled; screenshots in the review folder `landlord-value/`.

**Alternatives considered**

| Option                                              | Why not                                                                                             |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Ask for the value before the report renders         | The rent, comps, flags and location sections are useful without it; a gate hides them for nothing.  |
| Write the value into the listing snapshot's `price` | The listing would claim a price it never had; `ownerInputs` keeps provenance and the ledger honest. |
| Owner-only writes (D-065 policy)                    | Guest landlord reports have no owner; the facade input already follows the share-token policy.      |
| Count the re-run against the quota                  | It is the same report re-scored, not a new analysis; the facade recalc set the precedent.           |

### D-108 · A landlord who already owns it enters the mortgage balance; no debt means no DSCR, not an infinite one

**Chosen.** The hero value form (D-107) gains **"I already own it"**, revealing _Mortgage
balance_ (blank = owned outright) and an optional _Rate %_. `OwnerInputs` carries
`mortgageBalance` (0 = outright, null = purchase case) and `mortgageRate` (decimal). The API
turns them into the engine's financing: `down_payment_pct` = (value − balance) / value, floored
at the engine's 5% (`OWNER_EQUITY_MIN`, the ledger says when it clamps), `mortgage_rate` = the
contract rate when given else the live prime rate, and a new `FinancingInput.owned = true`.

In the engine, `owned` means: no closing costs or LTT (nothing is payable to keep holding it),
cash invested = the equity alone (cash-on-cash and the break-even appreciation both measure
against it), and when the equity is 100% there is no debt service — `dscr` is **`None`**, the
DSCR component scores its **maximum** (the coverage test is met, not failed), and the sanity
bound skips it. `InvestmentMetrics.dscr` is `number | null` end to end; the tile reads "No debt ·
Owned outright", the hero fact reads "no debt", nothing prints `Infinity`, `NaN` or `0.00×`.

On the page: the financing slider becomes **Equity share** 5–100% (`EQUITY_SLIDER`), the §02 pill
reads "Owned outright" or "60% equity · 3.89%", the Toronto-LTT toggle is hidden, the live
recompute (`computeDemoMetrics` / `enrichMetrics`) charges no LTT or closing costs and returns
`dscr: null` on zero debt, and §04 Cash to close stays in the outline with the finding "Owned ·
nothing to close" and the equity the return is measured on. The ledger's financing rows become
"Mortgage balance · $X · observed · You entered it" (or "none — owned outright"), "Mortgage
rate · You entered it" when given, and amortization stays the labelled default (remaining
amortization is not asked for yet).

**Why.** D-107 left "owned outright" as the one landlord position the model could not represent
honestly: `calculate_dscr` raised on zero debt and every renderer assumed a number. Faking a 5%
mortgage would have printed a payment the landlord does not make. Treating no debt as "coverage
met" is the only reading under which the score's DSCR component means the same thing for a
financed and an unfinanced hold; excluding it and rescaling would change spec §10.

**Verified 2026-09-15** on the live Russett landlord report through the local API: owned
outright at $950k → score 47 (cash flow 25/25, DSCR 15/15), $0 payment, DSCR null, $0 closing,
no sanity warnings; page shows Equity share 100%, "No debt", "Owned · nothing to close".

**Known limits.** Remaining amortization is not an input (the default 25 years stands, labelled).
OSFI §05 still renders as a purchase qualification; for an owner it is the renewal/refinance
test and the copy does not yet say so. The landlord narrative prompt still describes the
position in acquisition language.

**Alternatives considered**

| Option                                              | Why not                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Clamp equity at 95% and model a tiny mortgage       | A payment the person does not make, a DSCR that means nothing; the ledger would have to lie.      |
| DSCR = ∞ / a sentinel like 99                       | Prints "Infinity" or a fake number; the tile and the score both need "not applicable".            |
| Drop the DSCR component when unfinanced and rescale | Changes spec §10's formula; a maximum is the reading under which the component keeps its meaning. |
| Separate "owner" report                             | The sections are the same; the difference is three inputs and what "cash in" means.               |

### D-109 · Comps are weighted by similarity and mapped at approximate positions

**Chosen.** The rent band is no longer the plain 25/50/75th percentile of every comp that
survived outlier removal. Each comp gets a weight in (0, 1] — `lib/compWeighting.ts`,
constants `COMP_WEIGHTS`:

| factor   | rule                                   | when unknown |
| -------- | -------------------------------------- | ------------ |
| distance | 1 / (1 + km)                           | 1            |
| recency  | exp(−days since last seen / 90)        | 1            |
| size     | exp(−\|Δ sqft\| / 300)                 | 1            |
| bedrooms | 1 exact, 0.6 for the ±1 fallback match | 1            |

— and the band is the weighted percentile (each comp at the midpoint of its share of the total
weight, interpolated between neighbours). Missing facts are neutral; only a known difference
lowers a comp. `fetchRentalComps` takes the subject's sqft as well as beds and coordinates, on
both the FSA path and the radius fallback. `CompRow` gains `similarity` (the weight, shown as
"Match 61%"), and `approxLat/approxLng` — the source position rounded to three decimals
(~110 m) — and rows come back most similar first. The report shows a Match column in the comps
table (investor §03, tenant §01), a **CompsMap** under the table in §03 and as the tenant §10
(the "not mapped individually" state stays for rows without a position), with the caption
"positions rounded to about 100 m; addresses are not republished". The Sources rent row names
the weighting.

**Why.** Audit roadmap "weight by building/type/size/recency; map them", and spec §6 ("nearest
5 comps on Mapbox map"). Before this a 90-day-old three-bedroom 4 km away counted the same as
last night's two-bedroom in the next building, and the tenant §10 was an honest empty state
because the rows carried no position. Publishing a block-level position of a public rental
listing does not identify the unit; publishing the address (D-099) would.

**Effects.** Bands move on re-run: on the live M6H report the weighted band is $1,761 / $2,265
/ $2,850 from twelve Kijiji comps, the median unchanged from the plain one. With every factor
unknown the weighted percentile is within a few dollars of the old plain one (p25/p75 shift by a
quarter-step; the median of an odd count is exact) — the supabaseService "known dataset" test
now pins 2775 / 2900 / 3025 instead of 2800 / 2900 / 3000. Stored analyses are untouched until
re-run; rows without `similarity` show a dash and no weighting note.

**Known limits.** No building/type factor yet — `rental_listings` has no property type column
and "same building" would need the address the row deliberately drops. Recency uses last-seen;
Kijiji re-posts refresh it. The map is one pin per comp, unclustered.

**Alternatives considered**

| Option                                                | Why not                                                                                            |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Keep plain percentiles, show similarity only          | The number the score runs on would still be the unweighted one; the column would be decorative.    |
| Filter to the top-N most similar, then plain          | A cliff at N; weighting degrades smoothly and keeps the count honest.                              |
| Exact positions on the map                            | Identifies the building — the line D-099 drew.                                                     |
| Interpolation that reproduces the old p25/p75 exactly | Makes the top comp's weight nearly irrelevant to p75; the midpoint definition is the standard one. |

### D-110 · Exit scenarios under §07: what a sale returns on four price paths, before tax

**Chosen.** `lib/exitScenarios.ts` (web, pure) and `ExitScenariosCard` under the equity chart
and the break-even card. Four columns — **Stress −2%/yr, Flat 0%, Conservative +2%, Base** (the
appreciation slider) — at a hold the reader picks (5 / 10 / 20 years, the chart's snapshots).
Each column: sale price, cost of selling (`EXIT_COSTS`: 5% commission + 13% HST on it + $1,500
legal), mortgage paid off (the amortization balance at that year; 0 when owned outright or past
the amortization), net proceeds, cash flow over the hold, cash in all told, profit before tax,
and a simple annualized return on cash in. The cash convention is the break-even card's
(D-062): a shortfall accumulates into cash in, a surplus into cash out, never netted. Capital
gains are not deducted and the card says so; maintenance is already in the cash flow and the
card says that too. The card renders on the live report and the demo route; it needs the
listing and financing, so `EquitySection` takes them as optional props.

**Why.** Audit roadmap "equity build: flat/conservative/stress scenarios with selling costs,
tax, capex". The equity chart shows one path at one rate and calls the result "equity" — the
number a seller banks is smaller by the cost of selling, and the number that matters is against
every dollar put in. On the calibration condo a 10-year hold at the base 3% returns +0.9%/yr;
at 0% it loses $192k. That is the sentence the chart alone never said.

**Not tax.** A capital-gains figure needs the seller's marginal rate and whether the property is
a principal residence; asking for that is a form the report does not have. Labelled "before
tax" rather than modelled at an assumed rate.

**Known limits.** Web-only projection, like the equity curve and the client-side hold case —
no engine sanity bound (the engine never sees it). Simple annualized return, not IRR (the cash
flows are level so the two are close; IRR would need a solver). Stress is −2%/yr, a soft market,
not a crash.

**Alternatives considered**

| Option                               | Why not                                                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Add a scenario selector to the chart | One line at a time hides the comparison; the table shows the four side by side.                           |
| Model tax at an assumed 40% marginal | A number the reader did not give, in the one row that varies most between readers.                        |
| IRR                                  | A solver for level cash flows adds little over the simple rate and is harder to explain.                  |
| Put the projection in the engine     | The engine's hold case is the break-even; the scenarios reuse its inputs client-side like the curve does. |

### D-111 · Provenance next to the figure: listing says / you entered / calculated · N assumed

**Chosen.** `lib/provenance.ts` (web, pure) and a shared `ProvenanceBadge`. Three places:

- **Hero source line** under the address: "Listing facts from realtor.ca · read Sep 14, 2026"
  (scraped) or "Listing facts as you entered them · entered …" (address path), from
  `listing.url` and `listing.scrapedAt` (`ListingData.provenance`).
- **Hero asking price**: "listing says", "you entered" (address path), or "you entered" for a
  landlord's value (D-107).
- **§01 headline tiles**: every tile is "calculated"; each carries the count of §12 ledger rows
  among its inputs whose basis is `estimate` or `default` — "calculated · 5 assumed" — with the
  hover naming them ("assumes property tax, maintenance reserve, …. See §12"). The input map is
  `TILE_INPUTS` (tile → ledger keys), so the badge is derived from the ledger the API already
  produces (D-088); the component computes nothing.

The badge is muted, not amber: most tiles rest on a few labelled starting assumptions (down
payment, amortization, insurance, legal fees) and a wall of amber would say nothing; the count
and the hover carry the information.

**Why.** Audit roadmap "field-level badges (listing says / you entered / calculated / assumed as
of), scrape timestamps". The §12 ledger answers "where did this come from" for a reader who
scrolls to the end; the tile is where the question arises.

**Not in this.** Extraction confidence per flag is already on the flag rows; geocoder match
type is not stored (BACKLOG §8). Tenant and personal reports do not carry the tiles; the hero
line and price badge apply wherever `PropertyHero` renders.

**Alternatives considered**

| Option                             | Why not                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| One badge per tile input           | Nine tiles × up to twelve inputs is a table, not a tag; the count + hover + §12 is enough. |
| Amber whenever anything is assumed | Every tile on every report would be amber; the tone would stop meaning anything.           |
| Compute provenance in the API      | The ledger is already the API's answer; mapping tiles to it is presentation.               |

### D-112 · Break-even is the grossed-up asking rent, from one identity, and the gap is not the shortfall

**Chosen (owner decision 2026-09-16).** Break-even rent is the rent to **ask** so that, after the
vacancy allowance (and the management fee when it is on), every fixed cost is covered:
`fixed costs / (1 − v − m)`. The engine already computed it that way; the web's live recompute
did not — it held vacancy at today's rent (`mortgage + operating expenses at current rent`),
so §01 showed a break-even ~$140 lower than the ledger and the narrative on the calibration
unit. Both now come from one identity:

- **engine**: `calculations/investment.py::calculate_rental_economics` returns
  `break_even_asking_rent`, `effective_rental_income` (rent × (1 − v)), `monthly_cash_flow`
  (rent × (1 − v − m) − fixed) and `asking_rent_gap` (break-even − rent); the router uses it and
  the API passes `effectiveRentalIncome` / `askingRentGap` through on `InvestmentMetrics`.
- **web**: `lib/rentalEconomics.ts` is the client's only copy of the formula; every slider
  recompute goes through it, and `rentalEconomics.test.ts` pins it to the engine's own numbers
  for 5702 Buttermill (break-even $5,138.76, cash flow −$2,126.82, gap $2,238.76) so the two
  cannot drift silently. When the rent is unknown the client falls back to NOI − mortgage for
  cash flow rather than evaluating an identity with nothing in it.

Three quantities the copy used to blur are now kept apart: the **break-even ask**, the
**asking-rent gap** (how far the ask is from break-even), and the **monthly shortfall**
(−cash flow, which is the gap after vacancy: −cash flow = gap × (1 − v)). The §01 tile reads
"asking rent · after 5% vacancy" and says the shortfall is the cash-flow figure, not the gap.

**Why one identity in two languages.** The engine is Python, the sliders are TypeScript; a
shared package is not available across that boundary. The honest equivalent is one stated
definition, one client module, and a parity test against the engine's output — the client
never invents a second formula again.

**Effects.** Pinned engine values do not move (same formula). On the live page the base-case
break-even now equals the ledger's; the slider-driven figure moves with the sliders as before.

**Alternatives considered**

| Option                                        | Why not                                                               |
| --------------------------------------------- | --------------------------------------------------------------------- |
| Current-rent basis (the web's old formula)    | Not a break-even: the vacancy expense changes with the required rent. |
| Recompute on the server per slider move       | The design requires instant, synchronous recalculation on drag.       |
| Keep two formulas and document the difference | The report would keep disagreeing with itself by $140.                |

### D-113 · Rent control is a dated rules module and a tri-state hint, never a build-year boolean

**Chosen (owner decision 2026-09-16).** `apps/api/src/constants/ontarioRentRules.ts` holds
Ontario's rules with their provenance — source page, `sourceUpdatedAt` 2026-06-23, `checkedAt`
2026-09-16; exemption for units first occupied after **2018-11-15**; 90 days' notice; 12 months
between increases; guidelines **by the year an increase takes effect**: 2025 2.5%, 2026 2.1%,
2027 1.9%. `lib/rentControl.ts` turns the listing's build year into a tri-state with its basis:
`likely_controlled` (built before 2018), `unknown` (built in 2018 — January and December differ;
or no build year), `likely_exempt` (built after 2018), always `requiresVerification: true`; and
picks the guideline for an increase's effective date (a tenancy from June 2026 gets its first
increase under 2027's 1.9%, not 2026's 2.1%). The pipeline stores `Analysis.rentControl`
(`market_data`, no migration) on every run, and the §12 ledger carries a "Rent control" row —
basis `estimate`, the Ontario page as source with its update date, `checkedAt` as the as-of.

The web renders one `RentControlNote` from `lib/rentControlCopy.ts` for the landlord (under §03,
beside the rent it sets) and the tenant (above §12 Before you sign): the status as "Likely …
— confirm" (never "not rent-controlled"), what actually decides it, the starting rent (agreed on
a new tenancy — the guideline does not cap it), future increases with **both** branches stated
and the likely one first (the guideline with every published year; or no limit on the amount if
exempt), and the timing rules that apply either way. Source line and "Not legal advice".
`ListingData.rentControl` (the checklist's boolean) is now `status !== 'likely_exempt'`.

**Scoring.** No points move on the inferred status. The engine never deducted for rent control;
spec §10's "-5 pre-Nov-2018" line is annotated as an information flag until the first-occupancy
date is verified.

**Why.** Counter-review: a landlord task must distinguish vacancy pricing from a sitting-tenant
increase, and the guideline must come from an authoritative source with its date. `yearBuilt <=
2018` asserted a legal status the listing cannot establish; one hard-coded percentage would be
wrong for any tenancy starting now.

**Refresh rule.** When Ontario publishes the next guideline (summer, for the following year),
add the year to `guidelinesByYear`, update `sourceUpdatedAt` from the page and `checkedAt`, run
`rentControl.test.ts`.

**Alternatives considered**

| Option                                       | Why not                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Keep the boolean, fix the copy               | A boolean says the status is known; the listing cannot know it.                             |
| One current-year percentage in the prose     | Wrong for a tenancy whose first increase lands next year — the common case for a new lease. |
| Separate tenant and landlord interpretations | One law; the perspective changes the sentence, not the rule.                                |
| Deduct points on the inferred status         | Turns an unverified legal inference into a precise number.                                  |

### D-114 · "Estimated monthly cash outflow", with every row's source and a computed modelled share

**Chosen (owner decision 2026-09-16).** The personal report's §01 is renamed from "True monthly
cost" to **"Estimated monthly cash outflow"** — the heading, the pill ("$X/mo · all-in
estimate"), the total row, the hero label, the tenant report's rent-plus-utilities line, and the
landing copy. Under the total: "$1,140 (24%) based on modelled assumptions", computed from the
rows, not typed in. Each row carries a `basis` — `listing`, `user_provided` (address path),
`calculated` (the mortgage payment), `estimated` (municipal-rate tax, insurance, utilities,
maintenance reserve) — shown as "From listing / You entered / Calculated / Estimated" before its
note. `lib/personalCashOutflow.ts` builds the lines and the share (`estimated ÷ total`, the
utilities aggregate skipped so they count once); `PBCashOutflowSection` (renamed from
`PBTrueCostSection`) only renders. `PersonalProperty.factsEntered` comes from the listing having
no URL.

**Why.** Two problems with "true": a quarter of the figure is modelled (and the tax is, whenever
the listing omitted it), and the mortgage payment includes principal — money moved into equity,
not spent. "Cash outflow" is what the number is; "estimated" is what its rows say. Changing only
the pill (the earlier proposal) would have left the giant heading overclaiming.

**Effects.** No figures change; the words and the per-row labels do. A listed tax reads "From
listing · as listed"; a city-rate tax reads "Estimated · from the municipal rate · verify" and
counts toward the share.

**Alternatives considered**

| Option                                    | Why not                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| Keep "True monthly cost", change the pill | The heading is the claim; the pill is the small print.                          |
| "Estimated monthly cost"                  | Still calls principal repayment a cost.                                         |
| Hand-maintain the modelled list           | Wrong the first time a tax estimate is used; the rows already know their basis. |

### D-115 · No display floor; the score is versioned; the redesign runs as a shadow until calibrated

**Chosen (owner decision 2026-09-16).** Three things, in the order they were asked for:

1. **The 5-point display floor is gone now.** `to_display_score` is `round(raw × 100 / 95)`; a raw
   0 displays as 0. "A property is always worth something" was never a scoring rule, only a
   clamp on the number shown; if the belief belongs anywhere it belongs in the component
   brackets. The verdict label was already taken from the raw score, so nothing else moves.
2. **The score is versioned.** `constants/score_versions.py`: the headline model that runs
   today — the mode-aware tiered/gating model — is **version 2** (the `analyses.score_version`
   column, migration 20260623, reserved that number for it while rows kept defaulting to 1).
   The engine stamps `deal_score.version`, the API stores `scoreVersion` in `market_data` and
   writes the column (falling back without it if the migration is not applied), and older
   rows keep the default 1 they were written under. The owner's "V1" is this version 2; the
   owner's "V2 architecture" is version 3.
3. **Version 3 runs as a shadow** (`calculations/score_v3.py`, brackets in `constants/score_v3.py`,
   marked uncalibrated): **property economics** 0–100 (cap rate 60, operating margin = NOI ÷
   gross rent 20, the version-2 demand brackets rescaled 20) and **financing resilience** 0–100
   (DSCR 50 — 50 when there is no debt, debt burden = payment ÷ effective income 25, rent cushion
   = (rent − break-even ask) ÷ rent 25); **cash flow and cash-on-cash are reported, not scored**;
   a severe flag sets `risk_status = critical` (`flagged` for standard reds, else `clear`) and
   changes no number; a provisional composite (0.6 / 0.4) exists only for side-by-side
   comparison. It is computed on every analysis, returned as `shadow_score`, stored as
   `Analysis.shadowScore`, and shown on dev builds only, under the score breakdown. Nothing in a
   report is decided by it.

**Why.** S-03 was a defect and a one-line fix. S-01 (four correlated components rewarding one
financing scenario four times) and S-04 (severe caps of 40/30/20/10 with no source) are
structural; reweighting the headline without a calibration set would be guessing in a new
direction, and waiting until 40 could be proven to be 35 would leave the structure in place.
So the structure is built and running in the shadow, and the headline waits for data.

**Before version 3 can be the headline.** A calibration set of 20–30 properties with the
verdict the owner would give; compare version 2, version 3 and the expected classification;
fit the brackets and the composite weights; a DECISIONS entry; `SCORE_VERSION_CURRENT = 3`.
The set is an owner data item in BACKLOG §4.

**Alternatives considered**

| Option                                  | Why not                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Reweight the headline now (CoC 20 → 10) | Still four correlated components; new weights with no data behind them.                                 |
| Keep the floor                          | A clamp on the number shown is not a belief about properties; it damaged the scale's meaning.           |
| Number the shadow "2"                   | The column already means the gating model by 2; reusing it would mix scales in storage.                 |
| Drop the severe caps from version 2 now | Changes the headline's meaning before the replacement is calibrated; version 3 carries the gate design. |

### D-116 · One free anonymous report on a server-issued cookie; claimed on sign-in; the wall behind a flag

**Chosen (owner decision 2026-09-16).** Spec §5's "a guest gets one free analysis" is built as
a **server-issued visitor id**: on a guest's first `POST /analysis` the API issues `ps_guest`
(random UUID; HttpOnly; Secure + SameSite=None in production because the app and the API are
on different sites, Lax on localhost; one year) and records it on the analysis row
(`analyses.guest_id`, migration `20260916_add_analyses_guest_id.sql`). The server counts against
it — `countGuestAnalyses`, tenant mode exempt as in spec §4 — and, when
`GUEST_ANALYSIS_LIMIT_ENABLED=true`, refuses the second with **402 `GUEST_LIMIT_REACHED`**; the
analyzing page then shows a sign-in gate instead of an error, and signing in reruns the trigger
with the session. Nothing the page's JavaScript holds is the authority; a cleared cookie starts
over and that is accepted — this is a soft entitlement boundary for one free report, not
anti-fraud identity. No fingerprinting, no IP joins.

**Claiming.** When a request carries both a session and the guest cookie — `GET /me` on sign-in,
or a signed-in `POST /analysis` — every unclaimed analysis with that `guest_id` is assigned to
the `user_id` (`claimGuestAnalyses`; `/me` reports `claimedGuestReports`). The person's reports,
flags and history follow them, and the claimed analysis counts toward the monthly quota
(`getMonthlyAnalysisCount` is by `user_id`), so the allowance is one guest report **within** the
ten, not on top of them. A guest viewing their own report sees a nudge under the nav — "Sign
in to keep this report" (wall off) or "This was your free report as a guest (1 of 1)" (wall on)
— from `guest` on `GET /analysis/:token`, returned only when the cookie matches the row.

**The flag.** `GUEST_ANALYSIS_LIMIT_ENABLED` defaults to off. The cookie, the count, the claim and
the nudge run either way; only the refusal waits. Switch it on when custom SMTP is set (BACKLOG
§2) — until then the wall would push guests into the rate-limited built-in mailer.

**Either side of the migration.** Until `guest_id` exists, the count reads null (the wall lets
through), marking is a no-op, claiming returns 0, and the nudge does not appear.

**Alternatives considered**

| Option                              | Why not                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| localStorage / a client-minted id   | Client-controlled; the API cannot count against something the page can rewrite.     |
| Fingerprinting or IP joins          | Privacy and complexity out of proportion to one free report.                        |
| Enforce now                         | The sign-in the wall demands depends on email delivery that is not yet reliable.    |
| Leave guests uncounted (status quo) | Signing out was a quota bypass and guest reports could never be owned or dismissed. |
| Guest report free on top of the ten | The commercial promise is ten free a month; the claimed report is one of them.      |

### D-117 · Comps must be the subject's kind of dwelling; the type is read back out of what the scrapers stored

**Chosen (2026-09-16, found on a live run).** 1 Caldow Road — a $2.5M, 2,000 sqft detached in
Forest Hill — was priced at **$2,616/mo "high confidence"** from ten two-bedroom condo ads in
M5N, and the whole investor verdict rested on it. The comps query matched on FSA, bedrooms and
recency alone; `rental_listings` has no dwelling-type column. Each source does carry the type,
just not in a column — rentals.ca in `raw_json.listingType` (`residential:house:town-house`),
Kijiji in the ad's URL category and in the title the scraper stores at the front of `address`,
PadMapper in its `/buildings/` path — so `lib/compUnitType.ts` reads it back at query time:
**apartment / house / townhouse / house-unit** (a floor of a house let on its own) **/ basement
/ room / unknown**, structured field first, then title words, then the source's category.

The subject's need comes from its listing's `propertyType`: condo → apartment, detached and
semi → house, townhouse → townhouse; multiplex, commercial and unknown ask for nothing. Each
pair gets a **fifth similarity factor** (D-109's four stay): the same type 1; a near type
(townhouse for a house or an apartment, a floor of a house for an apartment) 0.5; a comp whose
type could not be read 0.7; the other market — an apartment for a house — **0, and dropped
before the count decides whether to widen the search**, so a house in an FSA of condo ads
widens by radius rather than pricing off them. A room is never a whole-unit comp; a basement
is not one for any subject that stated its type. **Confidence is capped at medium** when fewer
than three comps are the subject's own type, whatever the count says. The band's rows carry
`unitType`, the estimate carries `unitTypes {subject, matched, near, unknown}`, the comps table
shows a Type column with one sentence on the match, and the Sources ledger's rent row says
"13 of 14 the same dwelling type (house)". Analyses from before D-117 carry neither and read as
before; a listing that stated no type claims nothing.

**What it did to Caldow.** The FSA pass now finds nothing of the right type and the 5 km pass
returns 14 houses at $2,563 medium confidence — still wrong for Forest Hill, and the rows show
why: they are Scarborough and North York house ads whose Kijiji titles ("South Cedarbrae",
"Bendale-Glen Andrew") the geocoder placed in midtown postal codes. That is a scraper-side
geocoding fault, not a matching one, and is logged in BACKLOG §5 as the next fix; the type
filter makes it visible instead of averaging it away.

**Alternatives considered**

| Option                                     | Why not                                                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| A `unit_type` column + backfill migration  | A human gate for what the stored columns already say; the classifier can move into the nightly job later without changing the report. |
| Down-weight the other market, never drop   | Ten apartments at 0.2 weight still made the band for a house and still let the count reach "high".                                    |
| Filter on type only, no near/unknown tiers | Kijiji titles that say nothing would have vanished for every condo in Toronto — most of the table.                                    |
| Leave it and note it in the ledger         | The verdict, score and cash flow all inherit the rent; a footnote does not fix a hard pass built on the wrong market.                 |

### D-118 · The engine's plausibility checks are shown on the report, in their own words

**Chosen (2026-09-16, found on a live run).** `calculations/sanity.py` runs after every analysis
— cap rate outside 0–20%, break-even rent more than 3× the market rent, cash flow beyond ±$20k,
and the rest — and CLAUDE.md §12 has always said a failure is "shown as a flag in the UI".
It was not: the engine returned `has_sanity_warnings: true`, the API stored it, and nothing
rendered it. 1 Caldow Road failed two checks and the report showed −0.59% and −$12,228 as if
nothing had fired. The engine now returns **`sanity_warnings: list[str]`** beside the boolean
(empty when every check passed), the API carries it as `Analysis.sanityWarnings` and stores it
with the analysis, and **`SanityNotice`** renders the sentences above §01 on the investor and
landlord reports — "2 figures failed a plausibility check", the checks' own words, and one line
saying the numbers still show because a failed check usually means an input is wrong for this
property, not the deal. An analysis stored before D-118 has only the flag; it gets the notice
without the list. The personal-buyer and tenant reports do not show it: the checks are on
investment figures those reports do not display.

The sentences are the engine's (`"Cap rate -0.59% is outside the expected range (0%–20%). Check
rent and purchase price inputs."`) — they were written for a reader, name the figure and say
what to verify, and copying them into the client would be a second source of truth.

**Alternatives considered**

| Option                                | Why not                                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| Hide or blur the failed figures       | The reader needs to see what the inputs produced to know what to fix.                    |
| Suppress the score when a check fails | A 3/100 on a $2.5M house is a true statement about the inputs; the notice explains it.   |
| Rewrite the sentences in the client   | Two wordings of one check drift; the engine's are already reader-facing.                 |
| Show on every mode                    | A cap-rate warning on a personal-buyer report explains a figure that report never shows. |

### D-119 · A Kijiji ad is placed by its neighbourhood, not by geocoding its title; every geocode is relevance-gated

**Chosen (2026-09-16, found on D-117's live run).** Kijiji's card gives a title and a location —
"Bendale-Glen Andrew, City of Toronto" — and the nightly pipeline geocoded the two joined as
one string. Mapbox does not know most Toronto neighbourhood names; it answered with the nearest
thing it could match, at low relevance, and that point's postal code filed the ad. Scarborough
houses landed in M4S and M4W, "SPACIOUS 2 BED SUITE" landed in Laval, and 1 Caldow Road's 5 km
comps were Scarborough ads. The placement rules now live in `services/scrapers/geocoding.py`:

1. a postal code in the ad text → the address as one;
2. a **street address in the title** ("… 155 Wellesley Street East …") → Mapbox as an
   `address` type across the GTA, accepted only when the answer carries the **same house
   number**, biased toward the neighbourhood when one is known (Toronto has a Dale Avenue in
   Rosedale and one in Guildwood);
3. a name in the **City of Toronto neighbourhood table** → its centroid, no call at all;
4. any other name → Mapbox as `neighborhood`/`locality` types inside the Toronto box, above
   a floor tuned for that query shape (0.65 — a correct Scarborough answer scores 0.70 because
   "Toronto, Ontario" match context, not the feature);
5. nothing locatable → **no coordinates and no postal code.** Out of the comps, not in the wrong
   market.

The table (`data/toronto_neighbourhoods.json`, 174 names) is the City of Toronto's open
Neighbourhoods dataset — the 158 of the 2021 revision plus the 16 names from the 2016 set that
did not survive it, since Kijiji uses both ("Mount Pleasant West") — with the area-weighted
centroid and the postal code Mapbox reverse-geocodes there, built once by
`scripts/_build_toronto_neighbourhoods.py`. Matching normalises "The Annex" → Annex and
"Church & Wellesley" → Church-Wellesley and accepts a unique containment ("Clairlea" →
Clairlea-Birchmount); two candidates is no match. The Kijiji card now stores its title and
location apart in `raw_json`, and every placed row records its method in `raw_json.geocode`.
For every source, a Mapbox answer below 0.8 relevance is discarded (street addresses from
rentals.ca and PadMapper score 0.9–1.0).

**The backfill.** `regeocode_kijiji.py` re-placed the 4,739 stored Kijiji rows on 2026-09-16
(dry run, then `--apply`): 1,974 by a street in the title, 1,967 by the table, 359 by a Mapbox
neighbourhood, 6 by a postal code in the text, **433 unplaced** — rows whose text names nothing
locatable ("Jameson Avenue Apartments", "Yonge&Steeles"), whose old points were guesses. 2,994
rows changed; each keeps its previous lat/lng/postal code in `raw_json.geocode_prev`. The nightly
upsert re-places every ad it sees again, so live ads correct themselves without the script.
Caldow's 5 km comps went from Scarborough ads at $2,563 to eleven houses in M5P/M6E/M6C/M5M at
$2,948, still medium confidence — now an honest thin sample rather than the wrong market.

**Alternatives considered**

| Option                                          | Why not                                                                                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevance gate alone, still geocoding the title | Relevance did not separate right from wrong on ad copy (0.59 right, 0.48 wrong, 0.73 right); the type and box constraints and the house-number check do. |
| Visit each ad page for its own coordinates      | 4.7k page loads at politeness delays every night, against a site that blocks datacentre IPs; the neighbourhood is on the card.                           |
| Keep an unplaceable row's old point             | "SPACIOUS 2 BED SUITE" at H7N was a Laval comp for downtown; a missing row costs one comp, a wrong one poisons a band.                                   |
| A `neighbourhood` column + migration            | The card's location already travels in `raw_json`; a column can follow when something queries by it.                                                     |

### D-120 · Kijiji's house and townhouse feeds are crawled nightly; the card's own attributes are read

**Chosen (2026-09-17, supervised live run).** The comps table was thin on whole houses because
the nightly job read only the first two pages of Kijiji's long-term rental feed — about 90 of
~7,350 Toronto ads, in whatever order Kijiji ranked them. Kijiji has no houses category (the old
`b-house-rental` slug returns "no results in all categories"; c37 is now "Apartments, Condos &
Houses"), but its **Unit Type filter is a path segment**: `/b-apartments-condos/toronto/house/
page-N/c37l1700273a29276001` holds ~418 house ads and `/townhouse/` ~90. The Kijiji source now
reads the unfiltered feed as before and then those two feeds to their own depth
(`KIJIJI_UNIT_TYPE_FEEDS`, `KIJIJI_UNIT_TYPE_MAX_PAGES` = 5, env-overridable like the other load
knobs). An ad in both feeds is one row — the upsert keys on `source_url`.

The card markup has changed since the selectors were written: every card now carries labelled
attribute items (`li[aria-label='Bedrooms' | 'Bathrooms' | 'Unit type' | 'Size (sqft)']`). The
parser reads them — beds from the attribute when present, else the free-text rule; baths and
sqft, which Kijiji rows never had; and the **poster's unit type** into `raw_json.unit_type`
(Apartment, Condo, House, Townhouse, Basement, Duplex/Triplex). The API's classifier (D-117)
reads that label ahead of the title and the URL category, except that a title saying _basement_
or _room_ outranks it — posters tag a basement let "in a house" as House.

**The run.** From this machine, 12 pages, none blocked: 466 raw → 356 unique rows upserted,
**183 houses and 87 townhouses**, beds on every row, sqft on 88%, baths on every row; placed
208 by the neighbourhood table, 51 by a street in the title, 55 by Mapbox neighbourhood, 42
unplaced. 1 Caldow Road's 5 km comps went from 11 to 23 (17 houses), median $2,895 — Kijiji's
house ads near Forest Hill are mostly two- and three-bed semis at $2,300–$3,750, which is what
the table now says instead of pricing a 2,000 sqft detached off condo ads.

**Alternatives considered**

| Option                                | Why not                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| Deepen the unfiltered feed instead    | 10 more pages a night for ~5 houses each; the filtered feed is all houses.      |
| Trust the poster's unit type outright | "2-Bedroom Walkout Basement Apartment" was tagged House on the first live page. |
| Keep parsing beds from free text only | The attribute is the poster's own field; the text rule stays as the fallback.   |

### D-121 · The tenant score counts less of the rent gap when the comp set is thin, and says so

**Chosen (owner go-ahead 2026-09-18).** The tenant score's largest input (50 of 100 points) is
the asking rent against the comp median, and a median of five ads moves when one ad drops out:
on 2026-09-18, 25 Holly St went from **67 "Negotiate first"** to **"Overpriced — push hard"** on
the same $2,750 ask because the set went from six comps at $2,600 to five at $2,451. Nothing
about the unit changed; the sample did.

Below `RENT_SAMPLE.FULL` (8 — the API's own "high confidence" threshold) the **gap above the
median is scaled by compCount / FULL** before it meets the fairness curve: five comps count
62.5% of the gap, one comp 12.5%. A rent at or below the median is never marked down for a thin
sample — the tenant is not penalised for renting where few ads are posted. The score carries
`rentSampleWeight` and `compCount`, and the hero prints one line under the verdict when
something was damped: _"Thin sample: 5 comparables — 63% of the gap above the median is
counted."_ Nothing is printed at a full sample or when the rent is under the median. Holly now
reads **58 · Negotiate first**, and the six-comp and five-comp cases land within ten points of
each other in the same band.

The weights and the curve remain the provisional calibration the file has always declared;
this changes how much a thin sample is allowed to say, not what a full one says.

**Alternatives considered**

| Option                               | Why not                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------ |
| Shrink the score toward 50           | Marks a plainly under-median rent down to "negotiate" for having few neighbours' ads.      |
| Suppress the score under eight comps | The §01 empty state exists for zero comps; five real comps are evidence, just less of it.  |
| Show a band instead of a number      | A range under a gauge needs a design; the note says the same thing in the existing layout. |
| Raise the API's comp minimum         | Would drop the rent band, the negotiation target and §01 along with the score.             |

### D-122 · Provenance on the tenant and personal reports' own tiles; the "read" date moves with a re-analysis

**Chosen (owner go-ahead 2026-09-19).** D-111 put "listing says / you entered / calculated ·
N assumed" on the investor and landlord tiles and a "Listing facts from realtor.ca · read …" line
under their address. The tenant and personal reports had neither, though their headline figures
rest on the same kinds of source. Now:

- **Both heroes** carry the source line (`ListingSourceLine`, shared with the investor hero
  instead of three copies of the same markup).
- **Tenant**: _Asking_ is `listing says` / `you entered`; _Your target_ is `calculated`, and
  its hover says what it is — "25th to 50th percentile of 5 asking rents in the same postal
  area, medium confidence. Asking rents, not signed leases." (`rentTargetProvenance`; the
  radius is named when the search widened).
- **Personal**: _Asking_ is `listing says` / `you entered`; _Est. monthly cash outflow_ is
  `calculated · N assumed`, N being the §01 rows whose basis is _estimated_ — insurance,
  utilities, maintenance — counted by the same rule as §01's modelled share (D-114): an
  aggregate row once, its indented breakdown not again (`cashOutflowProvenance`).

The `Provenance` type moved to `types/analysis.ts` so the shims' data can carry one, and
`assumed` widened from ledger rows to any labelled input. The badge and its tone are unchanged.

**A bug the line exposed.** `saveListing` upserts by URL and never wrote `scraped_at`, so the
column kept its insert-time default: a listing first read Sep 16 and re-analysed Sep 19 still
said "read Sep 16, 2026" while the numbers were from today's page. The upsert now writes the
read time every time.

**Alternatives considered**

| Option                                       | Why not                                                                                                              |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Badges on every tenant / personal row        | §01's cost rows already say their basis (D-114) and the tenant cost lines say "(est.)"; the hero tiles were the gap. |
| Count the utility sub-rows as assumed inputs | Four badges' worth of "assumed" for one modelled row; §01's share counts it once.                                    |
| Leave `scraped_at` as the first read         | The line claims a date; a stale one is a false claim, not a conservative one.                                        |

### D-123 · The financing slider says what its base rate is and when it was read; the exit scenarios report IRR

**Chosen (owner go-ahead 2026-09-20).** Two roadmap rows from the report audits, both pure code:

**Rate provenance.** The analysis runs at the Bank of Canada prime rate the API fetched (or a
still-fresh cached one, or PropScout's default when the feed was down, or the contract rate a
landlord entered — D-108), and the ledger's `mortgage_rate` row has recorded which since D-088.
The slider said "vs Base +0.00%" without saying what the base was. `lib/rateProvenance.ts` turns
that row into one sentence under the slider — _"Base 4.45% is the Bank of Canada prime rate, read
Sep 15, 2026. A quoted mortgage rate will differ — set yours here."_; the cached, default and
you-entered cases each have their own wording. The rate in the sentence is the slider's own base,
so the two cannot disagree. A report with no ledger (a demo route, or one saved before D-088)
shows nothing rather than a guess.

**IRR.** The exit scenarios (D-110) reported "a year, on your cash" as the simple annualised
multiple, (cashOut / cashIn)^(1/years) − 1, which treats every dollar of a hold's shortfall as put
in at closing and every dollar as returned at the sale. `lib/irr.ts` solves the internal rate of
return on the dated stream instead — the cash invested at closing, each year's cash flow when it
happens, the net proceeds in the final year — by bisection on NPV. The card's row is now **"IRR,
before tax"**, with the footnote saying what it counts. The change moves the demo's flat path
from −5.4% to −9.0% a year and its base path from +1.0% to +1.5%: on a losing hold the late
shortfalls had less time in the deal, so losing the same amount is a worse rate; on a winning one
the same timing works the other way. A total loss reads −100%; nothing put in reads null. The
simple figure stays on the scenario object for anyone who wants it; the card no longer shows it.

**Alternatives considered**

| Option                                    | Why not                                                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Monthly cash flows in the IRR stream      | 240 periods for the same answer within rounding; the equity chart and the exit table are yearly.         |
| Newton's method                           | Converges faster but can diverge on a stream with small early flows; bisection on a monotone NPV cannot. |
| Show both the multiple and the IRR        | Two annual rates for one row invites the wrong one to be quoted.                                         |
| Fetch the rate on the client for the note | The number that ran is the one to name; the ledger already has it with its fetch time.                   |

### D-125 · Launch fixes: two purchasable tiers, protected report edits and verified billing state

**Implemented for owner-requested launch remediation, 2026-09-23; deployment pending.**
The owner requested implementation of the regression findings. New purchases offer Free and
Investor Pro at CAD $10/month. Annual, Professional and Team offers are deferred until their
checkout and differentiating features are verified. Existing paid tier identifiers remain
recognized so this does not revoke legacy access. Planned portfolios and white-label exports
are no longer used to sell the current plan. The §4 roadmap matrix is superseded for launch.

Anonymous and free viewers receive the first decision sentence from the API; authenticated
paid viewers receive the complete narrative. Public share links follow the viewer's tier.
The export route checks paid access, then supplies only the report payload to a dedicated
print entry point, avoiding an unauthenticated renderer's paywall. Owner value and facade
changes require a verified report owner. Failed facade persistence reports an error.

Stripe webhook failures return a retryable error. Subscription updates read current Stripe
state and map the actual price to the tier; database write failures cannot be acknowledged
as successful fulfillment. Activation, cancellation and status changes must still be
verified in Stripe test mode before launch. No production configuration is changed here.

Toronto municipal transfer-tax brackets now include the missing $250K–$400K band and the
April 2026 high-value bands for one/two single-family residences. The frontend GDS screen
uses 39% and includes $150 monthly heating, matching the calculation engine's assumptions.
It is labelled a screen, not a mortgage approval. Sample reports disclose demonstration data;
known demo arithmetic, navigation and mobile layout inconsistencies are corrected.
