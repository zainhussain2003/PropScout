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
