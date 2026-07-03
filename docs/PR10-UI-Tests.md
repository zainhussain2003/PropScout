# PR10 Chrome UI Test Checklist — Design Humanization

**Generated:** 2026-07-02
**Branch:** pr10-design-humanization (from feat/combined-route-wiring-and-status)
**Total tests:** 48
**Browser:** Chrome (latest stable)
**Executor:** Claude Code in Chrome
**Dev server:** `http://localhost:5173` (Vite) + Fastify API on 3001

> ⚠ **This document is for Claude to execute in Chrome.** Each TC is a discrete browser
> action. Execute in order within each block; record each result immediately.

> ⚠ **Dark mode:** toggle via the moon button in the Nav, or DevTools console:
> `document.documentElement.setAttribute('data-theme','dark')`. Reset with
> `document.documentElement.removeAttribute('data-theme')`.

> ⚠ **Live report tokens:** any four recent `share_token` values covering the four
> modes (query `analyses` ordered by `created_at desc`). Tokens used on the
> 2026-07-02 verification run:
>
> | Mode       | URL                                       |
> | ---------- | ----------------------------------------- |
> | investment | `/r/9d3eaa6f-2faa-4bd2-8e61-8746e9a0fb35` |
> | tenant     | `/r/102e88f7-fc39-47f4-a9c1-10f1e24a7352` |
> | personal   | `/r/1b928256-6c0f-4458-8a46-62b7a602c8f9` |
> | landlord   | `/r/34ce888e-ac37-404b-8439-99b330c4ebbb` |
>
> Share tokens expire 30 days after creation — regenerate by pasting a Realtor.ca
> URL on the landing page if these 404/410.

**Expected accent everywhere:** harbour blue `#1F4E68` light / `#6FA3C4` dark.
**Any terracotta `#D97757` sighting outside the prototype HTML files is a FAIL** —
it means a hardcoded hex bypassed the token system.

---

## Block 1 — Token propagation, landing (light)

| TC  | Action                                                 | Expected                                                                   |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| 1.1 | Load `/`                                               | Page bg is limestone `#F4F2ED` (not warm cream); no terracotta anywhere    |
| 1.2 | Inspect "Start free" nav button                        | Ink background at rest; hover transitions to harbour blue over 0.15s       |
| 1.3 | Hover each nav link (How it works … FAQ)               | Text color transitions to harbour blue                                     |
| 1.4 | Inspect "Live in Ontario" chip + section eyebrows      | Mono eyebrows render in harbour blue                                       |
| 1.5 | Tab through hero URL input + Analyze button            | Focus rings/borders take the blue accent, never terracotta                 |
| 1.6 | Inspect hero showcase tenant gauge + "Save report" CTA | Gauge/accent elements blue; verdict pills keep sage/amber/clay (unchanged) |

## Block 2 — Landing copy (verbatim per PR10 spec)

| TC  | Action                         | Expected                                                                                                       |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 2.1 | Read hero H1                   | "Know what a Canadian listing is worth before you sign anything." — **no italic accent word**                  |
| 2.2 | Read hero subhead              | Mentions OSFI stress test, risk flags, "not US math with a maple leaf on it"                                   |
| 2.3 | Read section-2 header          | "One link. One question. Four different reports." — no italics                                                 |
| 2.4 | Read the four mode-card blurbs | Tenant "Free, no login…", personal "True monthly cost…", investor "Cap rate…", landlord "Test whether…"        |
| 2.5 | Read feature-grid header       | "Every number in the report has a source, a date, and a method."                                               |
| 2.6 | Read how-it-works header       | "Three steps. Under sixty seconds."                                                                            |
| 2.7 | Read pricing header + FAQ      | "Free for renters. Paid tiers for people running numbers." / "Questions people ask before trusting a verdict." |
| 2.8 | Check wordmark + report links  | "Prop*Scout*" italic **kept**; hero shows "Live in Ontario" with **no** "2,400 listings" stat                  |

## Block 3 — Real imagery (part 4)

| TC  | Action                                       | Expected                                                                                                |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 3.1 | Scroll to section 2, check tenant card image | Real tenant-report negotiation screenshot (Your target $1,950–$2,000/mo), not a gradient                |
| 3.2 | Check the three paid mode-card images        | Personal = true-monthly-cost table; investor = deal-score gauge "8 / Hard pass"; landlord = rent slider |
| 3.3 | DevTools → Network → filter `marketing/`     | Eight WebP requests possible (`mode-*.webp` 1x + `@2x`); all 200, each < 45 KB                          |
| 3.4 | Scroll hero showcase right column to bottom  | "Comps within 1 km" card: Mapbox static map of Yonge–Eglinton, 5 blue diamonds, © attribution           |
| 3.5 | DevTools → Network → filter `api.mapbox.com` | Static Images request 200 (`light-v11` style, geojson overlay)                                          |
| 3.6 | Comment out `VITE_MAPBOX_TOKEN`, reload      | Map card absent entirely — no broken image, no empty frame (restore token after)                        |

## Block 4 — Asymmetric layout + founder note (parts 5–6)

| TC  | Action                                   | Expected                                                                                       |
| --- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 4.1 | View section 2 at 1440px                 | Tenant card full-width dominant (~60/40 image/content); three paid modes in one 3-up row below |
| 4.2 | Check motion                             | No new animations — only the standard 0.15s hover transitions                                  |
| 4.3 | Scroll between feature grid and SunScout | Founder note **absent** (renders nothing until `FOUNDER_NOTE_BODY` holds Zain's real copy)     |
| 4.4 | Whole page                               | No testimonials, review stars, client logos, or invented usage stats anywhere                  |

## Block 5 — Token propagation, four live reports (light)

For each of the four `/r/:token` URLs above:

| TC  | Action                                         | Expected                                                                                    |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 5.1 | Load investor report                           | Section eyebrows, OSFI income slider fill, equity chart line, SunScout bars all blue        |
| 5.2 | Drag the OSFI household-income slider          | Slider thumb/fill blue (`.scout-slider` accent-color); metrics recalc live                  |
| 5.3 | Check AI verdict block + "Unlock full verdict" | Dark hero card; Pro CTA button blue; TruncatedVerdict blur intact (paywall unchanged)       |
| 5.4 | Load tenant report                             | Flag rows keep sage/amber/clay; interactive accents blue; section questions **keep italic** |
| 5.5 | Load personal report                           | HomeScore/metric accents blue; schools section unaffected                                   |
| 5.6 | Load landlord report                           | Rent-positioning slider blue; building-supply caution stays amber                           |
| 5.7 | Hover MiniMap comp diamonds (any report)       | Diamonds render blue, scale 1.18× on hover, tooltip fades in                                |
| 5.8 | Check deal-score gauge + verdict pills         | Gauge stroke uses pass/caution/fail colors by score (NOT accent) — unchanged                |

## Block 6 — Dark mode

| TC  | Action                                    | Expected                                                                                    |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| 6.1 | Landing, toggle dark                      | Accent flips to lightened blue `#6FA3C4`; accent text/icons readable on dark surfaces       |
| 6.2 | Inspect any `.btn-accent`/Pro badge, dark | Text on the light-blue fill is dark ink `#0A0D14` (white would fail AA at 2.72:1)           |
| 6.3 | Each of the four reports, dark            | Sliders, eyebrows, charts, SunScout bars in `#6FA3C4`; no terracotta remnants               |
| 6.4 | Mode-card screenshots + Mapbox map, dark  | Light-styled images sit framed on dark cards (accepted; in-report MiniMap behaves the same) |

## Block 7 — Mobile 380px (changed sections)

Set viewport 380×900 (DevTools device toolbar).

| TC  | Action                            | Expected                                                                                                                                                                                       |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1 | Landing section 2                 | Tenant card collapses to single column (image above content); paid row collapses to 1-col                                                                                                      |
| 7.2 | Hero showcase map card            | Map image scales to container width, no overflow from the card itself                                                                                                                          |
| 7.3 | Mode-card images                  | WebP images fit card width, no distortion                                                                                                                                                      |
| 7.4 | Landing overall horizontal scroll | **KNOWN PRE-EXISTING FAIL** — header nav links, #sunscout and #pricing grids overflow at 380px (predates PR10, logged in AUDIT_TRACKER); PR10-changed sections must NOT be among the offenders |

## Block 8 — Contrast spot-checks (measured 2026-07-02)

| TC  | Pairing                                   | Measured | Gate    |
| --- | ----------------------------------------- | -------- | ------- |
| 8.1 | `.btn-primary` ink text-on-bg (rest)      | 15.94:1  | ≥ 4.5:1 |
| 8.2 | `--accent` #1F4E68 on `--accent-ink` #FFF | 8.94:1   | ≥ 4.5:1 |
| 8.3 | `--accent` #1F4E68 on `--bg` #F4F2ED      | 7.99:1   | ≥ 4.5:1 |
| 8.4 | Dark `--accent` #6FA3C4 on `--surface`    | 6.39:1   | ≥ 4.5:1 |
| 8.5 | Dark `--accent-ink` #0A0D14 on #6FA3C4    | 7.14:1   | ≥ 4.5:1 |

All five are pinned by `apps/web/src/styles/btnContrast.test.ts` — a token value
change that regresses any pairing below AA fails the web suite.

---

**Verification run 2026-07-02:** Blocks 1–8 executed headless (Playwright capture,
20-screenshot matrix: 5 pages × light/dark × 1440/380) plus targeted element
screenshots. All pass except TC 7.4's pre-existing overflow, which is logged as a
known issue and excluded from the PR10 gate.
