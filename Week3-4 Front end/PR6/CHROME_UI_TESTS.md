# PropScout PR6 — Chrome UI Test Checklist

## PersonalBuyerPage + LandlordPage — Manual Browser Tests

**Generated:** 2026-05-29
**Branch:** feat/pr6-personal-landlord
**Total tests:** 90
**Browser:** Chrome (latest stable)
**Dev server:** `npm run dev --workspace=apps/web` → `http://localhost:5173`

**Pages under test:**

- Personal Buyer report → `http://localhost:5173/personal-report`
- Landlord report → `http://localhost:5173/landlord-report`

**Pre-test:** DevTools → Application → Clear Storage → Hard reload (Ctrl+Shift+R)

> ⚠ **Port dependency:** All TCs require the Vite dev server running on **port 5173**.
> If another process occupies 5173, Vite will step to 5174 and all URLs must be updated.

---

## 1 · Page Load & Navigation — PersonalBuyerPage

[ ] TC-PR6-001 Start dev server and open `http://localhost:5173/personal-report` in Chrome (latest)
Expected: Page loads within 3 s; DevTools Console shows zero red errors;
no 404 for fonts, CSS, or JS chunks; HTTP 200 in Network tab
| PASS | FAIL | NOTES |

[ ] TC-PR6-002 Open DevTools → Network, reload; filter by "Font"
Expected: Instrument Serif, Geist, and Geist Mono are all loaded from
Google Fonts — no font 404s; all three families resolve successfully
| PASS | FAIL | NOTES |

[ ] TC-PR6-003 Observe the Nav bar label at the top of the page
Expected: The label "Personal buyer report" (exact capitalisation) is visible
in the Nav bar between the wordmark and any action buttons
| PASS | FAIL | NOTES |

[ ] TC-PR6-004 Inspect the wordmark in the Nav bar
Expected: The wordmark renders "Prop" in Geist regular weight and "Scout"
in Instrument Serif italic; the root div has data-testid="wordmark" in
DevTools Elements panel
| PASS | FAIL | NOTES |

[ ] TC-PR6-005 Read the property address displayed in the hero area
Expected: "248 Mountcrest Avenue" appears as the primary address heading;
"Burlington, ON" or similar city/province line is visible below it
| PASS | FAIL | NOTES |

[ ] TC-PR6-006 Click the dark mode toggle button in the Nav bar
Expected: The `<html>` element gains `data-theme="dark"` in DevTools;
page background shifts to the dark token value; all text remains readable
| PASS | FAIL | NOTES |

[ ] TC-PR6-007 Click the dark mode toggle again (while in dark mode)
Expected: `data-theme` switches back to "light" (or is removed from `<html>`);
background returns to warm cream; no visual flash or reflow artefacts
| PASS | FAIL | NOTES |

[ ] TC-PR6-008 Scroll the full page top-to-bottom on personal-report
Expected: No horizontal scrollbar at any scroll position; no layout shifts;
all four section blocks are visible; Footer renders at the very bottom
| PASS | FAIL | NOTES |

---

## 2 · Page Load & Navigation — LandlordPage

[ ] TC-PR6-009 Open `http://localhost:5173/landlord-report` in Chrome
Expected: Page loads within 3 s; DevTools Console shows zero red errors;
no 404 for fonts, CSS, or JS chunks; HTTP 200 in Network tab
| PASS | FAIL | NOTES |

[ ] TC-PR6-010 Observe the Nav bar label at the top of the landlord page
Expected: The label "Landlord report" (exact capitalisation) is visible in
at least one element in the Nav bar area (it appears in both a `<span>` and
an `<a>` element — both are acceptable)
| PASS | FAIL | NOTES |

[ ] TC-PR6-011 Read the property address displayed in the hero area
Expected: "Unit 3208 · 88 Harbour Street" appears as the primary address;
the interpunct (·) is present between the unit number and street name
| PASS | FAIL | NOTES |

[ ] TC-PR6-012 Inspect the wordmark in the landlord Nav bar
Expected: Wordmark renders with "Prop" in Geist regular weight and "Scout"
in Instrument Serif italic; the root div has data-testid="wordmark"
in DevTools Elements panel
| PASS | FAIL | NOTES |

[ ] TC-PR6-013 Click the dark mode toggle on the landlord page
Expected: `<html>` gains `data-theme="dark"`; page shifts to dark palette;
all section content (rent comps bar, metric tiles, financing sliders)
remains readable in dark mode
| PASS | FAIL | NOTES |

[ ] TC-PR6-014 Scroll the full page top-to-bottom on landlord-report
Expected: No horizontal scrollbar at any scroll position; §01 Rent
positioning, Investment metrics, and Financing scenarios sections all
render; Footer renders at the very bottom
| PASS | FAIL | NOTES |

---

## 3 · PersonalBuyerPage §01 — True Monthly Cost

[ ] TC-PR6-015 Locate the §01 True Monthly Cost section heading
Expected: A SectionHead with topic text "True monthly cost" is present;
the text appears at least once on the page when scrolled to §01
| PASS | FAIL | NOTES |

[ ] TC-PR6-016 Verify the section question text uses Instrument Serif with an italic key word
Expected: The question below "True monthly cost" is rendered in
Instrument Serif; one key noun is in italic (e.g., "What will this _really_
cost you each month?" or similar); right-click the question → Inspect →
Computed font-family resolves to Instrument Serif
| PASS | FAIL | NOTES |

[ ] TC-PR6-017 Read the mortgage row in the cost breakdown table
Expected: A row labelled "Mortgage" (or "Monthly mortgage") is present
with a dollar value; the value reflects a 25-year amortisation at ~4.79%
on ~$700,000 principal (20% down on $875,000); approximately $3,900–$4,100/mo
| PASS | FAIL | NOTES |

[ ] TC-PR6-018 Read the property tax row in the cost breakdown table
Expected: A row labelled "Property tax" (or "Taxes") is visible with a
monthly dollar value; should be in the range $300–$450/mo
(Burlington semi-detached annual taxes / 12)
| PASS | FAIL | NOTES |

[ ] TC-PR6-019 Read the home insurance row in the cost breakdown table
Expected: A row labelled "Insurance" (or "Home insurance") is present
with a monthly dollar value; should be approximately $180–$250/mo
| PASS | FAIL | NOTES |

[ ] TC-PR6-020 Read the utilities row in the cost breakdown table
Expected: A row labelled "Utilities" is visible with a monthly estimate;
should be approximately $350–$420/mo for a Burlington semi-detached
| PASS | FAIL | NOTES |

[ ] TC-PR6-021 Read the maintenance row in the cost breakdown table
Expected: A row labelled "Maintenance" (or "Maintenance reserve") is
present; should be approximately $1,000–$1,200/mo
(~1.5% of $875,000 / 12 for an older home bracket)
| PASS | FAIL | NOTES |

[ ] TC-PR6-022 Read the total monthly cost displayed in §01
Expected: A total row (with a distinguishing style — bold, larger font,
or separator line above it) shows a dollar value greater than $4,000;
the value contains a "$" prefix and comma formatting;
pattern $4,xxx–$7,xxx is expected for this Burlington fixture
| PASS | FAIL | NOTES |

[ ] TC-PR6-023 Inspect the total value element's computed colour
Expected: The total row value uses `--ink` or a neutral colour — it is not
styled in `--fail` (red) by default (total ownership cost is informational,
not a verdict); the row is visually distinct from the breakdown rows above it
| PASS | FAIL | NOTES |

---

## 4 · PersonalBuyerPage §02 — Fair Market Value

[ ] TC-PR6-024 Locate the §02 Fair Market Value section heading
Expected: A SectionHead with topic text matching "Fair market value" (or
"Fair market") is present; the section is the second distinct section block
on the page
| PASS | FAIL | NOTES |

[ ] TC-PR6-025 Verify a value-positioning bar or visual indicator is present
Expected: A horizontal bar, gradient track, or comparable-range indicator
is rendered in §02 showing where $875,000 sits relative to comparable sales;
the bar or indicator occupies meaningful visual space (height ≥ 12px)
| PASS | FAIL | NOTES |

[ ] TC-PR6-026 Read the property price position label
Expected: "$875,000" (the Burlington asking price) is labelled on or
near the fair-market bar; a label or arrow indicates its position
relative to comps (e.g., "above median", "at median", or a percentile marker)
| PASS | FAIL | NOTES |

[ ] TC-PR6-027 Inspect the bar or chart element for accessible attributes
Expected: The positioning bar element has either an aria-label describing the
price position or a text equivalent nearby; no SVG is empty (if SVG is used,
it has title or desc child elements or aria-label on the root)
| PASS | FAIL | NOTES |

---

## 5 · PersonalBuyerPage §03 — Comparable Sales

[ ] TC-PR6-028 Locate the §03 Comparable Sales section heading
Expected: A SectionHead with topic text "Comparable sales" is present;
the section follows the Fair Market Value section when scrolling down
| PASS | FAIL | NOTES |

[ ] TC-PR6-029 Verify the table "Address" column header is present
Expected: The text "Address" appears as a column header in the comparable
sales table; it is styled distinctly from data rows (bold or uppercase)
| PASS | FAIL | NOTES |

[ ] TC-PR6-030 Verify all 6 column headers are present
Expected: All 6 headers are visible: "Address", "Beds", "Sqft", "Sold for",
"$/sqft", "DOM" — each as a distinct table column header
| PASS | FAIL | NOTES |

[ ] TC-PR6-031 Count the data rows in the comparable sales table
Expected: Exactly 8 data rows appear (one per comp in PB_COMPS);
each row shows the comp address in the first column
| PASS | FAIL | NOTES |

[ ] TC-PR6-032 Read the first comp row address
Expected: "262 Mountcrest Avenue" appears as the first comparable sale
address in the table (the closest comparable to the subject property)
| PASS | FAIL | NOTES |

[ ] TC-PR6-033 Verify the sold price "$882,000" is visible in the table
Expected: "$882,000" appears at least once in the table (both as the data
row value for 262 Mountcrest AND as the median footer value); use
DevTools → Elements → Ctrl+F search to confirm it exists
| PASS | FAIL | NOTES |

[ ] TC-PR6-034 Read the footer median row
Expected: A footer row labelled "Median · last 6 mo" is present below
the 8 data rows; it shows the median sold price, median $/sqft, and
median DOM for the Burlington comparable set
| PASS | FAIL | NOTES |

---

## 6 · PersonalBuyerPage §04 — Schools

[ ] TC-PR6-035 Locate the §04 Schools section heading
Expected: A SectionHead with topic text "Schools" (or text matching /schools/i)
is present; it is the fourth section block on the page
| PASS | FAIL | NOTES |

[ ] TC-PR6-036 Verify the "Elementary" column header is present
Expected: The text "Elementary" appears as a column or section label in the
Schools section; it labels the elementary school column
| PASS | FAIL | NOTES |

[ ] TC-PR6-037 Verify the "Middle" column header is present
Expected: The text "Middle" appears as a column or section label in the
Schools section; it labels the middle school column
| PASS | FAIL | NOTES |

[ ] TC-PR6-038 Verify the "High school" column header is present
Expected: The text "High school" appears as a column or section label;
it labels the high school column
| PASS | FAIL | NOTES |

[ ] TC-PR6-039 Read the elementary school card
Expected: A school card for "Tom Thomson Public School" is present in the
Elementary column; the school name is fully visible and not truncated
| PASS | FAIL | NOTES |

[ ] TC-PR6-040 Read the middle school card
Expected: A school card for "Tom Thomson PS (Gr 7–8 wing)" is present in
the Middle column; the parenthetical grade range is part of the visible text
| PASS | FAIL | NOTES |

[ ] TC-PR6-041 Read the high school card
Expected: A school card for "Aldershot High School" is present in the
High school column; the school name is fully visible
| PASS | FAIL | NOTES |

[ ] TC-PR6-042 Verify the "In catchment" badge for Tom Thomson Public School
Expected: At least one "In catchment" badge (chip or tag) is rendered near
the Tom Thomson Public School card; it uses a pass/sage colour tone to
indicate catchment eligibility (inCatchment: true)
| PASS | FAIL | NOTES |

[ ] TC-PR6-043 Inspect the EQAO bar width for a school card (float precision check)
Expected: Right-click any SchoolCard's EQAO progress bar → Inspect →
check its inline `style` attribute for the `width` value; confirm it reads
a clean integer percentage (e.g., "91%") — NOT "90.99999999999999%" or
similar float artifact. If a float artifact is visible, this is a SchoolCard
regression (Math.round fix did not apply).
| PASS | FAIL | NOTES |

---

## 7 · LandlordPage §01 — Rent Positioning

[ ] TC-PR6-044 Locate the §01 Rent Positioning section heading
Expected: A SectionHead with topic text "Rent positioning" is present;
it is the first section block on the landlord page
| PASS | FAIL | NOTES |

[ ] TC-PR6-045 Verify the RentalCompsBar is present
Expected: In DevTools → Elements, search for `data-testid="rental-comps-bar"`;
the element exists in the DOM; it renders a visible horizontal range bar
in the Rent Positioning section
| PASS | FAIL | NOTES |

[ ] TC-PR6-046 Inspect the RentalCompsBar diamond aria-label at initial load
Expected: The ask diamond element on the bar has
`aria-label="Estimated rent: $3,400"` (exact string); confirm via
DevTools → Elements — search for aria-label on the diamond div
| PASS | FAIL | NOTES |

[ ] TC-PR6-047 Verify the "Asking rent" slider is present
Expected: An `input[type="range"]` element with `aria-label="Asking rent"` is
rendered in §01; `screen.getByLabelText('Asking rent')` (conceptual) would
find it; the slider track is visually horizontal
| PASS | FAIL | NOTES |

[ ] TC-PR6-048 Verify the slider range bounds (min, max, step)
Expected: Right-click the rent slider → Inspect; in the Properties panel
(DevTools), confirm: `min="2500"`, `max="3800"`, `step="25"`;
the slider spans the range $2,500–$3,800 in $25 increments
| PASS | FAIL | NOTES |

[ ] TC-PR6-049 Read the initial slider value and displayed asking rent
Expected: The slider value attribute reads "3400" at page load; a displayed
label or hero shows the current asking rent as "$3,400"; the slider thumb
is positioned at approximately 73% of the way along the track
(($3,400−$2,500) / ($3,800−$2,500) = 900/1300 ≈ 69%)
| PASS | FAIL | NOTES |

[ ] TC-PR6-050 Verify the "Snap to median" quick-snap button is present
Expected: A button with accessible name matching "Snap to median" (case-
insensitive) is visible in §01; it has `role="button"` (as a `<button>` element)
| PASS | FAIL | NOTES |

[ ] TC-PR6-051 Verify the "Aggressive" quick-snap button is present
Expected: A button with accessible name matching "Aggressive" (case-
insensitive) is visible in §01; it represents the P25 building price ($2,950)
| PASS | FAIL | NOTES |

[ ] TC-PR6-052 Verify the "Top of range" quick-snap button is present
Expected: A button with accessible name matching "Top of range" (case-
insensitive) is visible in §01; it represents the P75 building price ($3,350)
| PASS | FAIL | NOTES |

[ ] TC-PR6-053 Click "Snap to median" and verify asking rent updates to $3,100
Expected: After clicking "Snap to median", the slider value changes to 3100;
the asking rent display updates to "$3,100"; the RentalCompsBar diamond
aria-label updates to "Estimated rent: $3,100" (verify in DevTools)
| PASS | FAIL | NOTES |

[ ] TC-PR6-054 Click "Aggressive" and verify asking rent updates to $2,950
Expected: After clicking "Aggressive", the slider value changes to 2950;
the asking rent display updates to "$2,950"; the diamond aria-label updates
to "Estimated rent: $2,950"
| PASS | FAIL | NOTES |

[ ] TC-PR6-055 Click "Top of range" and verify asking rent updates to $3,350
Expected: After clicking "Top of range", the slider value changes to 3350;
the asking rent display updates to "$3,350"; the diamond aria-label updates
to "Estimated rent: $3,350"
| PASS | FAIL | NOTES |

[ ] TC-PR6-056 Verify unit #1208 is visible in the building live-listings table
Expected: The text "#1208" appears in the building comps table under the
"Your building · live" panel; the unit number is in the first column
| PASS | FAIL | NOTES |

[ ] TC-PR6-057 Read unit #1208 status badge
Expected: "#1208" row shows the status "rented · 7d"; the status badge uses
a pass/sage tone colour to indicate this unit was rented quickly
| PASS | FAIL | NOTES |

[ ] TC-PR6-058 Read unit #2912 status badge
Expected: "#2912" row shows the status "active · 42d · price dropped";
the status badge uses a fail/clay tone colour to indicate a stale listing
that has dropped in price
| PASS | FAIL | NOTES |

[ ] TC-PR6-059 Count the live listing unit rows in the building comps table
Expected: Exactly 5 live listing rows are visible (LL_RENT_COMPS.liveListings
has 5 entries); each row shows a unit number, asking rent, and status
| PASS | FAIL | NOTES |

[ ] TC-PR6-060 Read the building comps panel header
Expected: The text "Your building · live" (case-insensitive, matching
/your building · live/i) is visible as a panel or sub-section header
in the Rent Positioning section
| PASS | FAIL | NOTES |

[ ] TC-PR6-061 Read the slider instruction label
Expected: The text "Drag to model alternatives" is visible as a label
associated with the asking rent slider or its container; it guides the
user to interact with the slider
| PASS | FAIL | NOTES |

[ ] TC-PR6-062 Verify the methodology footnote is present
Expected: A footnote or small-text element containing the phrase
"verified rentals in this building" is visible below the comps bar or table;
it explains the data source for the rent comps
| PASS | FAIL | NOTES |

[ ] TC-PR6-063 Read the confidence level in the methodology footnote
Expected: The text "Confidence:" followed by a confidence level label
(e.g., "High", "Medium", or "Low") is visible in the footnote area;
the confidence reflects the comp count for 88 Harbour Street
| PASS | FAIL | NOTES |

---

## 8 · LandlordPage — Shared Components (Investment Metrics + Financing Sliders)

[ ] TC-PR6-064 Verify the Investment Metrics section heading is present
Expected: The text "Investment metrics" appears as a section topic on the
landlord page; it is the second major section after §01 Rent positioning
| PASS | FAIL | NOTES |

[ ] TC-PR6-065 Verify the "Where the money goes." sub-heading is present
Expected: An `<h3>` element reads "Where the money goes." (with trailing
period); this heading is unique to the InvestmentMetricsSection and
confirms the shared component is reused correctly on the landlord page
| PASS | FAIL | NOTES |

[ ] TC-PR6-066 Verify the Cap rate metric tile is present
Expected: A tile labelled "Cap rate" (or "CAP RATE" as eyebrow) is visible
in the Investment metrics grid; it displays a formatted percentage value
| PASS | FAIL | NOTES |

[ ] TC-PR6-067 Verify the Monthly cash flow metric tile is present
Expected: A tile labelled "Monthly cash flow" is visible; it displays a
monthly dollar value (positive or negative depending on Harbour Street fixture)
| PASS | FAIL | NOTES |

[ ] TC-PR6-068 Verify the Cash-on-cash metric tile is present
Expected: A tile labelled "Cash-on-cash" (or "Cash-on-cash return") is visible
in the metric grid; it displays a percentage value
| PASS | FAIL | NOTES |

[ ] TC-PR6-069 Verify the DSCR metric tile is present
Expected: A tile labelled "DSCR" (or "Debt service coverage") is visible;
it displays a value in "N.NNx" format (e.g., "1.02x" or "0.98x")
| PASS | FAIL | NOTES |

[ ] TC-PR6-070 Verify the NOI metric tile is present
Expected: A tile labelled "NOI" (or "Net operating income") is visible;
it displays an annual or monthly dollar value
| PASS | FAIL | NOTES |

[ ] TC-PR6-071 Verify the GRM metric tile is present
Expected: A tile labelled "GRM" (or "Gross rent multiplier") is visible;
it displays a numeric value (ratio of price to annual rent)
| PASS | FAIL | NOTES |

[ ] TC-PR6-072 Verify the Break-even rent metric tile is present
Expected: A tile labelled "Break-even rent" is visible in the metric grid;
it displays a monthly dollar value representing the minimum rent to break even
| PASS | FAIL | NOTES |

[ ] TC-PR6-073 Verify the Gross yield metric tile is present
Expected: A tile labelled "Gross yield" is visible in the metric grid;
all 8 metric tiles are accounted for — Cap rate, Monthly cash flow,
Cash-on-cash, DSCR, NOI, GRM, Break-even rent, Gross yield
| PASS | FAIL | NOTES |

[ ] TC-PR6-074 Verify the Financing Scenarios section heading is present
Expected: The text "Financing scenarios" appears as a section topic or
heading on the landlord page (reused from the investor report's
FinancingSliders component)
| PASS | FAIL | NOTES |

[ ] TC-PR6-075 Verify the Down payment slider is present and accessible
Expected: An `input[type="range"]` with `aria-label="Down payment"` (or
a visible label "Down payment" linked to the slider) is present in the
Financing scenarios section; `getByLabelText('Down payment')` would find it
| PASS | FAIL | NOTES |

[ ] TC-PR6-076 Verify the mortgage rate slider is present
Expected: An `input[type="range"]` for the mortgage rate is visible;
a label such as "Rate" or "Mortgage rate" is associated with it;
the default value is approximately 4.79%
| PASS | FAIL | NOTES |

[ ] TC-PR6-077 Verify the amortization slider is present
Expected: An `input[type="range"]` for the amortization period is visible;
a label such as "Amortization" or "Amort" is associated with it;
the default value is 25 years
| PASS | FAIL | NOTES |

---

## 9 · Live Recalculation, Design Token Compliance & Accessibility

[ ] TC-PR6-078 Drag the rent slider from $3,400 to $3,100 and verify hero update
Expected: Navigate to landlord-report; locate the "Asking rent" slider and
drag it (or use DevTools to set `value="3100"` and dispatch an `input` event);
after the change, "$3,100" appears in the LandlordPropertyHero asking rent
display; the update is synchronous — no loading spinner appears
| PASS | FAIL | NOTES |

[ ] TC-PR6-079 Drag the rent slider to its minimum ($2,500) — no crash
Expected: Setting the slider to 2500 (its minimum) does not throw a
JavaScript error; the metrics update; the diamond aria-label updates to
"Estimated rent: $2,500"; no visual layout breaks
| PASS | FAIL | NOTES |

[ ] TC-PR6-080 Drag the rent slider to its maximum ($3,800) — no crash
Expected: Setting the slider to 3800 (its maximum) does not throw a
JavaScript error; the metrics update; the diamond aria-label updates to
"Estimated rent: $3,800"; no visual layout breaks
| PASS | FAIL | NOTES |

[ ] TC-PR6-081 Adjust a Financing slider on LandlordPage and verify metric update
Expected: Navigate to the Financing scenarios section; drag the Down payment
slider from its default to a new value (e.g., 25%); at least one metric tile
in the Investment metrics section (e.g., Monthly cash flow) updates its
displayed value synchronously; no page reload occurs
| PASS | FAIL | NOTES |

[ ] TC-PR6-082 Check for emoji characters on PersonalBuyerPage
Expected: In DevTools Console on personal-report, run:
`document.body.innerText.match(/\p{Emoji_Presentation}/gu)`
Result must be `null` — no emoji characters are present anywhere;
all icons use SVG line icons (not emoji glyphs)
| PASS | FAIL | NOTES |

[ ] TC-PR6-083 Check for emoji characters on LandlordPage
Expected: In DevTools Console on landlord-report, run:
`document.body.innerText.match(/\p{Emoji_Presentation}/gu)`
Result must be `null` — no emoji present on the landlord report page
| PASS | FAIL | NOTES |

[ ] TC-PR6-084 Check that colour values use CSS variables on PersonalBuyerPage
Expected: Right-click any card on personal-report → Inspect → Styles panel;
all colour declarations reference CSS variables (`var(--...)`) — no raw
hex values (e.g., `#4F7A48`, `#B14A37`) appear as direct property values
in component-level stylesheets (tokens.css `:root` declarations are fine)
| PASS | FAIL | NOTES |

[ ] TC-PR6-085 Run axe DevTools scan on personal-report
Expected: Open axe DevTools extension panel → "Scan ALL of my page";
zero violations of any severity (critical, serious, moderate, minor);
if violations appear, record the element selector and rule ID in NOTES
| PASS | FAIL | NOTES |

[ ] TC-PR6-086 Run axe DevTools scan on landlord-report
Expected: Open axe DevTools extension panel → "Scan ALL of my page";
zero violations of any severity; the rent slider (aria-label="Asking rent")
is correctly labelled and generates no axe role or label violation
| PASS | FAIL | NOTES |

[ ] TC-PR6-087 Console zero errors — full scroll on personal-report
Expected: Open DevTools Console; clear it; scroll from top to bottom of
personal-report in a single pass (visiting all 4 sections); after the full
scroll, the console shows zero red errors; no "Cannot read properties of
undefined" or React render exceptions
| PASS | FAIL | NOTES |

[ ] TC-PR6-088 Console zero errors — full scroll on landlord-report
Expected: Open DevTools Console; clear it; scroll from top to bottom of
landlord-report in a single pass (visiting all sections, including rent
positioning and investment metrics); after the full scroll, zero red errors
| PASS | FAIL | NOTES |

[ ] TC-PR6-089 Mobile 380px — personal-report no horizontal overflow
Expected: DevTools Device toolbar → set viewport to 380 × 844px; reload
personal-report; scroll through all 4 sections; no horizontal scrollbar
appears at any point; all content fits within 380px; school columns either
stack or scroll within their container without breaking page layout
| PASS | FAIL | NOTES |

[ ] TC-PR6-090 Mobile 380px — landlord-report no horizontal overflow
Expected: DevTools Device toolbar → set viewport to 380 × 844px; reload
landlord-report; scroll through all sections including the building
comps table and metric tile grid; no horizontal scrollbar appears;
metric tiles collapse from multi-column to single or double column
| PASS | FAIL | NOTES |

---

## Results Summary

| Block | Section                                    | TCs        | Pass | Fail | Blocked |
| ----- | ------------------------------------------ | ---------- | ---- | ---- | ------- |
| 1     | Page Load & Navigation — PersonalBuyerPage | 001–008    |      |      |         |
| 2     | Page Load & Navigation — LandlordPage      | 009–014    |      |      |         |
| 3     | PersonalBuyerPage §01 — True Monthly Cost  | 015–023    |      |      |         |
| 4     | PersonalBuyerPage §02 — Fair Market Value  | 024–027    |      |      |         |
| 5     | PersonalBuyerPage §03 — Comparable Sales   | 028–034    |      |      |         |
| 6     | PersonalBuyerPage §04 — Schools            | 035–043    |      |      |         |
| 7     | LandlordPage §01 — Rent Positioning        | 044–063    |      |      |         |
| 8     | LandlordPage — Shared Components           | 064–077    |      |      |         |
| 9     | Live Recalculation, Tokens, a11y & Mobile  | 078–090    |      |      |         |
| —     | **TOTAL**                                  | **90 TCs** |      |      |         |

**Tester:** ********\_\_\_******** **Date:** ********\_\_\_********

**Overall result:** [ ] PASS — all 90 TCs pass [ ] FAIL — see NOTES above

---

## Test count verification

| Block | Category                                   | Count  |
| ----- | ------------------------------------------ | ------ |
| 1     | Page Load & Navigation — PersonalBuyerPage | 8      |
| 2     | Page Load & Navigation — LandlordPage      | 6      |
| 3     | PersonalBuyerPage §01 — True Monthly Cost  | 9      |
| 4     | PersonalBuyerPage §02 — Fair Market Value  | 4      |
| 5     | PersonalBuyerPage §03 — Comparable Sales   | 7      |
| 6     | PersonalBuyerPage §04 — Schools            | 9      |
| 7     | LandlordPage §01 — Rent Positioning        | 20     |
| 8     | LandlordPage — Shared Components           | 14     |
| 9     | Live Recalculation, Tokens, a11y & Mobile  | 13     |
| —     | **Total**                                  | **90** |
