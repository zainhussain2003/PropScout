# PR10 — Landing Page Humanization + Accent Token Revision

## Context

The current landing page reads as AI-generated and does not read as real estate. Three root causes:

1. **The palette is the AI-default cluster.** Warm cream + serif italic display + terracotta accent is the most recognizable AI-generated design look right now — and `#D97757` is Anthropic's own Claude brand color. The site is visually indistinguishable from a Claude-built template.
2. **Zero real estate imagery.** No property photos, no maps. The four mode cards use empty gradient placeholder blocks where product screenshots belong.
3. **Clever-clever marketing copy.** Italicized accent words in every headline, puns, and the "coffee" cliché. The _report_ voice (direct, adversarial, specific — "Do not sign at $2,150") is excellent; the marketing copy should sound like the report, not like a copywriting exercise.

This PR fixes all three. It is a **token value change + landing page content overhaul**. It is NOT a rebrand: the token architecture, fonts, layout system, and all report logic stay intact. Reports inherit the new accent automatically via `tokens.css`.

**Bonus:** this PR resolves the logged WCAG AA issue (`btn-primary` terracotta-on-white at 3.12:1). The new accent passes AA and AAA. Update the known-issues log accordingly.

---

## Pre-flight (mandatory, before writing any code)

```
git fetch origin main && git merge origin/main
```

Create branch `pr10-design-humanization`. Read `docs/DESIGN_README.md`, `docs/CLAUDE.md`, and `apps/web/src/styles/tokens.css` before touching anything.

---

## Part 1 — Token changes (`tokens.css`)

These propagate to all 13 surfaces automatically. Change VALUES only — never rename tokens, never add hardcoded hex in components.

### Light mode

| Token          | Old       | New       | Rationale                                                                                                                                                                                                  |
| -------------- | --------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--accent`     | `#D97757` | `#1F4E68` | Deep harbour blue. ~8.9:1 on white — passes AA and AAA. Trust register of Canadian real estate/finance (Realtor.ca, the banks). Does not collide with pass/caution/fail hues the way green or brick would. |
| `--accent-ink` | `#FFFFFF` | `#FFFFFF` | Unchanged — now compliant.                                                                                                                                                                                 |
| `--bg`         | `#F1ECE2` | `#F4F2ED` | Nudge the cream toward neutral limestone — 3 points cooler, keeps warmth, sheds the "Anthropic cream" association. Subtle; do not go pure white.                                                           |
| `--bg-elev`    | `#FBF7EE` | `#FAF8F3` | Match the bg shift.                                                                                                                                                                                        |

**Do not touch:** `--ink`, `--ink-2`, `--muted`, `--line`, `--line-strong`, `--surface`, `--pass`, `--caution`, `--fail`, all radii, shadows, spacing. The verdict color system (sage/amber/clay) is good and stays exactly as-is.

### Dark mode

Update the `[data-theme="dark"]` accent to a lightened variant of the new blue that passes AA on the dark surface — target `#6FA3C4` or similar; verify contrast ≥ 4.5:1 against the dark card surface before committing. Do not leave dark mode on terracotta.

### Add one new token

```css
--accent-soft: rgba(31, 78, 104, 0.08); /* tinted fills — chips, hover washes, card headers */
```

Use this wherever the old design used a pink/terracotta gradient wash.

### Verification after token change

- All hover states (0.15s ease → accent) now go blue. Verify on buttons, chips, comp markers, nav links.
- Financing sliders, active input borders, Pro badges in all four reports pick up blue automatically. Open each report and visually verify — **no component code changes should be needed**. If any component fails to pick up the new accent, that component has a hardcoded hex — fix it to use the token and flag it in the PR notes as a token-discipline violation found.
- Snapshot tests will break on color values. This is expected. Update snapshots deliberately, one file at a time — do not blind-update.

---

## Part 2 — Kill the italic-accent-word device in marketing copy

The Instrument Serif italicized word inside headlines ("_really_", "_actually_", "_we ask once_") is the single most recognizable AI-design tic. Rules:

- **Landing page marketing headlines: zero italicized accent words.** Set headlines in Instrument Serif roman, full stop.
- **Keep** the wordmark "Prop*Scout*" (Scout in italic) — that's the brand mark, not the tic.
- **Keep** italic in report section questions ("Is the rent _fair_?") — inside the product it's a functional signature, and changing it touches all four reports. Out of scope.
- Fonts do not change in this PR. Instrument Serif / Geist / Geist Mono stay.

---

## Part 3 — Copy rewrites (use these verbatim)

Do not generate replacement copy. Use exactly what's below. Where a section isn't listed, apply the voice rules at the end of this part.

### Hero

**Old:** "Know what any Canadian listing is _really_ worth — before you sign."
**New:** "Know what a Canadian listing is worth before you sign anything."

**Old subhead:** "Paste any listing. Whether you're renting, buying a home, hunting an investment, or pricing out your own unit — PropScout returns a full, plain-English report in under sixty seconds. Comps, costs, risks, sun path, and a written verdict. Canadian rules. Real money."
**New subhead:** "Paste a Realtor.ca or Zillow link. In under a minute you get rental comps from live Ontario data, true monthly costs with the OSFI stress test applied, risk flags, and a written verdict. Built for Canadian rules — semi-annual compounding, land transfer tax, CMHC — not US math with a maple leaf on it."

### Section 2 (mode cards)

**Old:** "Whoever you are, _we ask once_."
**New:** "One link. One question. Four different reports."

**Old body:** "PropScout auto-detects whether your listing is for sale or for rent, then asks one routing question. Every section, calculation, and verdict downstream is tailored to that answer."
**New body:** "PropScout detects whether the listing is for sale or for rent, then asks who you are. A tenant, a buyer, an investor, and a landlord need different answers from the same address — so the entire report changes shape."

Card titles stay as-is (they're good: "I'm looking at a rental", "I'm buying a home to live in", etc.).

### Section 3 (feature grid)

**Old:** "The work an analyst does in a morning — _in the time it takes to make coffee_."
**New:** "Every number in the report has a source, a date, and a method."

**Old body:** "Each section pulls from a different source, then writes itself into the report in the same vocabulary. No tabs to remember, no copy-paste to spreadsheets."
**New body:** "Rental comps scraped nightly from Rentals.ca, Kijiji, and PadMapper. Rates from the Bank of Canada feed. Schools from EQAO and Fraser Institute. Walkability from Walk Score. When a number is low-confidence, the report says so instead of guessing."

Feature card copy (Risk flags, Live rental comps, Canadian rules, Schools, SunScout, Share/export) is already concrete and good — keep, but strip any em-dash-heavy sentences down to plain periods where it reads listy.

### SunScout section

**Old:** "How much light _actually_ reaches each window — by hour, by month, every season."
**New:** "How much direct sun each window gets, by hour and by month."

### How-it-works section

**Old:** "From listing URL to written verdict _in under sixty seconds_."
**New:** "Three steps. Under sixty seconds."

### Pricing

**Old:** "Free for renters. _Real money for serious money._"
**New:** "Free for renters. Paid tiers for people running numbers."

### FAQ

**Old:** "If you've already asked yourself this, _good_."
**New:** "Questions people ask before trusting a verdict."

**Old body:** "Real estate is high-stakes. We over-document because you should."
**New body:** "The methodology behind every number, and the honest limits of what a report can tell you."

### Voice rules for anything not listed above

- Concrete over clever. Numbers, sources, city names (Vaughan, Hamilton, Etobicoke — Ontario places, not generic).
- Cut em dashes hard. Max one per paragraph. Prefer periods.
- No rhetorical winks, no "good.", no addressing the reader's cleverness.
- Active voice, plain verbs. The register is the report's register: direct, adversarial on the user's behalf.

---

## Part 4 — Replace every placeholder block with real product imagery

This is the highest-impact change on the page. A real estate site must show real estate.

### 4a. Mode cards (section 2) — the four gradient placeholder blocks

Replace each pink gradient block with a **cropped screenshot of the actual report** for that mode. All four report UIs exist (PR4–PR6). For each:

1. Run the app locally with demo data (`token=demo` path).
2. Screenshot the most characteristic section of each report at 2x:
   - Tenant card → the negotiation target block or tenant score gauge
   - Personal buyer card → the true monthly cost breakdown
   - Investor card → the financing sliders + deal score gauge
   - Landlord card → the rent positioning / yield block
3. Crop tight, place inside the card header area with `border-radius: var(--radius-sm)`, subtle `--line` border, slight top-crop so it reads as a peek into the product.
4. Store under `apps/web/public/marketing/` as optimized WebP, with 2x variants.

If screenshotting inside this session isn't possible, build the image slots with correct dimensions and a `TODO(zain): capture screenshot per spec above` comment, print **HARD STOP**, and list exactly which four screenshots are needed.

### 4b. Hero — add a real map

Below or beside the embedded sample report, add a **Mapbox static map** of a GTA neighbourhood with 4–6 comp diamond markers in the new accent blue, styled to match the comp map inside the reports. Use the Mapbox Static Images API with the existing `VITE_MAPBOX_TOKEN`. A map is the fastest possible "this is real estate" signal. Light style, warm-toned if a matching style exists; do not introduce a saturated default Mapbox look.

### 4c. Photography rule

If any lifestyle/property photography gets added now or later: Ontario vernacular only — brick semis, postwar bungalows, condo glass, winter-legal streetscapes. No US stock (palm trees, US mailboxes, HOA lawns). Prefer the Street View Static API (already in the stack) pulling real Ontario exteriors over stock photos. No photos of people smiling at laptops.

---

## Part 5 — Add a founder note section (new)

Insert between the feature grid and SunScout. This is the most human element available and it is true. Structure:

- Section tag: `WHY THIS EXISTS`
- Short heading: "Built by one person who got burned by a bad listing." _(Zain: edit this to your actual story — placeholder framing only. The section ships with your words or it doesn't ship.)_
- 3–4 sentences, first person, plain. What it should cover: you're a solo developer in Ontario, you built this because the numbers on listings don't tell the truth, and every formula in the engine is documented and testable. No stock portrait required; a small ScoutMark or a plain signature line is enough.
- One line of provenance: "PropScout is independent. No brokerage owns it, no listing site pays it."

**HARD STOP after building this section's shell** — do not invent biographical details. Wait for Zain's actual copy.

### Social proof rule

Do **not** add testimonials, review stars, or client logos. There are none yet, and fabricated ones are worse than absence. The trust surface is: real usage numbers (keep "2,400 listings analysed last week" only if the number is real and wired to real data — otherwise remove it), data provenance, and methodology transparency.

---

## Part 6 — One asymmetric layout moment

The page is currently all equal-weight symmetric grids (2×2, 3×2, 4-col), which reads generated. Make exactly **one** deliberate break: in section 2, make the tenant card (the free funnel, the acquisition engine) visually dominant — roughly 60% width on desktop with the other three stacked at 40%, or a full-width tenant card with the three paid modes in a row beneath it. Everything else stays disciplined. Do not add new animations; the existing motion system is sufficient and more motion increases the AI-generated feel.

---

## Out of scope — do not touch

- Calc engine, calibration constants (Vaughan $3,326.64 / LTT $11,073 / OSFI 6.79% / deal score 8/hard_pass / cap rate 1.47%), any Python.
- Report page structure, section order, report copy, the italic device inside report section questions.
- Fonts, spacing tokens, radii, shadows, verdict colors.
- `MONTHLY_ANALYSIS_LIMIT`, paywall logic, auth stubs, DevToolbar.
- Mode Modal logic, routing, API contracts.

---

## Testing and gates

1. `npm run typecheck --workspace=apps/web` and `npm test --workspace=apps/web` — all green. Snapshot updates reviewed individually, not bulk-accepted.
2. Contrast verification: `btn-primary`, `btn-accent`, verdict pills, and dark-mode accent all ≥ 4.5:1. Record the measured ratios in the PR notes. Mark the WCAG AA known issue as resolved for `btn-primary` (full AA audit PR remains on the backlog for other elements).
3. Open all four report pages with demo data and visually verify the accent propagation, hover states, sliders, and gauges. Zero component code changes expected — flag any hardcoded hex found.
4. Write `PR10-UI-Tests.md` — Chrome UI test file, fully self-contained, no attachments, covering: token propagation on landing + all four reports (light and dark), mode card screenshots render, Mapbox static map loads, mobile 380px pass on all changed sections, hover states, and the pricing/FAQ copy changes.
5. On any failure: print **HARD STOP** and wait.
6. Update `MVP_TODO.md` checkboxes and `DESIGN_README.md` token table (old→new values, with rationale) so docs don't go stale.
7. No push, no merge without explicit approval.
