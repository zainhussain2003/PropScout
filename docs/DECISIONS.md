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

## Open items — deliberately not done this session

Recorded so they are not mistaken for oversights.

- **`aspect-ratio` for the photo grid** (see D-005) — a cleaner fix than a pinned
  pixel height; needs the mobile collapse re-derived.
- **Comparable recent sales is empty** on real reports: _"No comparable-sales
  source yet."_ Honest, but it is a visible hole in the investor report. Needs a
  sold-price data source (Teranet is listed as out of MVP scope).
- **5-year population growth, active building permits, price-per-sqft trend** all
  render `—` on real data. Same category: honest placeholders, but three empty
  tiles in one section reads as unfinished. Consider hiding empty tiles rather
  than showing dashes, or filling them.
- **Google Places** still returns `[]` until Places API (New) + billing are enabled
  on the Cloud project, so nearby transit/grocery/highway distances stay blank.
- **`docs/MVP_TODO.md` mode naming**: the API accepts `investor` while the DB
  check constraint stores `investment`. Not a bug today (the API maps them) but a
  trap worth unifying.
