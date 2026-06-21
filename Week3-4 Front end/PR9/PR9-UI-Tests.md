# PR9 Chrome UI Test Checklist

## Route Wiring — End-to-End Manual Browser Tests

**Generated:** 2026-06-01
**Branch:** feat/pr8-legal-mobile
**Total tests:** 105
**Browser:** Chrome (latest stable)
**Executor:** Claude Code in Chrome
**Dev server:** See four-terminal setup below → `http://localhost:5173`

> ⚠ **This document is for Claude to execute in Chrome.** Each TC is a discrete browser
> action. Execute them in order within each block. Record each result immediately after
> the action before moving to the next TC.

> ⚠ **FOUR TERMINALS REQUIRED from Block 2 onwards.** Block 1 (static rendering) runs
> with Terminal 4 only. Blocks 2–11 require all four terminals running simultaneously:
>
> | Terminal | Command                                                            | Service       | Port |
> | -------- | ------------------------------------------------------------------ | ------------- | ---- |
> | 1        | `cd services/calc-engine && uvicorn main:app --port 8000 --reload` | Calc engine   | 8000 |
> | 2        | `cd services/scrapers && uvicorn main:app --port 8001 --reload`    | Scraper       | 8001 |
> | 3        | `cd apps/api && npm run dev`                                       | Fastify API   | 3000 |
> | 4        | `cd apps/web && npm run dev`                                       | Vite frontend | 5173 |

**Live test URLs:**

| Listing                    | URL                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| Ontario for-sale (Vaughan) | `https://www.realtor.ca/real-estate/29826509/ph07-5-buttermill-avenue-vaughan-vaughan-corporate-centre` |
| Ontario for-rent (Milton)  | `https://www.realtor.ca/real-estate/29835868/-113-470-gordon-krantz-avenue-e-milton-walker-1051-walker` |

**Pages under test:**

| Route                       | Component                   | Notes                            |
| --------------------------- | --------------------------- | -------------------------------- |
| `/`                         | LandingPage                 | Hero, Nav, demo flow, validation |
| `/analyzing?token=…&mode=…` | AnalyzingPage               | Polling, progress, cancel        |
| `/r/:token` (investor)      | ReportPage → InvestorReport | Full investor pipeline           |
| `/r/:token` (tenant)        | ReportPage → TenantReport   | Full tenant pipeline             |
| `/r/nonexistent-token`      | ReportPage → error state    | 404 / not-found handling         |

**Pre-test (before every block):** DevTools → Application → Clear Storage → Hard reload (Ctrl+Shift+R)

> ⚠ **Port dependency:** All TCs require Vite on port 5173. If another process occupies
> 5173, Vite steps to 5174 — update all `localhost:5173` URLs in this document accordingly.

> ⚠ **PRESERVE LOG:** Enable DevTools → Network → "Preserve log" before starting Blocks 2,
> 4, and 9. This keeps polling requests and pre-navigation requests visible after the
> browser navigates between routes.

> ⚠ **MANUAL TRIGGER REQUIRED:** TCs marked with this flag cannot be triggered through
> normal navigation. They require killing a terminal process or a DevTools console action.
> Mark as BLOCKED if the trigger is unavailable in the current build.

> ⚠ **CONDITIONAL:** TCs marked with this flag depend on pipeline timing or backend state
> that may not be fully deterministic. Skip with BLOCKED if the conditions cannot be met.

---

## Block 1 — Static Rendering (no API calls)

_Only Terminal 4 (Vite, port 5173) required for this block. Terminals 1–3 do not
need to be running._

**Landing page smoke test**

[ ] TC-PR9-001 Start Terminal 4 and open `http://localhost:5173/` in Chrome
Expected: LandingPage loads within 3 s; DevTools Console shows zero red errors;
no 404 for fonts, CSS, or JS chunks; the Hero section with the URL input bar
and "Analyze" button is visible above the fold
| PASS | FAIL | NOTES |

[ ] TC-PR9-002 Scroll the full LandingPage from top to bottom
Expected: All major sections are present — Nav (PropScout wordmark + "Sign in"
button), Hero (URL input + demo sample buttons + tagline), pricing or features
section, FAQ accordion, and Footer; no blank section gap or collapsed white area;
zero red console errors
| PASS | FAIL | NOTES |

**Dark mode**

[ ] TC-PR9-003 Click the dark mode toggle in the Nav bar
Expected: `<html>` gains `data-theme="dark"`; the page background switches from
warm cream (var(--bg) light value) to dark tokens; Nav, Hero, pricing section,
FAQ, and Footer all recolour; text and icons remain legible; no element retains
a hardcoded light colour; zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR9-004 With dark mode active, scroll the full LandingPage and inspect every visible section
Expected: The Hero gradient, feature or pricing cards, FAQ accordion rows, and
Footer all render with correct dark token values; no white box, light card, or
unreadable text patch persists; the URL input adapts its background and border to
dark surface values; toggle back to light mode before continuing
| PASS | FAIL | NOTES |

**Demo sample buttons**

[ ] TC-PR9-005 Click the first sample listing demo button (Toronto condo rental or equivalent)
Expected: The scraping progress animation starts immediately WITHOUT a network
request to the real scraper — confirm by watching the Network tab; no POST to
localhost:8001 appears during this action; a progress indicator or animation is
visible on the page; no console errors
| PASS | FAIL | NOTES |

[ ] TC-PR9-006 Click the second sample listing demo button (Hamilton duplex or equivalent)
Expected: The scraping progress animation starts WITHOUT calling the real scraper
(no POST to localhost:8001 in Network tab); the demo uses the Hamilton fixture
data; a progress animation or transition is visible; no console errors
| PASS | FAIL | NOTES |

[ ] TC-PR9-007 Complete the demo flow (either sample button) through to the ModeModal step
Expected: ModeModal opens with fixture listing data visible — the preview card
inside the modal shows an address, a price, a bed count, and a listing type chip;
the data is not empty and not "undefined"; it matches the selected demo fixture;
zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR9-008 In the demo ModeModal, click any mode card
Expected: Clicking the mode card navigates to a `/analyzing` route; the URL
contains a `token` param and a `mode` param; the /analyzing page begins to render;
demo mode may use a fixture token (not a real UUID) — that is acceptable;
no console errors
| PASS | FAIL | NOTES |

**URL validation**

[ ] TC-PR9-009 Enter `https://www.example.com/property` in the URL input and click Analyze
Expected: An inline error message appears below the input (e.g. "Paste a realtor.ca
or Zillow.ca listing URL" or equivalent); the ModeModal does NOT open; no API
call is made (zero POST requests in the Network tab during this action); the error
uses fail/clay colour styling or is otherwise visually distinct; the URL input
is not cleared
| PASS | FAIL | NOTES |

[ ] TC-PR9-010 Enter `https://www.zillow.com/homedetails/123/456` in the URL input and click Analyze
Expected: An inline error appears indicating the URL is from an unsupported site
or a non-Canadian listing; ModeModal does not open; no API call is made; the error
styling is consistent with TC-PR9-009; no console errors
| PASS | FAIL | NOTES |

**SignInModal**

[ ] TC-PR9-011 Click "Sign in" in the Nav bar
Expected: SignInModal slides in or fades in from the bottom or centre of the page;
an email input (and optionally a password field or magic link option) is visible;
the landing page is not navigated away from; no redirect to another route occurs;
zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR9-012 With SignInModal open, press the Escape key
Expected: SignInModal closes immediately on Escape; the landing page is visible
again; focus returns to the Nav or document body; no console error; no navigation
| PASS | FAIL | NOTES |

[ ] TC-PR9-013 Reopen SignInModal; click the backdrop outside the modal card
Expected: Clicking anywhere on the dimmed backdrop (not on the card itself) closes
SignInModal; the landing page is visible; no console error; no navigation; behaviour
consistent with the Escape close
| PASS | FAIL | NOTES |

[ ] TC-PR9-014 Reopen SignInModal; click the × close button inside the card
Expected: SignInModal closes; the landing page is visible; the × button is within
the card border; no console error; no navigation; behaviour matches Escape and
backdrop close
| PASS | FAIL | NOTES |

[ ] TC-PR9-015 Open DevTools Console; clear it; run all static interactions without leaving the page
(dark mode on/off, both demo buttons, ModeModal, SignInModal open and close)
Expected: After all interactions, the console shows zero red errors; no unhandled
promise rejections; no "Cannot read properties of undefined" or React render
exceptions; yellow warnings are acceptable
| PASS | FAIL | NOTES |

---

## Block 2 — Scrape Path (real scraper)

_All four terminals must be running before this block. Enable DevTools → Network →
"Preserve log" before TC-PR9-016._

**Vaughan for-sale listing**

[ ] TC-PR9-016 Paste the Vaughan for-sale URL into the URL input and click Analyze
`https://www.realtor.ca/real-estate/29826509/ph07-5-buttermill-avenue-vaughan-vaughan-corporate-centre`
Expected: The Analyze button enters a loading / disabled state immediately; a
spinner or "Analyzing…" label replaces the button text; the button cannot be
clicked again while loading; a POST to localhost:3000/scrape is visible in the
Network tab; zero red console errors during this phase
| PASS | FAIL | NOTES |

[ ] TC-PR9-017 Wait for ModeModal to open after the scraper responds
Expected: ModeModal opens with real Vaughan listing data; the preview card shows
"Buttermill" or "Vaughan" in the address, a dollar-formatted price, and a bed
count; the data is not empty, not "undefined", and not the demo fixture address;
zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR9-018 Read the listing type label in the ModeModal preview card
Expected: A label reading "Listing found · for sale" (or equivalent for-sale
indicator) is visible in the modal; it is NOT a for-rent label; the label uses
appropriate typography (Geist Mono eyebrow or chip styling)
| PASS | FAIL | NOTES |

[ ] TC-PR9-019 Count and inspect the mode selection cards in the ModeModal
Expected: Exactly two cards are visible — one investor card ("Buying it as an
investment" or equivalent) and one personal buyer card ("Buying it to live in"
or equivalent); the tenant and landlord cards are NOT present; both cards render
without broken layout or blank text
| PASS | FAIL | NOTES |

[ ] TC-PR9-020 Check both for-sale mode cards for a "Free forever" badge
Expected: NEITHER of the two for-sale cards shows a "Free forever" or equivalent
free-tier badge; investor and personal buyer analyses are not free; only tenant
analysis is free; confirm by reading both cards carefully
| PASS | FAIL | NOTES |

[ ] TC-PR9-021 With the Vaughan ModeModal open, press Escape
Expected: ModeModal closes immediately; the landing page URL input is visible;
the input still contains the Vaughan URL; no navigation to /analyzing occurs;
no analysis is triggered by the close; no console error
| PASS | FAIL | NOTES |

**Milton for-rent listing**

[ ] TC-PR9-022 Paste the Milton for-rent URL into the URL input and click Analyze
`https://www.realtor.ca/real-estate/29835868/-113-470-gordon-krantz-avenue-e-milton-walker-1051-walker`
Expected: Analyze button enters loading state; a POST to localhost:3000/scrape
appears in the Network tab; ModeModal opens with Milton listing data — address
contains "Gordon Krantz" or "Milton"; a rent or price value is visible in the
preview; zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR9-023 Read the listing type label in the ModeModal (Milton listing)
Expected: A label reading "Listing found · for rent" (or equivalent for-rent
indicator) is visible; it is NOT a for-sale label; the label clearly distinguishes
this listing type from the for-sale case in TC-PR9-018
| PASS | FAIL | NOTES |

[ ] TC-PR9-024 Count and inspect the mode selection cards (Milton listing)
Expected: Exactly two cards — a tenant card ("I'm renting this unit" or equivalent)
and a landlord card ("I own this unit" or equivalent); the investor and personal
buyer cards are NOT present; layout is correct and both cards render completely
| PASS | FAIL | NOTES |

[ ] TC-PR9-025 Inspect the tenant mode card for a "Free forever" badge
Expected: The tenant card shows a "Free forever" badge or equivalent free-tier
indicator; the badge uses pass/sage colour or a distinct chip; the landlord card
does NOT show the free badge; the badges are visually distinguishable
| PASS | FAIL | NOTES |

[ ] TC-PR9-026 Confirm no investor or personal buyer cards appear in the for-rent ModeModal
Expected: Searching the modal DOM (DevTools Elements → Ctrl+F) for "investment"
or "Buying it as" returns no match inside the modal card; for-rent listings must
offer only tenant and landlord options; no ghost card is hidden off-screen
| PASS | FAIL | NOTES |

**Province gate**

[ ] TC-PR9-027 Paste any live BC listing URL (FSA starting with V, e.g. postal code V6B)
or a BC realtor.ca URL; click Analyze
Expected: An inline error appears below the input — "PropScout is currently
Ontario-only" or equivalent province restriction message; the ModeModal does NOT
open; no navigation to /analyzing; the error is visible without scrolling; the
Analyze button returns to its default state
| PASS | FAIL | NOTES |

[ ] TC-PR9-028 With the province gate error showing, inspect the Network tab
Expected: One POST to localhost:3000/scrape is visible and returned HTTP 200;
there is NO second POST to localhost:3000/analysis; no requests to supabase.co
appear; the scrape response body contains `{ error: 'PROVINCE_NOT_SUPPORTED' }`
or equivalent; the province error is communicated via body, not via HTTP 4xx
| PASS | FAIL | NOTES |

[ ] TC-PR9-029 Clear the input; paste a valid Ontario realtor.ca URL; click Analyze again
Expected: The province gate error disappears; the Analyze button enters loading
state; ModeModal opens with Ontario listing data; no stale error message lingers
from the province gate; confirms the error state clears between requests
| PASS | FAIL | NOTES |

---

## Block 3 — ModeModal Navigation

_Re-paste the Vaughan URL and wait for ModeModal to open if it is not already.
All four terminals must be running._

[ ] TC-PR9-030 With the Vaughan ModeModal open, click the investor card ("Buying it as an investment")
Expected: ModeModal closes; the browser navigates to `/analyzing`; inspect the
full URL — it must contain both `token=` (a UUID value) and `mode=investor`;
the /analyzing page begins to render; zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR9-031 Inspect the token value in the /analyzing URL
Expected: The `token` query param is a valid UUID in the format
`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (8-4-4-4-12 lowercase hex digits with
hyphens); it is not "demo", "test", or a fixed short string; it is unique to
this analysis run
| PASS | FAIL | NOTES |

[ ] TC-PR9-032 Navigate to /; re-paste the Vaughan URL; wait for ModeModal; click the personal buyer card
Expected: The browser navigates to `/analyzing?token=[uuid]&mode=personal`;
confirm the `mode` param is exactly `personal` (not `investor` or any other value);
the /analyzing page renders; no console errors
| PASS | FAIL | NOTES |

[ ] TC-PR9-033 Navigate to /; paste the Milton for-rent URL; wait for ModeModal; click the tenant card
Expected: The browser navigates to `/analyzing?token=[uuid]&mode=tenant`;
confirm `mode=tenant` in the URL; /analyzing renders; no console errors
| PASS | FAIL | NOTES |

[ ] TC-PR9-034 Navigate to /; paste the Milton for-rent URL; wait for ModeModal; click the landlord card
Expected: The browser navigates to `/analyzing?token=[uuid]&mode=landlord`;
confirm `mode=landlord` in the URL; /analyzing renders; no console errors
| PASS | FAIL | NOTES |

[ ] TC-PR9-035 Open ModeModal (any listing); click the × close button
Expected: ModeModal closes; NO navigation to /analyzing occurs; the URL bar
is unchanged; the landing page URL input is visible; no console error; the
close is immediate with no animation delay
| PASS | FAIL | NOTES |

[ ] TC-PR9-036 Open ModeModal (any listing); click the backdrop outside the modal card
Expected: ModeModal closes; no navigation to /analyzing; the landing page is
visible behind; no console error; behaviour matches the × close in TC-PR9-035
| PASS | FAIL | NOTES |

---

## Block 4 — /analyzing Page (Polling Flow)

_Enable DevTools → Network → "Preserve log" before this block. Continue the investor
flow from TC-PR9-030 or start fresh: paste Vaughan URL → investor card → reach /analyzing._

**Page structure**

[ ] TC-PR9-037 Observe the /analyzing page immediately after navigating from ModeModal
Expected: A compact mini Nav is visible at the top showing the PropScout wordmark;
a "Cancel" or "Cancel & start over" button is present in or near the header area;
the full report nav (with Save / Share / PDF buttons) is NOT shown; the page is
not blank; zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR9-038 Read the URL strip or listing identifier on the /analyzing page
Expected: The realtor.ca listing URL or a short address excerpt ("5 Buttermill Ave"
or "realtor.ca/…/buttermill") is displayed on the page; the text is not blank
and not "undefined"; it confirms which listing is being analyzed
| PASS | FAIL | NOTES |

[ ] TC-PR9-039 Observe the progress bar on the /analyzing page
Expected: A horizontal progress bar is present and shows a non-zero fill; the
fill uses the accent terracotta colour (var(--accent)); the bar is not a raw
"0%" text substitute; the unfilled portion is visually distinct from the filled
portion; the bar is legible against the page background
| PASS | FAIL | NOTES |

[ ] TC-PR9-040 Count the steps in the step list on the /analyzing page
Expected: Exactly 8 steps are listed; each step has a descriptive label (e.g.
"Fetching listing data", "Running analysis", "Generating report"); all 8 steps
are visible; no step label is blank, "Step N", or "undefined"
| PASS | FAIL | NOTES |

**Status — pending**

[ ] TC-PR9-041 Observe step states during the 'pending' polling phase (early in the analysis)
Expected: Steps 1–2 show a completed / checked indicator (green checkmark or
solid filled circle); step 3 shows an active state (spinner, animated dot, or
highlighted ring); steps 4–8 show an inactive / waiting state (empty or dimmed
circle); the headline reflects pending status (e.g. "Setting up your analysis…"
or equivalent)
| PASS | FAIL | NOTES |

**Status — processing**

[ ] TC-PR9-042 Observe step states after status transitions to 'processing'
Expected: Steps 1–6 show completed / checked; steps 7–8 show active or in-progress;
the progress bar has advanced to a higher fill percentage than in the pending state;
the headline has updated to reflect processing (e.g. "Running your analysis…" or
equivalent); no page reload occurred — this is a React state update from a poll
| PASS | FAIL | NOTES |

[ ] TC-PR9-043 Confirm the progress bar fill advances between the pending and processing observations
Expected: The fill percentage is visibly larger in the processing state than in
the pending state; the bar never goes backwards or resets to 0% between state
transitions; the change is visible and the bar advances forward only
| PASS | FAIL | NOTES |

**Polling network behaviour**

[ ] TC-PR9-044 Watch the Network tab during the polling phase
Expected: GET requests to localhost:3000/analysis/[token] appear approximately
every 2 seconds (±0.5 s tolerance); each returns HTTP 200; the requests fire
automatically without any user interaction; at least 3 polling requests are visible
before analysis completes; no request returns 4xx or 5xx during normal operation
| PASS | FAIL | NOTES |

**Completion and navigation**

[ ] TC-PR9-045 Wait for the analysis pipeline to complete (10–30 seconds typical)
Expected: When the pipeline completes, the page automatically navigates to
`/r/[token]` without any user action; the navigation is a React Router push
(not a hard reload); the URL bar updates to `/r/[token]` format; the /analyzing
page is no longer visible in the viewport
| PASS | FAIL | NOTES |

[ ] TC-PR9-046 In the Network tab, confirm no further polling requests after navigation to /r/[token]
Expected: After the browser reaches /r/[token], wait 10 seconds; zero new GET
localhost:3000/analysis/[token] requests appear; the polling interval was cleared
on completion; at most 1 additional request immediately before cleanup is acceptable
as a race-condition allowance; the report page does not continue polling
| PASS | FAIL | NOTES |

**Cancel flow**

[ ] TC-PR9-047 Start a fresh Vaughan investor analysis; reach /analyzing; click "Cancel & start over"
before the analysis completes
Expected: Clicking Cancel navigates immediately to `/`; the /analyzing page is no
longer visible; the URL bar shows `http://localhost:5173/`; the cancellation is
instantaneous; no console errors
| PASS | FAIL | NOTES |

[ ] TC-PR9-048 After cancel, watch the Network tab for 5 seconds
Expected: Zero new GET localhost:3000/analysis/[token] requests appear after
navigating away; the polling interval was torn down on cancel / unmount; confirms
the cleanup runs correctly; no ghost polling continues in the background
| PASS | FAIL | NOTES |

**Direct navigation guards**

[ ] TC-PR9-049 Navigate directly to `http://localhost:5173/analyzing` with no query params
Expected: The page immediately redirects to `/`; no flash of the /analyzing UI
appears; the URL bar shows `localhost:5173/`; zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR9-050 Navigate to `http://localhost:5173/analyzing?token=abc` (token present, mode absent)
Expected: The page immediately redirects to `/`; confirms both `token` and `mode`
params are required; the /analyzing page does not render; no console errors
| PASS | FAIL | NOTES |

[ ] TC-PR9-051 Navigate to `http://localhost:5173/analyzing?mode=investor` (mode present, token absent)
Expected: The page immediately redirects to `/`; confirms both params are required;
the /analyzing page does not render; no console errors
| PASS | FAIL | NOTES |

---

## Block 5 — /r/[token] Investor Report

_Start a fresh Vaughan investor analysis and record the /r/[token] URL after
completion. Keep the browser at this URL for the entire block._

**Property hero**

[ ] TC-PR9-052 Read the address in the PropertyHero section at the top of the report
Expected: The address contains "Buttermill" or "Vaughan" and matches the live
listing that was analyzed; it is not the demo fixture address from the pre-wired
demo dataset; it is not empty, "undefined", or placeholder text
| PASS | FAIL | NOTES |

[ ] TC-PR9-053 Read the price displayed in the PropertyHero
Expected: A price formatted as a dollar amount (e.g. "$729,900") is visible in
the hero section; it matches the live Vaughan listing price from the scrape;
it is NOT the Hamilton fixture price ($379,000 or similar); it is not "undefined"
or "$0"
| PASS | FAIL | NOTES |

**DealScore**

[ ] TC-PR9-054 Inspect the DealScore radial gauge
Expected: The circular gauge renders with a numeric score in the centre; the score
is computed from real listing data and is NOT the constant fixture value of 9
used in the Vaughan demo dataset; the gauge arc is filled proportionally to the
score; the stroke colour matches the verdict tone; no "undefined" in the score
display
| PASS | FAIL | NOTES |

[ ] TC-PR9-055 Read the DealScore verdict label near the gauge
Expected: A verdict label is visible — one of: "Hard Pass", "Do Not Buy",
"Marginal", "Caution", "Good Deal", or "Strong Buy"; the label matches the
numeric score range; it uses the appropriate tone colour (var(--fail) clay for
hard pass, var(--pass) sage for strong buy, etc.)
| PASS | FAIL | NOTES |

**AI narrative**

[ ] TC-PR9-056 Read the AI narrative paragraph on the investor report
Expected: The narrative is non-empty and contains property-specific language —
references to Vaughan, the condo fee, cash flow figures, or the deal verdict;
it is NOT the fallback string "Analysis complete. Narrative temporarily unavailable
— all metrics and scores above are accurate."; minimum 3 sentences visible
| PASS | FAIL | NOTES |

**Investment metrics**

[ ] TC-PR9-057 Count and inspect the metric tiles in the InvestmentMetrics grid
Expected: At least 8 metric tiles are present (cap rate, monthly cash flow, CoC
return, DSCR, GRM, NOI, break-even rent, mortgage payment); each tile shows a
numeric value; no tile is blank, "undefined", "NaN", or "—" as its primary value
| PASS | FAIL | NOTES |

**Financing sliders**

[ ] TC-PR9-058 Locate the FinancingSliders panel on the investor report
Expected: A slider panel is visible with at least 2 sliders (down payment %,
mortgage rate, and/or amortization years); current values are shown beside each
slider; the sliders are rendered and interactive (draggable); no slider is frozen
or invisible; the panel has a visible section heading or label
| PASS | FAIL | NOTES |

[ ] TC-PR9-059 Drag the down payment slider to a noticeably different position
Expected: As the slider moves, the metric tiles in the InvestmentMetrics section
update immediately and synchronously — no loading spinner appears during drag;
at minimum the mortgage payment and monthly cash flow tiles show changed values
reflecting the new down payment; the update is instant with no debounce delay;
no console errors during the interaction
| PASS | FAIL | NOTES |

**Risk flags**

[ ] TC-PR9-060 Locate the RiskFlags section on the report
Expected: A RiskFlags section exists on the page (search DevTools Elements for
the section heading to confirm); it may show zero flags — an empty state message
is acceptable — or a list of identified flags; the section renders without a
React error boundary crash; any listed flag uses VerdictPill or equivalent styling
| PASS | FAIL | NOTES |

**AIVerdictBlock**

[ ] TC-PR9-061 Locate the AIVerdictBlock dark card on the investor report
Expected: A full-width card with a dark near-black background (using var(--ink))
is present; the ScoutMark watermark is faintly visible at low opacity (6–8%) behind
the text; the card stands out from the white surface cards surrounding it; the AI
verdict text is readable against the dark background
| PASS | FAIL | NOTES |

**Equity chart**

[ ] TC-PR9-062 Scroll to the 20-year equity projection chart section
Expected: A line chart or area chart showing equity growth over 20 years is visible;
it renders with data (not empty axes); the chart has at least one visible data
series or line; no "undefined" data labels appear; hovering a data point shows
a tooltip or value; the chart is not a blank white rectangle
| PASS | FAIL | NOTES |

**Closing costs and LTT**

[ ] TC-PR9-063 Locate the closing costs or Land Transfer Tax section on the report
Expected: A section showing closing cost breakdown or LTT rows is visible;
it contains numeric dollar values for at least the provincial LTT; no value
is "undefined" or "$0" for a property at the Vaughan price level; values are
formatted as dollar amounts
| PASS | FAIL | NOTES |

**All sections**

[ ] TC-PR9-064 Scroll the complete investor report from top to bottom
Expected: All 11 report sections render without blank gaps or collapsed white boxes;
no section shows a React error boundary "Something went wrong" message; each
section flows correctly into the next; approximate sections: PropertyHero, DealScore,
InvestmentMetrics, AIVerdictBlock, RiskFlags, RentalComps, FinancingSliders,
EquityChart, ClosingCosts / LTT, OSFI card, SunScout or neighbourhood
| PASS | FAIL | NOTES |

[ ] TC-PR9-065 Search for "undefined" and "NaN" in the visible report content
Expected: In DevTools Elements (Ctrl+F), searching "undefined" returns no matches
in visible report text; "NaN" likewise returns no matches; all displayed metric
values are correctly formatted numbers or short text labels
| PASS | FAIL | NOTES |

[ ] TC-PR9-066 Open DevTools Console; confirm zero red errors on the investor report
Expected: No red error messages visible after the report has fully loaded; no
"Cannot read properties of undefined", React render exceptions, or unhandled
promise rejections; yellow warnings are acceptable; the page is stable
| PASS | FAIL | NOTES |

**Mode lock**

[ ] TC-PR9-067 Append `?mode=tenant` to the current /r/[token] URL and reload the page
Expected: The report still renders as an investor report — DealScore, InvestmentMetrics,
and FinancingSliders are all present; the mode stored in the analysis overrides
the URL query param; no tenant-specific components appear in place of investor
components; no error state renders
| PASS | FAIL | NOTES |

**Share link simulation**

[ ] TC-PR9-068 Copy the full /r/[token] URL; open a new browser tab; paste and navigate to it
Expected: The new tab shows a loading spinner or skeleton briefly; within 3–5 s,
the full investor report renders with the same data as the original tab;
no "analysis not found" or error state appears; the address and DealScore are
visible and match the original tab
| PASS | FAIL | NOTES |

[ ] TC-PR9-069 Compare key data between the share-link tab and the original tab
Expected: The DealScore numeric value, the address, the price, and at least one
metric tile (e.g. cap rate or monthly cash flow) are identical between the two
tabs; the stored analysis is served consistently; the data is not re-fetched with
different values
| PASS | FAIL | NOTES |

---

## Block 6 — /r/[token] Tenant Report

_Run the full end-to-end flow for the Milton for-rent listing in tenant mode:
paste URL → ModeModal opens → click tenant card → /analyzing polling → completion →
/r/[token]. Record the token._

[ ] TC-PR9-070 Complete the full end-to-end tenant analysis flow for the Milton for-rent listing
Expected: Each step succeeds without errors — ModeModal opens with Milton data →
tenant card selected → /analyzing shows polling → analysis completes → /r/[token]
renders TenantReport; no error state appears at any step; zero red console errors
throughout the entire flow
| PASS | FAIL | NOTES |

[ ] TC-PR9-071 Read the address in the TenantReport header or hero section
Expected: The address contains "Gordon Krantz" or "Milton"; it is not the demo
fixture address (e.g. "Charles St" or "Queen St"); it is not empty or "undefined";
the address is specific to the Milton listing that was scraped and analyzed
| PASS | FAIL | NOTES |

[ ] TC-PR9-072 Read the rent value displayed in the TenantReport
Expected: A rent figure matching the Milton for-rent listing is visible and
formatted as a dollar amount per month; it is NOT an investor purchase price;
it is not "undefined" or "$0"; the value is plausible for a Milton rental (not
a Vaughan condo purchase price)
| PASS | FAIL | NOTES |

[ ] TC-PR9-073 Read the AI narrative on the TenantReport
Expected: The narrative is non-empty, uses tenant-advisor language (discusses rent
fairness, negotiation leverage, or what to verify before signing), and references
Milton or the specific listing details; it is NOT the fallback string
"Analysis complete. Narrative temporarily unavailable…"; it is distinct in tone
from the investor narrative
| PASS | FAIL | NOTES |

[ ] TC-PR9-074 Search for "undefined" and "NaN" in the visible TenantReport content
Expected: DevTools Elements Ctrl+F for "undefined" returns no matches in visible
report text; "NaN" likewise; all displayed values are correctly formatted; the
report appears complete with real listing data
| PASS | FAIL | NOTES |

[ ] TC-PR9-075 Open DevTools Console; confirm zero red errors on the TenantReport
Expected: No red error messages; no React render exceptions or unhandled promise
rejections; the tenant report renders cleanly with real data from the Milton
listing; yellow warnings are acceptable
| PASS | FAIL | NOTES |

---

## Block 7 — /r/[token] Missing and Expired

[ ] TC-PR9-076 Navigate to `http://localhost:5173/r/nonexistent-token-abc123`
Expected: A user-friendly error state renders on the /r/[token] route; it is NOT
the React error boundary "Something went wrong" default; the page uses the PropScout
layout and design tokens; it is legible and styled correctly; zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR9-077 Read the error heading on the not-found state
Expected: The heading contains "not found", "expired", "analysis not found", or
equivalent user-friendly language; it is in Instrument Serif or Geist; no raw
error object (`Error: ...`), stack trace, or JSON dump is visible anywhere on
the page
| PASS | FAIL | NOTES |

[ ] TC-PR9-078 Locate the navigation CTA on the not-found state
Expected: A button or link labelled "Back to home", "Start over", or equivalent
is visible and not hidden; the CTA uses the standard Button component styling
(not a raw anchor without styling); no lock icon or other incorrect icon is present
on this button
| PASS | FAIL | NOTES |

[ ] TC-PR9-079 Click the "Back to home" CTA on the not-found state
Expected: The browser navigates to `/`; the LandingPage renders with the URL
input and Hero; the URL bar shows `http://localhost:5173/`; no console error;
the not-found state is no longer visible
| PASS | FAIL | NOTES |

[ ] TC-PR9-080 Inspect the not-found page for raw error output
Expected: The page shows NO stack trace, no `Error: ...` string, no raw JSON
object, and no React default error boundary "Something went wrong" message;
only the user-friendly error copy and the navigation CTA are visible on the page
| PASS | FAIL | NOTES |

[ ] TC-PR9-081 Confirm zero red console errors on the /r/nonexistent-token error state
Expected: DevTools Console shows no red messages; the 404-like response is handled
gracefully within React without uncaught exceptions; the missing token path does
not bubble to the top-level error boundary; any console.warn messages are acceptable
| PASS | FAIL | NOTES |

---

## Block 8 — Error Paths

> ⚠ **CONDITIONAL:** All TCs in this block require stopping and restarting specific
> terminal processes. Execute TCs in sequence and restart each terminal immediately
> after the TC is complete before moving to the next.

**Scraper unavailable (Terminal 2 killed)**

[ ] TC-PR9-082 CONDITIONAL — Kill Terminal 2 (scraper, port 8001); paste a valid Ontario realtor.ca
URL and click Analyze
Expected: The Analyze button enters loading state briefly; an inline error then
appears — "Analysis service temporarily unavailable" or equivalent; the ModeModal
does NOT open; no navigation to /analyzing; no uncaught console exception; the
error is styled (not a raw error dump); restart Terminal 2 after this test
| PASS | FAIL | NOTES |

[ ] TC-PR9-083 CONDITIONAL — With the scraper-down error visible, confirm no ModeModal opened
Expected: Inspecting the DOM (DevTools Elements) shows no open or visible ModeModal
element; no backdrop overlay is present; the landing page URL input remains
accessible; the page is usable for a retry after Terminal 2 is restarted;
restart Terminal 2 before continuing to the next TC
| PASS | FAIL | NOTES |

**API unavailable (Terminal 3 killed)**

[ ] TC-PR9-084 CONDITIONAL — Confirm Terminal 2 is running; kill Terminal 3 (Fastify, port 3000);
paste a valid Ontario URL and click Analyze
Expected: An inline error appears — "Analysis service temporarily unavailable"
or equivalent; ModeModal does not open; no navigation; the error is user-friendly
styled text (not a raw network error object); the page remains usable; zero
uncaught console exceptions; restart Terminal 3 after this test
| PASS | FAIL | NOTES |

[ ] TC-PR9-085 CONDITIONAL — After restarting Terminal 3, paste the same Ontario URL and click Analyze
Expected: The scrape succeeds this time; ModeModal opens with real listing data;
the inline error from TC-PR9-084 is gone; confirms the error state is cleared
between requests and does not persist after the terminal is restored; no stale
error message lingers on screen
| PASS | FAIL | NOTES |

**Failed analysis on /analyzing (Terminal 1 killed mid-run)**

[ ] TC-PR9-086 CONDITIONAL — Start a fresh investor analysis; reach /analyzing; then kill Terminal 1
(calc engine, port 8000) during the polling phase; wait for the DB to mark the
analysis as 'failed'
Expected: Once the pipeline status becomes 'failed', the /analyzing page stops
polling and displays an error state; a "Start over" or "Go back" button is present;
the error message is user-friendly prose (not a stack trace); restart Terminal 1
after this test
| PASS | FAIL | NOTES |

[ ] TC-PR9-087 CONDITIONAL — With the /analyzing failed error state visible, inspect the Network tab
Expected: Zero further GET localhost:3000/analysis/[token] requests appear after
the error state renders; wait 5+ seconds to confirm; the polling interval was
cleared on failure detection; no ghost requests continue in the background;
restart Terminal 1 if not already done
| PASS | FAIL | NOTES |

[ ] TC-PR9-088 CONDITIONAL — Click the "Start over" or "Go back" CTA on the /analyzing error state
Expected: The browser navigates to `/`; the LandingPage renders with the URL
input ready; the /analyzing error state is gone; no console errors; confirms
the failed-analysis path offers a clean recovery to the home route
| PASS | FAIL | NOTES |

---

## Block 9 — Network Tab Sanity

_Run a complete end-to-end investor analysis (Vaughan URL → investor mode →
/analyzing → /r/[token]) with the Network tab open and "Preserve log" enabled.
Clear the Network log first for a clean baseline, then start the analysis._

[ ] TC-PR9-089 Confirm POST /scrape returns HTTP 200
Expected: A POST request to localhost:3000/scrape is visible in the Network tab;
status is 200; the response body contains a `token` string and a `listing` object;
no 4xx or 5xx error; the response time is reasonable (under 30 s for a live scraper
call — the realtor.ca scraper may be slow)
| PASS | FAIL | NOTES |

[ ] TC-PR9-090 Confirm POST /analysis returns HTTP 200
Expected: After mode selection in ModeModal, a POST request to localhost:3000/analysis
is visible in the Network tab; status is 200; the response body confirms the pipeline
was triggered; no 4xx or 5xx; this request fires before the first polling request
appears
| PASS | FAIL | NOTES |

[ ] TC-PR9-091 Confirm all GET /analysis/[token] polling requests return HTTP 200
Expected: All GET requests to localhost:3000/analysis/[token] show HTTP 200;
responses with `status: 'pending'` or `status: 'processing'` body are correct
and expected during the run; the final response has `status: 'complete'` and
includes `analysis` and `listing` objects; no polling request returns 4xx or 5xx;
at least 3 polling requests are visible
| PASS | FAIL | NOTES |

[ ] TC-PR9-092 Confirm no unexpected 4xx or 5xx responses across the complete flow
Expected: Across the full run — scrape, trigger, polling, report load — no HTTP
400, 401, 403, 404, 422, 500, or 503 responses appear; the intentional 404 from
Block 7 is the only acceptable 4xx in this session; 200 responses with a
PROVINCE_NOT_SUPPORTED body are acceptable; 304 cached asset responses are acceptable
| PASS | FAIL | NOTES |

[ ] TC-PR9-093 Confirm polling stops after /r/[token] renders
Expected: After the browser navigates to /r/[token] and the report is fully visible,
wait 10 seconds; zero new GET localhost:3000/analysis/[token] requests appear in
the Network tab; only static asset requests (fonts, CSS chunks, image resources)
may appear; the polling interval is confirmed cleared
| PASS | FAIL | NOTES |

[ ] TC-PR9-094 Confirm no direct Supabase requests originate from the frontend
Expected: Searching the Network tab for "supabase.co" (or the Supabase project
domain from the project .env) returns NO matches from any browser-originated request;
all database access flows through localhost:3000 (Fastify); the browser communicates
only with localhost:3000 for data and localhost:5173 for assets
| PASS | FAIL | NOTES |

[ ] TC-PR9-095 Confirm the province gate POST /scrape returns HTTP 200 (not a 4xx error code)
Expected: When a BC URL is submitted (re-test TC-PR9-027 with Network tab active),
the POST localhost:3000/scrape request returns HTTP 200; the province error is
communicated via the response body as `{ error: 'PROVINCE_NOT_SUPPORTED' }` rather
than as an HTTP 4xx status; this confirms the API contract is correct
| PASS | FAIL | NOTES |

---

## Block 10 — Dark Mode Across PR9 Pages

[ ] TC-PR9-096 On /analyzing, apply dark mode via the mini nav toggle or DevTools console
(`document.documentElement.setAttribute('data-theme', 'dark')` if no toggle)
Expected: All /analyzing page elements recolour correctly — mini nav, URL strip,
headline text, step list labels, progress bar (accent fill visible against dark
background), and reassurance copy; no element retains a hardcoded light colour;
the progress bar is not invisible against the dark surface
| PASS | FAIL | NOTES |

[ ] TC-PR9-097 On /r/[token] investor report, apply dark mode
Expected: All report sections recolour correctly — PropertyHero, DealScore gauge,
InvestmentMetrics tiles, AIVerdictBlock (already dark; confirm it does not
over-darken or lose contrast), FinancingSliders, RiskFlags, EquityChart, and
Footer; no hardcoded light value breaks the dark layout; all numeric values
remain legible
| PASS | FAIL | NOTES |

[ ] TC-PR9-098 On /r/[token] tenant report, apply dark mode
Expected: All TenantReport sections recolour — listing hero, verdict block, rental
comps percentile bar, location/commute section, and negotiation card all adapt
to dark tokens; no section shows white-on-white or black-on-black contrast failure;
pass/caution/fail colour tokens remain distinguishable in dark mode
| PASS | FAIL | NOTES |

[ ] TC-PR9-099 Open ModeModal with dark mode active (paste Vaughan URL and wait for scrape)
Expected: The ModeModal card background uses dark surface token values; mode
selection card labels, the listing preview address and price, and the listing type
label are all legible against dark backgrounds; the backdrop is still visible as
a dim overlay; no element shows a raw hex colour breaking the theme
| PASS | FAIL | NOTES |

[ ] TC-PR9-100 Inspect the progress bar on /analyzing in dark mode
Expected: The progress bar fill (var(--accent) terracotta) is clearly visible
against the dark page background; the unfilled bar portion is distinct; completed
step checkmarks are visible and use the pass/sage colour; no step label becomes
unreadable against the dark surface; the overall layout is complete
| PASS | FAIL | NOTES |

---

## Block 11 — Design Token Compliance (PR9 Pages)

[ ] TC-PR9-101 On /analyzing, right-click the progress bar fill → Inspect → Styles panel
Expected: The CSS rule for the progress bar fill background-color references
`var(--accent)` — not a raw hex value like `#D97757`; the DevTools Computed tab
shows the colour resolves to approximately `#D97757` in light mode; confirm via
the Styles panel that no inline hex literal overrides the token
| PASS | FAIL | NOTES |

[ ] TC-PR9-102 On /analyzing, right-click a completed step checkmark icon → Inspect →
Computed → color
Expected: The colour resolves to the value of `var(--pass)` (sage green, approximately
`#4F7A48` in light mode); the completed-step state does NOT use `var(--accent)` or
a grey; the active-step indicator is visually distinct from the completed state
| PASS | FAIL | NOTES |

[ ] TC-PR9-103 On /r/[token] investor report, right-click the DealScore gauge arc →
Inspect → Computed → stroke or fill colour
Expected: The gauge stroke (or SVG fill) resolves to the verdict tone colour —
a hard pass score resolves to `var(--fail)` clay; a caution score resolves to
`var(--caution)` amber; a strong buy resolves to `var(--pass)` sage; in all cases
the colour is a CSS variable reference, not a raw hex value in the Styles panel
| PASS | FAIL | NOTES |

[ ] TC-PR9-104 Inspect PR9-added elements on /analyzing and /r/[token] for raw inline hex values
Expected: Selecting any element added in PR9 (progress bar, step list items, mini
nav, analyzing headline, ModeModal navigation call sites) in DevTools Styles panel
shows CSS rules that reference `var(--token-name)` rather than raw values like
`#D97757` or `rgba(79, 122, 72, 1)`; no `style="color: #..."` inline attribute
is present on any PR9 component
| PASS | FAIL | NOTES |

[ ] TC-PR9-105 Inspect typography on /analyzing and /r/[token] metric values
Expected: Right-clicking the serif headline on /analyzing → Computed → font-family
resolves to "Instrument Serif"; right-clicking a percentage or dollar metric tile
value on the investor report resolves to "Geist Mono"; right-clicking body copy
(section descriptions) resolves to "Geist"; all three fonts are active (no fallback
system font in use); confirm no `.woff2` 404 in the Network tab
| PASS | FAIL | NOTES |

---

## Results Summary

| Block | Section                        | TCs     | Pass | Fail | Blocked |
| ----- | ------------------------------ | ------- | ---- | ---- | ------- |
| 1     | Static rendering               | 001–015 |      |      |         |
| 2     | Scrape path (real scraper)     | 016–029 |      |      |         |
| 3     | ModeModal navigation           | 030–036 |      |      |         |
| 4     | /analyzing page (polling flow) | 037–051 |      |      |         |
| 5     | /r/[token] investor report     | 052–069 |      |      |         |
| 6     | /r/[token] tenant report       | 070–075 |      |      |         |
| 7     | /r/[token] missing and expired | 076–081 |      |      |         |
| 8     | Error paths                    | 082–088 |      |      |         |
| 9     | Network tab sanity             | 089–095 |      |      |         |
| 10    | Dark mode across PR9 pages     | 096–100 |      |      |         |
| 11    | Design token compliance        | 101–105 |      |      |         |
| —     | **TOTAL**                      | **105** |      |      |         |

**Tester:** ******\_\_****** **Date:** ******\_\_******

**Overall result:** [ ] PASS — all 105 TCs pass [ ] FAIL — see NOTES above

---

## Test Count Verification

| Block | Section                        | Count   |
| ----- | ------------------------------ | ------- |
| 1     | Static rendering               | 15      |
| 2     | Scrape path (real scraper)     | 14      |
| 3     | ModeModal navigation           | 7       |
| 4     | /analyzing page (polling flow) | 15      |
| 5     | /r/[token] investor report     | 18      |
| 6     | /r/[token] tenant report       | 6       |
| 7     | /r/[token] missing and expired | 6       |
| 8     | Error paths                    | 7       |
| 9     | Network tab sanity             | 7       |
| 10    | Dark mode across PR9 pages     | 5       |
| 11    | Design token compliance        | 5       |
| —     | **Total**                      | **105** |

---

## TCs Requiring Manual Trigger or Conditional Execution

| TC                      | Type        | Description                                                                       |
| ----------------------- | ----------- | --------------------------------------------------------------------------------- |
| TC-PR9-082 – TC-PR9-083 | CONDITIONAL | Kill Terminal 2 (scraper) to test scraper-unavailable inline error                |
| TC-PR9-084 – TC-PR9-085 | CONDITIONAL | Kill Terminal 3 (Fastify) to test API-unavailable inline error                    |
| TC-PR9-086 – TC-PR9-088 | CONDITIONAL | Kill Terminal 1 (calc engine) mid-analysis to trigger failed status on /analyzing |
| TC-PR9-096              | CONDITIONAL | Dark mode on /analyzing may require DevTools console if mini nav has no toggle    |

---

## Terminal Reference

| Terminal | Start command                                                      | What it does                                           | Required from |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------ | ------------- |
| 1        | `cd services/calc-engine && uvicorn main:app --port 8000 --reload` | Python calc engine — investment metrics, deal score    | Block 2       |
| 2        | `cd services/scrapers && uvicorn main:app --port 8001 --reload`    | Python scraper — fetches realtor.ca listing data       | Block 2       |
| 3        | `cd apps/api && npm run dev`                                       | Fastify API — orchestrates scrape, analysis, DB writes | Block 2       |
| 4        | `cd apps/web && npm run dev`                                       | Vite frontend at localhost:5173                        | Block 1       |

---

_Checklist version: PR9-v1 · Branch: feat/pr8-legal-mobile · Generated: 2026-06-01_
