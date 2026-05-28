# PropScout PR 4 — Chrome UI Test List

**Generated:** 2026-05-28  
**Branch:** feat/pr4-investor-report  
**Total tests:** 111  
**Environment:** Chromium (latest stable), localhost dev server, Vaughan demo data  
**Precondition for all tests:** Dev server running (`npm run dev`), navigate to the InvestorReport demo route so that Vaughan data is loaded and all 11 sections are visible.

---

## DealScore component (6 tests)

─────────────────────────────────────────
TEST: DealScore gauge renders at correct score position for hard-pass score 8
BLOCK: 1
CATEGORY: DealScore
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Locate the DealScore radial gauge (SVG element) in the PropertyHero sticky card.
3. Inspect the foreground arc `<circle>` element's `stroke-dashoffset` attribute.

PASS: The aria-label on the gauge element reads "Deal score: 8 out of 95". The foreground arc is visually small (near-zero fill), consistent with score 8/95 (≈8.4% of the arc). The numeric label "8" appears inside the gauge ring.
FAIL: aria-label reads a value other than "Deal score: 8 out of 95", or the numeric "8" is absent, or the arc appears more than half-filled.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: DealScore gauge arc fill colour is --fail (clay red) for score 8
BLOCK: 2
CATEGORY: DealScore
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Locate the foreground arc `<circle>` inside the DealScore SVG.
3. Open DevTools → Computed styles, inspect the `stroke` value of the foreground arc circle.

PASS: The computed `stroke` resolves to the CSS variable `--fail` (approximately #B14A37 in light mode — clay red). The colour is distinctly red/clay, not green or amber.
FAIL: The stroke colour resolves to `--pass` (green) or `--caution` (amber), or the stroke is missing/transparent.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: DealScore gauge animation completes within expected duration
BLOCK: 3
CATEGORY: DealScore
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Hard-refresh the page (Ctrl+Shift+R) to trigger the gauge animation from scratch.
3. Start a stopwatch and observe the foreground arc stroke-dashoffset transitioning from the full arc (empty gauge) toward the final position.
4. Record how long the arc takes to reach its final position.

PASS: The arc animation completes in approximately 1.4 seconds. The arc does not snap immediately; it eases in and out using the cubic-bezier(.2,.7,.2,1) curve (visually: fast start, slight deceleration at end).
FAIL: The arc snaps to its final position immediately with no animation, or takes longer than 3 seconds, or overshoots and bounces back.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: DealScore score value "8" renders in correct position inside the gauge
BLOCK: 4
CATEGORY: DealScore
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Locate the DealScore radial gauge.
3. Visually verify the numeric text inside the ring.

PASS: The number "8" is centred inside the SVG ring (horizontally and vertically). It renders in a large serif or mono font distinct from surrounding body text. No text is cut off.
FAIL: The number is outside the ring, overlaps the arc strokes, is misaligned, or is absent entirely.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: DealScore label "Hard pass" appears directly below or beside the gauge
BLOCK: 5
CATEGORY: DealScore
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Locate the PropertyHero sticky card containing the DealScore gauge.
3. Inspect the verdict text adjacent to or below the gauge.

PASS: The text "Hard pass" is rendered adjacent to the gauge (below the ring score number, or immediately beside the gauge group). The text is styled in `--fail` colour (clay red) or uses a VerdictPill with fail tone. At least one instance of "Hard pass" is visible in the hero card area.
FAIL: The verdict text is absent, reads something other than "Hard pass", or is styled in pass/caution colour when it should be fail.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: DealScore "out of 95" maximum renders correctly — score is clamped to 95 not 100
BLOCK: 6
CATEGORY: DealScore
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Inspect the DealScore element's `aria-label` attribute via DevTools → Elements panel.
3. Also check whether any visible text near the gauge says "/ 95" or "out of 95".

PASS: The `aria-label` includes the string "out of 95" (not "out of 100"). Any visible sub-text showing the maximum reads "95" rather than "100".
FAIL: The aria-label says "out of 100", or the maximum label shows "100", indicating the clamp of 95 was not applied.
─────────────────────────────────────────

---

## Metric tile component (4 tests)

─────────────────────────────────────────
TEST: Metric tile renders label, value, and optional sub-label
BLOCK: 7
CATEGORY: Metric
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §01 Investment metrics section.
3. Locate any individual metric tile (e.g., the "Cap rate" tile showing "1.47%").
4. Inspect the tile's three content areas: eyebrow label, large value, and sub-label.

PASS: The tile shows: (1) an uppercase mono eyebrow label ("CAP RATE" or similar), (2) a large serif/tabular value ("1.47%"), and (3) a smaller sub-label or context string below. All three regions are readable and non-overlapping.
FAIL: Any of the three content regions is missing or the text values overlap each other.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Metric tile uses --fail colour for negative/bad metric values
BLOCK: 8
CATEGORY: Metric
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §01 Investment metrics section.
3. Locate the "Cash flow" metric tile showing "-$2,431/mo".
4. Inspect the value element's computed colour via DevTools.

PASS: The large value "-$2,431/mo" renders in `--fail` colour (clay red, approximately #B14A37 in light mode). The negative sign and dollar amount are both red.
FAIL: The cash flow value renders in black (`--ink`), green (`--pass`), or amber (`--caution`) rather than `--fail`.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Metric tile uses --pass colour for positive/good metric values
BLOCK: 9
CATEGORY: Metric
─────────────────────────────────────────
Steps:

1. Switch the demo data to Hamilton (if a toggle or demo switcher is available) OR identify any metric tile in the Vaughan report that has a pass-toned value.
2. Alternatively, locate the DSCR tile — if it renders a caution/fail state for Vaughan (DSCR ≈ 0.44x), confirm the colour is appropriate.
3. If a "Gross rent multiplier" or similarly positive metric is visible, inspect its computed colour.

PASS: Metric tiles using a pass tone render their large value in `--pass` colour (sage green, approximately #4F7A48). Caution-toned metric values render in `--caution` (amber). Colour matches the semantic tone of the metric.
FAIL: All metric values render in the same colour regardless of their pass/caution/fail tone.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Metric tile card has correct surface background and border
BLOCK: 10
CATEGORY: Metric
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §01 Investment metrics section.
3. Inspect any metric tile's computed background-color and border via DevTools.

PASS: Tile background resolves to `--surface` (white in light mode). Border resolves to `--line` (a light separator colour). Border-radius is approximately 16–22px (from `--radius-lg` token). The card has the expected PropScout card shadow (`--shadow-card`).
FAIL: Background is the page background `--bg` (cream) rather than `--surface` (white), or there is no border, or border-radius is 0px (square corners).
─────────────────────────────────────────

---

## RentalCompsBar component (6 tests)

─────────────────────────────────────────
TEST: RentalCompsBar renders a horizontal range bar with low, mid, and high markers
BLOCK: 11
CATEGORY: RentalCompsBar
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §03 Rental comps section.
3. Locate the RentalCompsBar horizontal bar.
4. Verify three visual markers or ticks on the bar corresponding to low ($2,700), mid ($2,900), and high ($3,200) rental estimates.

PASS: The bar has a visible track spanning left to right. Three distinct markers (or tick labels) indicate the low, mid, and high rent values. Dollar amounts "$2,700", "$2,900", "$3,200" are readable near their respective positions on the bar.
FAIL: The bar renders as a single solid block with no distinct markers, or dollar labels are missing, or the bar is not present.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: RentalCompsBar diamond marker has aria-label and role="img"
BLOCK: 12
CATEGORY: RentalCompsBar
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §03 Rental comps section.
3. In DevTools → Elements, locate the diamond marker div element on the bar.
4. Inspect its `role` and `aria-label` attributes.

PASS: The diamond div has `role="img"` and `aria-label="Estimated rent: $2,900"` (or the appropriate mid-rent value). Both attributes are present on the same element.
FAIL: The diamond div is missing `role="img"`, or `aria-label` is absent, or the aria-label value does not match the ask-rent figure.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: RentalCompsBar shows tooltip on diamond hover
BLOCK: 13
CATEGORY: RentalCompsBar
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §03 Rental comps section.
3. Move the mouse cursor over the diamond marker on the RentalCompsBar.
4. Hold the cursor still and observe whether a tooltip appears.

PASS: A tooltip becomes visible within 150ms of hovering. The tooltip contains rows with labels such as "Low", "Estimate", "High" and their corresponding dollar values. The tooltip is positioned near the diamond (not off-screen).
FAIL: No tooltip appears on hover, or the tooltip appears but is empty, or the tooltip appears only on click rather than hover.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: RentalCompsBar tooltip disappears when mouse leaves the diamond
BLOCK: 14
CATEGORY: RentalCompsBar
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §03 Rental comps section.
3. Hover over the diamond marker to trigger the tooltip.
4. Move the mouse cursor away from the diamond to a blank area of the section.

PASS: The tooltip fades out or disappears within approximately 150ms of the cursor leaving the diamond. The tooltip does not remain visible after the mouse has moved away.
FAIL: The tooltip remains visible after the mouse leaves, or the tooltip never disappears unless clicked somewhere.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: RentalCompsBar footer label reads "Ask rent" (not "Estimate")
BLOCK: 15
CATEGORY: RentalCompsBar
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §03 Rental comps section.
3. Look at the footer area below the RentalCompsBar (the label next to the ask-rent dollar amount).

PASS: The footer label reads "Ask rent" followed by the dollar amount "$2,900/mo". The word "Estimate" does not appear as a standalone text node in the footer area (to avoid collision with the tooltip row label).
FAIL: The footer label reads "Estimate" (old text), or the footer label is missing, or the dollar amount is not displayed.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: RentalCompsBar comp count and confidence level render correctly
BLOCK: 16
CATEGORY: RentalCompsBar
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §03 Rental comps section.
3. Look for the comp count (number of comparable rentals) and confidence indicator near or below the bar.

PASS: A text element indicates the comp count (e.g., "8 comps" or "Based on 8 comparables"). A confidence indicator (e.g., "Medium confidence" or a colour pill) is visible. Values are consistent with the Vaughan demo data.
FAIL: The comp count label is absent, or shows "0 comps", or confidence indicator is missing entirely.
─────────────────────────────────────────

---

## AIVerdictBlock component (3 tests)

─────────────────────────────────────────
TEST: AIVerdictBlock renders eyebrow "Scout AI · investor verdict"
BLOCK: 17
CATEGORY: AIVerdictBlock
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to the AI Verdict section (dark full-bleed card — should be in the latter portion of the report).
3. Read the eyebrow text above the main headline.

PASS: The eyebrow reads "Scout AI · investor verdict" (case-insensitive). The text is in a small mono uppercase style and clearly differentiated from the main headline.
FAIL: The eyebrow is missing, reads different text, or is styled the same as the body headline making it indistinguishable.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: AIVerdictBlock renders ScoutMark watermark on dark card background
BLOCK: 18
CATEGORY: AIVerdictBlock
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to the AI Verdict dark card section.
3. Look for a faint watermark glyph (the ScoutMark / PropScout logo symbol) embedded in the dark card background.
4. Inspect the element's opacity in DevTools.

PASS: A semi-transparent watermark SVG is visible on the dark card. Its opacity is approximately 6–8% (very faint but perceptible at full size, 460–560px). The card background is dark (uses `--ink` as background colour).
FAIL: No watermark is present on the card, or the watermark opacity is above 20% (too prominent), or the card background is light instead of dark.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: AIVerdictBlock model tag reads "claude · sonnet 4.6"
BLOCK: 19
CATEGORY: AIVerdictBlock
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to the AI Verdict dark card.
3. Locate the small model attribution tag (bottom of the card or near the eyebrow).

PASS: The model tag reads "claude · sonnet 4.6" (lowercase). The tag is styled distinctly from the main narrative text — small mono font, muted colour.
FAIL: The tag is absent, reads a different model name, or uses capital letters when the design requires lowercase.
─────────────────────────────────────────

---

## RiskRow component (3 tests)

─────────────────────────────────────────
TEST: RiskRow renders label and detail text for "Condo-fee burden"
BLOCK: 20
CATEGORY: RiskRow
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §06 Risk flags section.
3. Locate the "Condo-fee burden" risk row.

PASS: A row is visible with the label "Condo-fee burden" and a supporting detail text beneath it explaining the risk (e.g., "Maintenance fee of $761/mo is N% of gross rent, above the 25% threshold"). The row is present and fully readable.
FAIL: The risk row is absent, the label text is different from "Condo-fee burden", or the detail text is missing.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: RiskRow renders label "Deeply negative cash flow" with fail tone colour
BLOCK: 21
CATEGORY: RiskRow
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §06 Risk flags section.
3. Locate the "Deeply negative cash flow" risk row.
4. Inspect the row's icon or label colour in DevTools → Computed.

PASS: The risk row "Deeply negative cash flow" is visible. Its icon or label colour resolves to `--fail` (clay red, approximately #B14A37). Detail text explains the negative cash flow amount.
FAIL: The row is missing, uses `--caution` (amber) instead of `--fail`, or the colour is `--ink` (black) with no semantic colouring.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: RiskRow rows use correct tone colours — fail rows are red, caution rows are amber
BLOCK: 22
CATEGORY: RiskRow
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §06 Risk flags section.
3. Count all visible risk rows and their tones.
4. Identify at least one fail-tone row (red) and check whether any caution-tone rows are present.
5. Compare colours using DevTools.

PASS: Rows tagged as "fail" tone render their accent element (icon, dot, or label) in `--fail` (#B14A37). Rows tagged as "caution" tone render in `--caution` (#B98724). No cross-colouring occurs (fail rows are never amber; caution rows are never red).
FAIL: All risk rows render the same colour regardless of tone, or fail rows are styled with caution colour, or caution rows are styled with fail colour.
─────────────────────────────────────────

---

## MiniMap component (2 tests)

─────────────────────────────────────────
TEST: MiniMap renders with accessible aria-label identifying the property location
BLOCK: 23
CATEGORY: MiniMap
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to the PropertyHero section or wherever the MiniMap is embedded.
3. Inspect the map container element in DevTools → Elements.
4. Find its `aria-label` attribute.

PASS: The map container has an `aria-label` that references the property location, such as "Map showing 5 Buttermill Avenue, Vaughan" or similar address-based label. The map renders visually (either as a Mapbox tile or placeholder image).
FAIL: The map container has no `aria-label`, or the aria-label is a generic placeholder like "Map" with no address context.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: MiniMap renders at the correct height without collapsing to zero
BLOCK: 24
CATEGORY: MiniMap
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to the section containing the MiniMap.
3. In DevTools, click the map element and check its computed `height`.

PASS: The map element has a computed height of at least 180px. It is visible in the viewport when the section is scrolled into view. The map does not collapse to 0px or 1px.
FAIL: The map element has height: 0, or display: none, or the map container is present but invisible due to a sizing issue.
─────────────────────────────────────────

---

## PropertyHero component (6 tests)

─────────────────────────────────────────
TEST: PropertyHero renders the full property address "Unit 5702 · 5 Buttermill Avenue"
BLOCK: 25
CATEGORY: PropertyHero
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to the top of the report (PropertyHero section).
3. Read the property address line.

PASS: The text "Unit 5702 · 5 Buttermill Avenue" appears as the property address. The interpunct (·) is present. "Vaughan, ON" or similar city/province appears on a second line or as a separate element.
FAIL: The address is absent, truncated, or incorrect. The unit number is missing from the display.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: PropertyHero sticky score card remains visible when scrolling past the hero
BLOCK: 26
CATEGORY: PropertyHero
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll down slowly past the PropertyHero section until the hero image/address area scrolls off screen.
3. Continue scrolling to §01, §02, §03.
4. Observe whether the score card (containing the deal score, verdict, and key metrics) remains fixed in the viewport.

PASS: The PropertyHero sticky score card remains visible in the top-right area (or a fixed/sticky rail) as the user scrolls down the report. The deal score "8", verdict "Hard pass", and key metrics (cap rate, cash flow) remain readable without scrolling back to the top.
FAIL: The score card scrolls away with the hero and is no longer visible when reading §01 or lower sections. No sticky or fixed positioning is applied.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: PropertyHero renders the listing price "$729,900"
BLOCK: 27
CATEGORY: PropertyHero
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to the PropertyHero section.
3. Locate the listing price display.

PASS: The price "$729,900" is rendered in the hero section in a large, prominent serif/tabular font. The currency symbol ($) and comma separators are present.
FAIL: The price is absent, shows a different value, or is rendered without the $ prefix or comma formatting.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: PropertyHero renders property chips (beds, baths, sqft, type)
BLOCK: 28
CATEGORY: PropertyHero
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to the PropertyHero section.
3. Locate the row of Chip components below the address.

PASS: At least 3 chips are visible showing key property attributes: number of beds (e.g., "3 bed"), bathrooms (e.g., "2 bath"), and square footage or property type (e.g., "Condo"). Each chip is a rounded pill shape using `--surface` or `--bg-elev` background with `--line` border.
FAIL: No chips are visible, chips are collapsed into a single line of unstyled text, or property attributes are missing.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: PropertyHero back button navigates away from the report
BLOCK: 29
CATEGORY: PropertyHero
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to the PropertyHero section (or check the Nav bar at top).
3. Locate the back button (arrow-left icon or "← Back" text).
4. Click the back button.

PASS: After clicking, the browser navigates back (either to the previous history entry or to the home/landing page). The InvestorReport page is no longer in view. No JavaScript error appears in the console.
FAIL: Clicking the back button has no effect, or causes a JavaScript error, or navigates to a 404 page.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: PropertyHero key metrics row shows cap rate, cash flow, and DSCR
BLOCK: 30
CATEGORY: PropertyHero
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Locate the sticky score card within PropertyHero.
3. Read the three key metric values displayed below the deal score gauge.

PASS: Three metrics are visible: (1) Cap rate "1.47%", (2) Monthly cash flow "−$2,431/mo" (or similar negative value), (3) DSCR "0.44x" (or similar sub-1.0 value). Each metric has a label and a value in the expected format.
FAIL: Fewer than three metrics are shown, any metric value is "0" or blank, or the values do not match the Vaughan calibration figures.
─────────────────────────────────────────

---

## FinancingSliders component (9 tests)

─────────────────────────────────────────
TEST: Down payment percentage slider renders with correct default value (20%)
BLOCK: 31
CATEGORY: FinancingSliders
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §02 Financing scenarios section.
3. Locate the down payment slider.
4. Read the current displayed value.

PASS: The down payment slider displays "20%" as its default value. The slider thumb is positioned at the 20% mark on the track. A corresponding dollar amount (e.g., "$145,980" for 20% of $729,900) is displayed nearby.
FAIL: The slider shows a value other than 20%, or no dollar amount is shown, or the slider thumb position does not correspond to 20%.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Mortgage rate slider renders with correct default value (4.79%)
BLOCK: 32
CATEGORY: FinancingSliders
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §02 Financing scenarios section.
3. Locate the mortgage rate slider.
4. Read the current displayed value.

PASS: The mortgage rate slider displays "4.79%" as its default value. The slider thumb is positioned at the correct position on the track range (2–10%).
FAIL: The rate displays a value other than 4.79%, or the slider is missing, or the track does not span the 2–10% range.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Amortization slider renders with correct default value (25 years)
BLOCK: 33
CATEGORY: FinancingSliders
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §02 Financing scenarios section.
3. Locate the amortization period slider.
4. Read the current displayed value.

PASS: The amortization slider displays "25 yr" or "25 years" as its default value. The slider track spans 10–30 years, with the thumb at the 25-year position (approximately 75% along the track).
FAIL: The amortization value is not 25 years, or the track range is wrong, or the "years" unit label is absent.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Dragging down payment slider updates the displayed percentage live
BLOCK: 34
CATEGORY: FinancingSliders
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §02 Financing scenarios section.
3. Click and drag the down payment slider thumb from 20% to 30%.
4. Observe the percentage label update.

PASS: As the slider is dragged, the percentage label updates synchronously (no debounce delay). At 30%, the label reads "30%". The corresponding dollar amount updates to approximately "$218,970" (30% of $729,900). Updates happen in real time during the drag, not only on release.
FAIL: The label only updates when the slider is released (not during drag), or the label shows a stale value, or the dollar amount does not update to match the new percentage.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: OSFI preset button sets mortgage rate to 6.79% and is labelled "OSFI"
BLOCK: 35
CATEGORY: FinancingSliders
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §02 Financing scenarios section.
3. Locate the "OSFI" preset button.
4. Click the "OSFI" preset button.

PASS: After clicking, the mortgage rate slider and its label update to "6.79%". The button is labelled exactly "OSFI" (accessible button role). No page reload occurs.
FAIL: Clicking OSFI sets the rate to a value other than 6.79%, or the button is labelled differently ("Stress test", "OSFI test"), or the slider does not visibly move.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Base preset button sets financing back to defaults (20% DP, 4.79% rate)
BLOCK: 36
CATEGORY: FinancingSliders
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §02 Financing scenarios section.
3. Click the OSFI preset to change the rate to 6.79%.
4. Then click the "Base" preset button.

PASS: After clicking Base, all sliders reset to their default values: down payment = 20%, mortgage rate = 4.79%, amortization = 25 years. All three slider thumbs return to their default positions, and the displayed labels update accordingly.
FAIL: After clicking Base, any slider retains the OSFI or modified value rather than returning to the default.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Sliders have correct interactive range bounds
BLOCK: 37
CATEGORY: FinancingSliders
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §02 Financing scenarios section.
3. Drag the down payment slider to its leftmost stop.
4. Read the minimum value shown.
5. Drag to the rightmost stop and read the maximum value.
6. Repeat for the mortgage rate slider and amortization slider.

PASS: Down payment slider: min = 5%, max = 50%. Mortgage rate slider: min = 2%, max = 10%. Amortization slider: min = 10 years, max = 30 years. None of the sliders allow values outside these bounds.
FAIL: A slider allows values below its minimum or above its maximum (e.g., negative down payment, 0% rate, or 50-year amortization).
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Dollar amount displayed for down payment is correct and updates with slider
BLOCK: 38
CATEGORY: FinancingSliders
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §02 Financing scenarios section.
3. Verify the down payment dollar display at 20% (should show approximately "$145,980").
4. Move slider to 25%; verify dollar amount updates to approximately "$182,475".

PASS: At 20%, dollar display reads "$145,980" (or $145,980 rounded to nearest dollar). At 25%, display reads "$182,475" (or close). The dollar amount updates synchronously with the slider drag.
FAIL: The dollar display is absent, shows a static/stale value, or does not update when the slider is moved.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: FinancingSliders section heading is "Financing scenarios"
BLOCK: 39
CATEGORY: FinancingSliders
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §02 section.
3. Read the SectionHead topic text.

PASS: The SectionHead for §02 reads "Financing scenarios" as the topic span. The section number "02" is visible. The question text below the topic includes an italic key word per PropScout brand style.
FAIL: The section is labelled with different text, the section number is absent, or no italic keyword appears in the question.
─────────────────────────────────────────

---

## Slider recalculation cross-component (7 tests)

─────────────────────────────────────────
TEST: Increasing down payment reduces monthly mortgage payment displayed in §01
BLOCK: 40
CATEGORY: Slider recalculation
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Note the current mortgage payment metric value in §01 (at 20% DP: approximately $3,327/mo).
3. Scroll to §02 and drag the down payment slider to 30%.
4. Scroll back to §01 and read the mortgage payment metric.

PASS: After increasing DP to 30%, the monthly mortgage payment in §01 decreases (e.g., to approximately $2,911/mo for 30% of $729,900 at 4.79%). The update is visible without a page reload.
FAIL: The mortgage payment in §01 does not change after the slider is moved, or it increases when DP is raised.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Increasing mortgage rate increases monthly payment and worsens cash flow
BLOCK: 41
CATEGORY: Slider recalculation
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Note current cash flow (approximately −$2,431/mo at 4.79%).
3. Scroll to §02 and drag the mortgage rate slider to 6.00%.
4. Observe the cash flow metric and monthly payment metric update across sections.

PASS: At 6.00% rate, cash flow becomes more negative than −$2,431/mo (e.g., approximately −$2,800 or worse). The mortgage payment increases accordingly. Both the §01 metric tile and the PropertyHero sticky card cash flow value update.
FAIL: Cash flow does not change after rate increase, or it unexpectedly improves, or only one display location updates while the other shows the stale value.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: OSFI preset click updates OSFI qualifying rate display in §05
BLOCK: 42
CATEGORY: Slider recalculation
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §05 OSFI stress test section.
3. Note the qualifying rate displayed (should be 6.79% by default, since max(4.79+2%, 5.25%) = 6.79%).
4. Scroll to §02 and drag the mortgage rate to 5.00%.
5. Scroll back to §05 and check the qualifying rate.

PASS: At 5.00% contract rate, OSFI qualifying rate = max(5.00+2%, 5.25%) = 7.00%. The §05 OSFICard updates to show "7.00%" without a page reload. The OSFI verdict (pass/fail) updates accordingly.
FAIL: The §05 qualifying rate does not change after modifying the rate slider, or it shows a hardcoded value regardless of the slider position.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Equity chart milestone markers recalculate when down payment changes
BLOCK: 43
CATEGORY: Slider recalculation
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §07 Equity build section and note Year 0 equity value (at 20% DP: approximately $145,980).
3. Scroll to §02 and change the down payment slider to 25%.
4. Scroll back to §07 Equity build and read Year 0 equity value.

PASS: After changing DP to 25%, Year 0 equity in §07 updates to approximately $182,475. The chart curve re-renders to reflect the new starting equity position.
FAIL: Year 0 equity in §07 remains at the 20% DP value after the slider is changed, indicating no recalculation occurred.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: LTT table in §04 does not change when financing sliders are adjusted (financing is independent of LTT)
BLOCK: 44
CATEGORY: Slider recalculation
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §04 Cash to close and note the LTT total "$11,073".
3. Scroll to §02 and change down payment to 30%.
4. Scroll back to §04 and check the LTT total.

PASS: The LTT total remains "$11,073" regardless of the down payment change. LTT is calculated on purchase price, not on financing. The total cash required at closing does change (down payment amount increases), but the LTT line item itself remains fixed.
FAIL: The LTT total changes when the down payment slider is moved (indicating an incorrect dependency between financing inputs and LTT calculation).
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Slider drag causes synchronous (instant) metric updates — no visible loading spinner
BLOCK: 45
CATEGORY: Slider recalculation
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §02 Financing scenarios section.
3. Rapidly drag the mortgage rate slider back and forth multiple times.
4. Observe whether any loading spinner or "calculating..." text appears during the drag.

PASS: No loading spinner, skeleton state, or "calculating" message appears during slider interaction. All visible metrics update instantly and continuously as the slider is dragged — pure synchronous client-side calculation with no async delay.
FAIL: A loading spinner appears while dragging, metrics show "--" or "..." during the drag, or there is a noticeable delay between moving the slider and seeing updated values.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Changing amortization to 30 years reduces monthly payment and improves cash flow
BLOCK: 46
CATEGORY: Slider recalculation
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data (default 25-year amortization).
2. Note cash flow (approximately −$2,431/mo).
3. Scroll to §02 and drag the amortization slider to 30 years.
4. Observe the cash flow update.

PASS: At 30-year amortization, the monthly mortgage payment decreases (lower payment per period), resulting in a less negative cash flow (e.g., approximately −$2,100/mo or less negative). The §01 metrics and sticky hero card both update.
FAIL: Cash flow becomes more negative with 30-year amortization, or does not change at all.
─────────────────────────────────────────

---

## OSFICard component (4 tests)

─────────────────────────────────────────
TEST: OSFICard renders qualifying rate "6.79%" for base scenario (4.79% + 2%)
BLOCK: 47
CATEGORY: OSFICard
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §05 OSFI stress test section.
3. Locate the OSFICard and read the qualifying rate value.

PASS: The qualifying rate displays "6.79%". This is the OSFI B-20 stress test rate for a 4.79% mortgage rate: max(4.79% + 2%, 5.25%) = 6.79%. The label context makes clear this is the OSFI qualifying rate.
FAIL: The qualifying rate shows a value other than 6.79%, or shows the contract rate (4.79%) instead of the stress-test rate, or the rate is missing entirely.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: OSFICard renders a verdict pill indicating whether the borrower qualifies
BLOCK: 48
CATEGORY: OSFICard
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §05 OSFI stress test section.
3. Locate the VerdictPill on the OSFICard.
4. Check whether it shows pass, caution, or fail tone.

PASS: A VerdictPill is present on the OSFICard. For Vaughan (DSCR at stress rate is below 1.0), the pill renders as "fail" tone (clay red). The pill label describes the qualification outcome (e.g., "Does not qualify" or "Fails stress test").
FAIL: No verdict pill is present, or the pill shows the wrong tone (pass green when the borrower fails the stress test).
─────────────────────────────────────────

─────────────────────────────────────────
TEST: OSFICard explains the stress test formula with a threshold reference
BLOCK: 49
CATEGORY: OSFICard
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §05 OSFI stress test section.
3. Read the explanatory text within the OSFICard.

PASS: The card contains text that references the B-20 rule mechanics, such as "qualifying rate = greater of (contract rate + 2%) or 5.25%", or words to that effect. The 5.25% floor threshold is mentioned or implied.
FAIL: The card contains no explanatory text about how the qualifying rate is derived, or the floor threshold is incorrect (shown as a different percentage).
─────────────────────────────────────────

─────────────────────────────────────────
TEST: OSFICard section heading is "OSFI stress test"
BLOCK: 50
CATEGORY: OSFICard
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §05 section.
3. Read the SectionHead topic text.

PASS: The SectionHead for §05 reads "OSFI stress test" as the topic span. Section number "05" is visible. The text appears in at least two additional locations: inside the OSFICard header and in the Footer Resources nav link.
FAIL: The section topic reads different text, the section number is not "05", or the heading uses incorrect casing/punctuation.
─────────────────────────────────────────

---

## LTTTable component (3 tests)

─────────────────────────────────────────
TEST: LTTTable shows correct Ontario provincial LTT total of $11,073 for Vaughan at $729,900
BLOCK: 51
CATEGORY: LTTTable
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §04 Cash to close section.
3. Locate the LTTTable component showing the land transfer tax breakdown.
4. Find the Ontario provincial LTT total row.

PASS: The Ontario provincial LTT total reads "$11,073". This is the correct value for a $729,900 purchase in Ontario (non-Toronto), applying the 5-bracket schedule. Individual bracket rows should be visible and sum to $11,073.
FAIL: The LTT total reads a different value, or the total row is absent, or the individual bracket rows are not shown.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: LTTTable for Vaughan does NOT show a Toronto municipal LTT row (not Toronto)
BLOCK: 52
CATEGORY: LTTTable
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §04 Cash to close section.
3. Inspect the LTTTable for any Toronto-specific municipal tax row.

PASS: No "Toronto Municipal LTT" row or "City of Toronto LTT" line item appears in the table. Only the Ontario provincial LTT rows and total are shown. The section clearly indicates this is Ontario LTT only.
FAIL: A Toronto Municipal LTT row is erroneously displayed for a Vaughan property (Vaughan is not within the City of Toronto).
─────────────────────────────────────────

─────────────────────────────────────────
TEST: LTTTable renders bracket rows with percentage rates and applicable ranges
BLOCK: 53
CATEGORY: LTTTable
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §04 Cash to close section.
3. Inspect the LTTTable rows for the Ontario provincial schedule.
4. Verify that bracket boundaries and rates are labelled.

PASS: At least 4 bracket rows are visible. Each row shows: (1) the tax rate percentage (e.g., 0.5%, 1.0%, 1.5%, 2.0%), (2) the applicable price range (e.g., "$0–$55,000"), and (3) the tax contribution amount for that bracket. Brackets are ordered from lowest to highest.
FAIL: Only the total row is shown with no bracket breakdown, or fewer than 4 bracket rows appear, or rate/range labels are absent.
─────────────────────────────────────────

---

## EquityChart component (6 tests)

─────────────────────────────────────────
TEST: EquityChart renders a line chart covering Year 0 to Year 20
BLOCK: 54
CATEGORY: EquityChart
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §07 Equity build section.
3. Locate the EquityChart SVG or canvas element.
4. Inspect the x-axis for year labels.

PASS: The chart x-axis spans from Year 0 to Year 20. Year labels are visible at regular intervals (at minimum Year 0, Year 5, Year 10, Year 15, Year 20). The chart line covers all 21 data points (0 through 20).
FAIL: The x-axis ends before Year 20, or Year 0 is missing from the axis, or the chart element is empty/not rendered.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: EquityChart Year 0 equity matches 20% down payment of $729,900
BLOCK: 55
CATEGORY: EquityChart
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data (default 20% DP).
2. Scroll to §07 Equity build section.
3. Hover over or inspect the Year 0 data point on the chart.
4. Read the equity value at Year 0.

PASS: Year 0 equity displays approximately "$145,980" (20% of $729,900 = $145,980). A tooltip or axis label reveals this value when Year 0 is hovered or identified. The value is the down payment amount.
FAIL: Year 0 equity shows a value other than approximately $145,980 (not within $1,000 of expected), or Year 0 data point is not accessible/hoverable.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: EquityChart Year 20 equity reflects 3% annual appreciation on property value
BLOCK: 56
CATEGORY: EquityChart
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §07 Equity build section.
3. Hover over or inspect the Year 20 data point on the chart.
4. Read the equity value at Year 20.

PASS: Year 20 equity is significantly higher than Year 0 (reflecting 20 years of mortgage paydown + 3% annual appreciation). Expected range: approximately $850,000–$1,100,000. The chart line has positive slope throughout its span.
FAIL: Year 20 equity is equal to or less than Year 0 equity, or the value is implausibly small (under $300,000) or implausibly large (over $2,000,000).
─────────────────────────────────────────

─────────────────────────────────────────
TEST: EquityChart shows at least one milestone marker annotation
BLOCK: 57
CATEGORY: EquityChart
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §07 Equity build section.
3. Look for annotated milestone markers on the chart line (e.g., "Break even", "25% equity", or year-based milestones).

PASS: At least one milestone annotation is visible on the chart — a labelled dot, vertical marker, or callout box placed at a notable point along the equity curve (e.g., when equity reaches a round number, or when 25% equity threshold is crossed).
FAIL: No milestone annotations appear on the chart. The line is completely bare with no contextual markers.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: EquityChart hover tooltip shows year and equity value
BLOCK: 58
CATEGORY: EquityChart
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §07 Equity build section.
3. Move the mouse cursor slowly along the chart line.
4. Pause at approximately Year 10 and observe any tooltip.

PASS: A tooltip appears near the cursor showing: (1) the year label ("Year 10" or "Year 10 / 2036"), and (2) the equity value at that year (approximately $400,000–$600,000 depending on appreciation calculation). The tooltip updates as the cursor moves to different years.
FAIL: No tooltip appears on hover, or the tooltip shows only the year without the equity value, or the tooltip remains static regardless of cursor position.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: EquityChart section heading is "Equity build"
BLOCK: 59
CATEGORY: EquityChart
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §07 section.
3. Read the SectionHead topic text.

PASS: The SectionHead for §07 reads "Equity build" as the topic. Section number "07" is visible. The section question below contains an italic word per PropScout brand convention.
FAIL: The section topic reads different text, or the section number is not "07".
─────────────────────────────────────────

---

## InvestmentMetricsSection (7 tests)

─────────────────────────────────────────
TEST: InvestmentMetricsSection renders at least 8 metric tiles
BLOCK: 60
CATEGORY: InvestmentMetricsSection
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §01 Investment metrics section.
3. Count the number of individual Metric tile cards visible.

PASS: At least 8 distinct metric tiles are rendered in a grid layout. Each tile contains a label, a value, and context text. The grid has at least 3 columns on a desktop viewport (≥1024px wide).
FAIL: Fewer than 8 tiles are visible, or the tiles are rendered in a single column (grid layout broken), or any tile is blank.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: InvestmentMetricsSection shows cap rate tile with value "1.47%"
BLOCK: 61
CATEGORY: InvestmentMetricsSection
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §01 Investment metrics section.
3. Locate the "Cap rate" metric tile.
4. Read its value.

PASS: The cap rate tile displays "1.47%". The label "Cap rate" (or "CAP RATE" as eyebrow) is visible. The tile colour tone is "fail" (clay red) since 1.47% is well below a healthy cap rate threshold.
FAIL: The cap rate shows a value other than "1.47%", or the tile is missing, or the wrong tone colour is applied.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: InvestmentMetricsSection shows monthly cash flow tile with value "−$2,431/mo"
BLOCK: 62
CATEGORY: InvestmentMetricsSection
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §01 Investment metrics section.
3. Locate the "Cash flow" or "Monthly cash flow" metric tile.
4. Read its value.

PASS: The cash flow tile displays "−$2,431/mo" (negative value). The tile is styled in `--fail` colour to indicate a deeply negative cash flow. The negative sign (−) or minus sign (−) is present before the dollar amount.
FAIL: Cash flow displays a positive value, shows zero, or the negative formatting is missing (e.g., shows "$2,431/mo" without the minus sign).
─────────────────────────────────────────

─────────────────────────────────────────
TEST: InvestmentMetricsSection renders expense breakdown "Where the money goes."
BLOCK: 63
CATEGORY: InvestmentMetricsSection
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §01 Investment metrics section.
3. Locate the expense breakdown card.
4. Check the heading above the expense items.

PASS: An `<h3>` (not `<h4>`) heading reads "Where the money goes." The expense breakdown shows individual line items such as mortgage payment, condo fee, taxes, and insurance. The sub-heading level is h3 (one level below the SectionHead's h2).
FAIL: The heading is `<h4>` instead of `<h3>` (axe heading-order violation), or the heading text is different, or no expense breakdown is rendered.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: InvestmentMetricsSection shows DSCR tile with sub-1.0 value for Vaughan
BLOCK: 64
CATEGORY: InvestmentMetricsSection
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §01 Investment metrics section.
3. Locate the "DSCR" or "Debt service coverage" tile.
4. Read its value.

PASS: The DSCR tile displays a value below 1.0 (e.g., "0.44x"). This is the correct Vaughan result where rent ($2,900/mo) does not cover the total debt service. The tile is styled in `--fail` colour.
FAIL: DSCR shows a value above 1.0 for the Vaughan property, or the tile is absent, or the "x" multiplier suffix is missing.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: InvestmentMetricsSection section heading is "Investment metrics"
BLOCK: 65
CATEGORY: InvestmentMetricsSection
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to the top of §01.
3. Read the SectionHead topic text.

PASS: The SectionHead for §01 reads "Investment metrics" as the topic. Section number "01" is visible. The question text includes an italic key word (e.g., "Does the deal _pencil_?").
FAIL: The section topic reads different text, section number "01" is absent, or no italic keyword appears in the question.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: InvestmentMetricsSection mortgage payment tile shows $3,327/mo at default settings
BLOCK: 66
CATEGORY: InvestmentMetricsSection
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Ensure sliders are at default values (20% DP, 4.79% rate, 25 yr).
3. Scroll to §01 Investment metrics section.
4. Locate the mortgage payment tile.
5. Read the displayed monthly payment.

PASS: The mortgage payment tile displays "$3,327/mo" or "$3,326/mo" (within $2 rounding tolerance of the calibration value $3,326.64). The tile label is "Mortgage" or "Monthly payment".
FAIL: The mortgage payment shows a value outside the range $3,324–$3,330, indicating a calculation error.
─────────────────────────────────────────

---

## NeighbourhoodSection (5 tests)

─────────────────────────────────────────
TEST: NeighbourhoodSection renders 6 stat tiles in a grid
BLOCK: 67
CATEGORY: NeighbourhoodSection
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §08 Neighbourhood section.
3. Count the stat tiles above the comparable sales table.

PASS: Exactly 6 stat tiles are rendered in a 3-column grid: Median income, 5-year pop. growth, Walk Score, Transit Score, Active building permits, and Price per sqft trend. Each tile has an eyebrow label, a large value, and a sub-label.
FAIL: Fewer or more than 6 stat tiles appear, or the grid is displayed as a list rather than a multi-column grid.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: NeighbourhoodSection renders comparable sales table with "What sold nearby." heading
BLOCK: 68
CATEGORY: NeighbourhoodSection
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §08 Neighbourhood section.
3. Locate the comparable sales table.
4. Check the heading above the table.

PASS: An `<h3>` (not `<h4>`) heading reads "What sold nearby." The table shows at least 3 comparable sale rows with address, bed count, sqft, sold price, and date. The sub-heading is h3 (correct level below SectionHead's h2).
FAIL: The heading uses `<h4>` (axe violation), or the heading text is different, or fewer than 3 comparable rows are shown.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: NeighbourhoodSection appreciation card shows a 5-year appreciation percentage
BLOCK: 69
CATEGORY: NeighbourhoodSection
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §08 Neighbourhood section.
3. Locate the appreciation card (dark background card to the right of the comparable sales table).
4. Read the 5-year appreciation value.

PASS: The appreciation card shows a 5-year appreciation percentage as a large serif number (e.g., "+28.5%"). A 10-year value is also displayed (smaller). The card background is dark (uses `--ink` as background).
FAIL: The appreciation card has a light background, or the percentage is missing, or only the 5-year figure is shown without any 10-year reference.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: NeighbourhoodSection appreciation card has dark background with light text
BLOCK: 70
CATEGORY: NeighbourhoodSection
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §08 Neighbourhood section.
3. Inspect the appreciation card's computed background-color in DevTools.

PASS: The appreciation card's `background-color` resolves to `--ink` (near-black, approximately #0E1320). Text within the card resolves to `--bg` or white — clearly legible against the dark background. Colour contrast ratio is ≥ 4.5:1 for all text elements.
FAIL: The card background is light (white or cream), making it indistinguishable from the comparable sales card, or text contrast is insufficient.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: NeighbourhoodSection section heading is "Neighbourhood"
BLOCK: 71
CATEGORY: NeighbourhoodSection
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §08 section.
3. Read the SectionHead topic text.

PASS: The SectionHead for §08 reads "Neighbourhood" (Canadian spelling, not "Neighborhood"). Section number "08" is visible. The section question contains an italic key word per PropScout brand style.
FAIL: The topic uses "Neighborhood" (American spelling), section number "08" is absent, or no italic keyword appears in the question.
─────────────────────────────────────────

---

## STRPlaceholderSection (3 tests)

─────────────────────────────────────────
TEST: STRPlaceholderSection shows "Coming Phase 2" chip and blurred mock numbers
BLOCK: 72
CATEGORY: STRPlaceholderSection
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §10 STR vs LTR section.
3. Inspect the left card (the AirDNA revenue modeling card).

PASS: A "Coming Phase 2" chip is visible in the top-right of the card. A grid of mock STR numbers (Nightly ADR, Occupancy, Net rev /mo, etc.) is partially visible but visually blurred or faded. A "Notify me when STR ships" button is present.
FAIL: No "Coming Phase 2" chip appears, or the mock numbers are fully readable without any blur/fade effect, or the notify button is absent.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: STRPlaceholderSection legality card shows "Vaughan rules" as an h3 heading
BLOCK: 73
CATEGORY: STRPlaceholderSection
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §10 STR vs LTR section.
3. Locate the STR legality card (right card).
4. Inspect the heading element inside the legality card using DevTools.

PASS: The heading inside the legality card reads "Vaughan rules" and is rendered as `<h3>` (not `<h4>`). A VerdictPill with caution tone shows the rule "Permitted with registration" for Vaughan. The card contains explanatory text about Vaughan's registration requirement.
FAIL: The heading is `<h4>` instead of `<h3>` (axe violation), or it shows a different city name, or the VerdictPill tone is incorrect.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: STRPlaceholderSection shows Other Ontario cities comparison table
BLOCK: 74
CATEGORY: STRPlaceholderSection
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §10 STR vs LTR section, legality card.
3. Look for the "Other Ontario cities" comparison rows below a horizontal divider.

PASS: A section labelled "Other Ontario cities" or similar is visible with at least 4 city rows: Toronto (fail — "Principal-residence only"), Ottawa (caution — "Permitted · registration"), Mississauga (fail — "Principal residence"), Hamilton (pass — "Permitted"). Each row has a VerdictPill with the correct tone colour.
FAIL: The comparison table is absent, shows fewer than 4 cities, or the tone colours do not match the expected pass/caution/fail semantics.
─────────────────────────────────────────

---

## Section headings — all 11 sections (11 tests)

─────────────────────────────────────────
TEST: §01 Investment metrics — SectionHead has correct number and topic
BLOCK: 75
CATEGORY: Section headings
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §01 Investment metrics.
3. Verify the section number and topic in the SectionHead.

PASS: Section number "01" and topic "Investment metrics" are both visible in the SectionHead. The section question contains italic styling on a key word.
FAIL: Section number is missing or incorrect, or topic text differs from "Investment metrics".
─────────────────────────────────────────

─────────────────────────────────────────
TEST: §02 Financing scenarios — SectionHead has correct number and topic
BLOCK: 76
CATEGORY: Section headings
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page and scroll to §02.
2. Verify number "02" and topic "Financing scenarios".

PASS: "02" and "Financing scenarios" are visible in the SectionHead.
FAIL: Number or topic is incorrect or missing.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: §03 Rental comps — SectionHead has correct number and topic
BLOCK: 77
CATEGORY: Section headings
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page and scroll to §03.
2. Verify number "03" and topic "Rental comps".

PASS: "03" and "Rental comps" are visible in the SectionHead.
FAIL: Number or topic is incorrect or missing.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: §04 Cash to close — SectionHead has correct number and topic
BLOCK: 78
CATEGORY: Section headings
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page and scroll to §04.
2. Verify number "04" and topic "Cash to close".

PASS: "04" and "Cash to close" are visible in the SectionHead.
FAIL: Number or topic is incorrect or missing.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: §05 OSFI stress test — SectionHead has correct number and topic
BLOCK: 79
CATEGORY: Section headings
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page and scroll to §05.
2. Verify number "05" and topic "OSFI stress test".

PASS: "05" and "OSFI stress test" are visible in the SectionHead. (Note: this text also appears in the OSFICard header and Footer nav — all three occurrences are expected and correct.)
FAIL: Number or topic is incorrect or missing.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: §06 Risk flags — SectionHead has correct number and topic
BLOCK: 80
CATEGORY: Section headings
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page and scroll to §06.
2. Verify number "06" and topic "Risk flags".

PASS: "06" and "Risk flags" are visible in the SectionHead.
FAIL: Number or topic is incorrect or missing.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: §07 Equity build — SectionHead has correct number and topic
BLOCK: 81
CATEGORY: Section headings
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page and scroll to §07.
2. Verify number "07" and topic "Equity build".

PASS: "07" and "Equity build" are visible in the SectionHead.
FAIL: Number or topic is incorrect or missing.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: §08 Neighbourhood — SectionHead has correct number and topic
BLOCK: 82
CATEGORY: Section headings
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page and scroll to §08.
2. Verify number "08" and topic "Neighbourhood" (Canadian spelling).

PASS: "08" and "Neighbourhood" (with "u") are visible in the SectionHead.
FAIL: Number or topic is incorrect, or American spelling "Neighborhood" is used.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: §09 SunScout placeholder — SectionHead has correct number and topic
BLOCK: 83
CATEGORY: Section headings
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page and scroll to §09.
2. Verify number "09" and topic "SunScout".

PASS: "09" and "SunScout" are visible in the SectionHead. (Note: "SunScout" also appears in the Footer product link — both occurrences expected.) The section references solar path analysis in its content.
FAIL: Number or topic is incorrect or missing.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: §10 STR vs LTR — SectionHead has correct number and topic
BLOCK: 84
CATEGORY: Section headings
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page and scroll to §10.
2. Verify number "10" and topic "STR vs LTR".

PASS: "10" and "STR vs LTR" are visible in the SectionHead.
FAIL: Number or topic is incorrect or missing.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: §11 Due diligence — SectionHead has correct number and topic
BLOCK: 85
CATEGORY: Section headings
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page and scroll to §11.
2. Verify number "11" and topic "Due diligence".

PASS: "11" and "Due diligence" are visible in the SectionHead. The section contains checkboxes and a completion counter.
FAIL: Number or topic is incorrect or missing.
─────────────────────────────────────────

---

## Layout (4 tests)

─────────────────────────────────────────
TEST: Report page uses full-width container with max-width constraint
BLOCK: 86
CATEGORY: Layout
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data in a 1440px wide browser window.
2. Inspect the main `.container` wrapper element in DevTools.
3. Check its `max-width` and `margin` values.

PASS: The container has a max-width between 1100px and 1400px. Horizontal margins are auto-centred (`margin: 0 auto`). Content does not bleed to the window edges; padding of at least 16px on each side is present.
FAIL: The container has no max-width (stretches to full window width on wide displays), or content is flush against the window edge with no padding.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Footer renders all navigation sections and product links
BLOCK: 87
CATEGORY: Layout
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to the bottom of the page to the Footer.
3. Verify the presence of Resources and Product nav sections.

PASS: The Footer contains at minimum: a "Resources" nav group with links including "OSFI stress test", and a "Product" nav group with links including "SunScout". The PropScout wordmark or logo is present in the footer. Legal links (Privacy, Terms) are present.
FAIL: The Footer is absent, or key nav links are missing, or the wordmark is not displayed.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Nav bar renders at top with correct report variant (shows "Investor report" label)
BLOCK: 88
CATEGORY: Layout
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Observe the top navigation bar.
3. Look for an "Investor report" label or badge in the Nav.

PASS: The Nav is visible at the top of the page. It shows the PropScout wordmark on the left. An "Investor report" label, badge, or breadcrumb is displayed, confirming the report variant. The dark mode toggle button (moon/sun icon) is visible in the Nav.
FAIL: The Nav is absent, shows the landing-page variant without a report label, or the dark mode toggle is not present.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: All 11 sections are separated by consistent vertical spacing
BLOCK: 89
CATEGORY: Layout
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll through the full report observing the spacing between sections.
3. Inspect the margin-bottom or padding-bottom on any `.tr-section` container element in DevTools.

PASS: Each section (`<section class="container tr-section">`) has consistent vertical separation (at least 48px gap between the end of one section and the SectionHead of the next). No sections appear crammed together without breathing room.
FAIL: Sections are adjacent with no visible margin (zero spacing between them), or spacing is inconsistent (some sections have large gaps, others none).
─────────────────────────────────────────

---

## Accessibility (3 tests)

─────────────────────────────────────────
TEST: Dark mode toggle changes data-theme attribute on html element to "dark"
BLOCK: 90
CATEGORY: Accessibility
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. In DevTools → Elements, observe the `<html>` element's attributes (no `data-theme` in light mode).
3. Click the dark mode toggle button in the Nav (moon icon or sun icon).
4. Re-inspect the `<html>` element.

PASS: After clicking the toggle, the `<html>` element gains `data-theme="dark"`. The page background colour changes to the dark-mode `--bg` value (near-black). All text remains readable. Clicking again removes the attribute (returns to light mode).
FAIL: The `<html>` element does not receive `data-theme="dark"` after clicking, or the visual appearance does not change, or toggle uses `class="dark"` instead of the attribute.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: All interactive elements are reachable via keyboard Tab navigation
BLOCK: 91
CATEGORY: Accessibility
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Click anywhere on the page to ensure focus is in the document.
3. Press Tab repeatedly to navigate through all interactive elements.
4. Observe whether each focused element has a visible focus ring.

PASS: All buttons, sliders, checkboxes, and links are reachable via Tab. Each receives a visible focus indicator (outline, ring, or highlight) when focused. No interactive element is skipped entirely or unreachable by keyboard. Focus order follows visual top-to-bottom, left-to-right reading order.
FAIL: Some buttons or checkboxes cannot be reached via Tab, or focused elements show no visible focus indicator (focus ring is invisible), or Tab focus jumps erratically.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Due diligence checkboxes are keyboard-operable and update completion counter
BLOCK: 92
CATEGORY: Accessibility
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §11 Due diligence.
3. Tab to the first checkbox.
4. Press Space to check it.
5. Read the completion counter.

PASS: The first checkbox becomes checked after pressing Space. The completion counter updates from "0 / 16 complete" to "1 / 16 complete". The checkbox change is visible without a mouse click.
FAIL: Pressing Space on the focused checkbox has no effect, or the counter does not update, or the checkbox does not have a focusable keyboard role.
─────────────────────────────────────────

---

## Mobile layout 380px (5 tests)

─────────────────────────────────────────
TEST: Report renders without horizontal scrollbar at 380px viewport width
BLOCK: 93
CATEGORY: Mobile layout 380px
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. In DevTools → Device toolbar, set the viewport to 380px × 844px.
3. Scroll through the full report.
4. Observe whether any horizontal overflow or scrollbar appears.

PASS: No horizontal scrollbar appears at any point while scrolling vertically through the report. All content fits within the 380px viewport width. No element extends beyond the viewport edge.
FAIL: A horizontal scrollbar is present at 380px width, or swiping left/right reveals hidden overflowing content.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Multi-column metric grids collapse to a single column at 380px
BLOCK: 94
CATEGORY: Mobile layout 380px
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page at 380px viewport width.
2. Scroll to §01 Investment metrics.
3. Inspect the metric tile grid layout in DevTools.

PASS: The metric tiles that form a 3-column grid on desktop collapse to a 1-column or 2-column layout at 380px. No tile is compressed narrower than 140px. Tile content (label, value, sub-label) remains fully readable.
FAIL: The 3-column desktop grid layout is retained at 380px, causing tiles to be too narrow to read their content.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Financing sliders are usable at 380px — thumb is large enough to tap
BLOCK: 95
CATEGORY: Mobile layout 380px
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page at 380px viewport width.
2. Scroll to §02 Financing scenarios.
3. Inspect the slider thumb elements.

PASS: Each slider thumb has a touch target of at least 44×44px (WCAG 2.5.5 minimum). At 380px the sliders are not compressed so narrowly that the track becomes too short to use. Values are readable at mobile text size.
FAIL: Slider thumbs have a touch target below 20×20px, the track is collapsed to under 60px wide, or the displayed values are too small to read at 380px.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: PropertyHero photo grid and chips are readable at 380px
BLOCK: 96
CATEGORY: Mobile layout 380px
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page at 380px viewport width.
2. Scroll to the PropertyHero section.
3. Verify the property address, chips, and price are all readable.

PASS: The property address "Unit 5702 · 5 Buttermill Avenue" is fully visible (no truncation mid-text). Property chips (beds, baths, type) are readable and not overflowing their containers. The listing price "$729,900" is visible. Any photo grid collapses gracefully (single column or stacked layout).
FAIL: The address is truncated mid-word, chips overflow their row causing layout breakage, or the price is invisible at mobile size.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: Section headings and SectionHead questions are readable at 380px without truncation
BLOCK: 97
CATEGORY: Mobile layout 380px
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page at 380px viewport width.
2. Scroll through all 11 SectionHead components.
3. Verify that section numbers, topics, and question text are fully readable.

PASS: All SectionHead topic strings (e.g., "Investment metrics", "Financing scenarios") are fully visible and not truncated or hidden. The italic question below each heading wraps onto multiple lines gracefully rather than overflowing. Font sizes are legible (minimum 14px rendered).
FAIL: Section topic text is clipped or replaced with ellipsis (…), or question text overflows beyond the container at 380px width.
─────────────────────────────────────────

---

## E2E flow (14 tests)

─────────────────────────────────────────
TEST: E2E — Full report loads all 11 sections without JavaScript errors
BLOCK: 98
CATEGORY: E2E flow
─────────────────────────────────────────
Steps:

1. Open Chrome DevTools → Console panel.
2. Clear the console.
3. Navigate to the InvestorReport page with Vaughan demo data.
4. Wait for all sections to fully render.
5. Scroll slowly from top to bottom through all 11 sections.
6. Check the console for any errors.

PASS: All 11 section headings are visible (§01 through §11). No red errors appear in the console. No "Cannot read properties of undefined" or similar JavaScript exceptions are thrown during load or scroll.
FAIL: Any section is missing from the rendered page, or one or more JavaScript errors appear in the console during load or scroll.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: E2E — Loading state renders while analysis is in progress
BLOCK: 99
CATEGORY: E2E flow
─────────────────────────────────────────
Steps:

1. Simulate the loading state by using browser network throttling (DevTools → Network → Slow 3G) before navigating to the page.
2. Navigate to the InvestorReport page.
3. Observe the UI before the data resolves.

PASS: While loading, the page shows a loading state with "Running analysis" heading and "Calculating investment metrics…" sub-text. The PropertyHero section and all 11 report sections are NOT rendered during the loading state. A spinner or progress animation is visible.
FAIL: The report renders section content before data is available (showing blank/null values), or the loading state shows section headings that should only appear after data loads.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: E2E — Error state renders when analysis fails
BLOCK: 100
CATEGORY: E2E flow
─────────────────────────────────────────
Steps:

1. Simulate an error state by blocking the analysis API endpoint in DevTools → Network → Block request URL.
2. Navigate to the InvestorReport page.
3. Wait for the error state to appear.

PASS: The page shows an "Analysis failed" heading, an error message, and a "Try again" button. No report sections (§01–§11) are rendered in the error state. The "Try again" button is clickable (role="button").
FAIL: The error state shows partial report content, or no error UI appears (blank page instead), or the "Try again" button is absent.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: E2E — Clicking "Try again" clears the error and re-initiates loading
BLOCK: 101
CATEGORY: E2E flow
─────────────────────────────────────────
Steps:

1. Trigger the error state (see Block 100 steps 1–3).
2. Remove the network block.
3. Click the "Try again" button.
4. Observe the page transition.

PASS: After clicking "Try again", the page transitions back to the loading state (showing "Running analysis" loading UI). The error heading and message disappear. If the network block is removed, the report eventually loads successfully.
FAIL: Clicking "Try again" has no visible effect, the error state persists, or clicking causes a full page reload to the home screen.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: E2E — Dark mode toggle persists across section scrolling
BLOCK: 102
CATEGORY: E2E flow
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Click the dark mode toggle in the Nav.
3. Verify `data-theme="dark"` is set on `<html>`.
4. Scroll through all 11 sections while in dark mode.
5. Verify the theme is maintained throughout.

PASS: The dark theme is applied and maintained while scrolling. No section reverts to light mode. All text remains readable against dark backgrounds. The Nav at the top remains visible in dark mode styling.
FAIL: The dark theme is applied initially but disappears partway through scrolling, or specific sections render with light backgrounds while others are dark.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: E2E — Due diligence checklist tracks completion from 0/16 to 16/16
BLOCK: 103
CATEGORY: E2E flow
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §11 Due diligence.
3. Verify "0 / 16 complete" is displayed.
4. Click all 16 checkboxes one by one.
5. After each click, observe the counter.

PASS: The counter increments by 1 with each checkbox click (0/16 → 1/16 → 2/16 → … → 16/16). After all 16 are checked, the counter reads "16 / 16 complete". No JavaScript errors occur during any click.
FAIL: The counter does not update after clicks, final counter does not reach 16/16, or any checkbox click throws a console error.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: E2E — Unchecking a due diligence item decrements the counter
BLOCK: 104
CATEGORY: E2E flow
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Scroll to §11 Due diligence.
3. Click the first checkbox to check it (counter: 1/16).
4. Click the same checkbox again to uncheck it.
5. Read the counter.

PASS: Counter decrements from "1 / 16 complete" back to "0 / 16 complete" after unchecking. The checkbox visually shows its unchecked state. Toggle behaviour (check → uncheck → check) works correctly.
FAIL: Unchecking a checkbox does not decrement the counter, or the checkbox becomes stuck in a checked state after the second click.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: E2E — OSFI preset and Base preset round-trip restores all slider defaults
BLOCK: 105
CATEGORY: E2E flow
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Note default slider values (20% DP, 4.79% rate, 25yr amort).
3. Manually drag all three sliders to different values.
4. Click the OSFI preset.
5. Click the Base preset.
6. Read all three slider values.

PASS: After clicking Base, all three sliders return to their exact defaults: down payment = 20%, mortgage rate = 4.79%, amortization = 25 years. All metric tiles in §01 update to show the original Vaughan calibration values (cap rate ~1.47%, cash flow ~−$2,431/mo).
FAIL: After clicking Base, any slider retains a non-default value, or metric tiles do not revert to calibration values.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: E2E — Financing slider change propagates to PropertyHero sticky card
BLOCK: 106
CATEGORY: E2E flow
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Note the cap rate in the PropertyHero sticky card (1.47%).
3. Scroll to §02 and change the down payment to 5% (minimum).
4. Scroll up to observe the PropertyHero sticky card.

PASS: After reducing DP to 5%, the cap rate in the PropertyHero sticky card updates (the property value and income haven't changed so cap rate itself stays ~1.47%, but monthly cash flow and DSCR values in the sticky card update to reflect the higher mortgage at 5% DP). At least one metric in the sticky card changes.
FAIL: The PropertyHero sticky card shows static values that do not update when financing parameters change.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: E2E — No emoji characters appear anywhere on the rendered page
BLOCK: 107
CATEGORY: E2E flow
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. In Chrome DevTools → Console, run:  
   `document.body.innerText.match(/\p{Emoji_Presentation}/gu)`
3. Inspect the result.

PASS: The regex returns `null` (no matches) — no emoji characters are present anywhere in the rendered page text. All icons use SVG line icons from the `<Icon>` component, not emoji glyphs.
FAIL: The regex returns an array of matches, indicating one or more emoji characters are present in the rendered UI (violates PropScout's absolute UI rule: "No emoji anywhere in the UI. Ever.").
─────────────────────────────────────────

─────────────────────────────────────────
TEST: E2E — All section headings use Instrument Serif font for the question text
BLOCK: 108
CATEGORY: E2E flow
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. In DevTools → Elements, click on the question text within any SectionHead (e.g., "Does the deal pencil?").
3. Check the computed font-family in DevTools → Computed.
4. Repeat for at least 3 different SectionHead question elements.

PASS: The section question text resolves to `Instrument Serif` as the computed font-family (or shows as the serif fallback from the design system). The italic variant is applied to the key noun in each question.
FAIL: The computed font-family is `Geist` (sans-serif body font) or system default for the question text — indicating the serif font is not being applied to the section question.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: E2E — All dollar values and percentages use Geist Mono font
BLOCK: 109
CATEGORY: E2E flow
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. In DevTools → Elements, click on a metric tile value like "1.47%" or "−$2,431".
3. Check the computed font-family.
4. Repeat for the mortgage payment "$3,327/mo" and cap rate "1.47%".

PASS: All metric values (dollar amounts, percentages, scores) compute to `Geist Mono` or `Geist Mono, monospace` as their font-family. The mono font causes consistent column alignment for tabular data.
FAIL: Metric values render in `Geist` (proportional sans-serif) or `Instrument Serif` instead of `Geist Mono`.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: E2E — Hover over any interactive button changes border/colour to --accent (terracotta)
BLOCK: 110
CATEGORY: E2E flow
─────────────────────────────────────────
Steps:

1. Open the InvestorReport page with Vaughan demo data.
2. Locate the "Base" or "OSFI" preset button in §02.
3. Hover the mouse cursor over the button.
4. Observe the colour transition.
5. Also hover over the "Try again" button outline (if accessible from a re-triggered error state) or the "Notify me when STR ships" ghost button.

PASS: On hover, the button's border colour and/or text colour transitions to `--accent` (terracotta, approximately #D97757). The transition duration is approximately 0.15s (perceptibly fast but not instantaneous). The colour returns to its default state when the cursor leaves.
FAIL: No colour change occurs on hover, the transition uses a colour other than `--accent`, or the transition takes longer than 0.5s.
─────────────────────────────────────────

─────────────────────────────────────────
TEST: E2E — Complete user journey: page loads, sliders adjusted, sections reviewed, checklist started
BLOCK: 111
CATEGORY: E2E flow
─────────────────────────────────────────
Steps:

1. Open a fresh Chrome window (no cache) and navigate to the InvestorReport page with Vaughan demo data.
2. Wait for the full report to load (all 11 sections visible).
3. Scroll to §02 and change the down payment slider to 25%.
4. Observe §01 metrics update (cash flow becomes less negative, mortgage payment decreases).
5. Click the OSFI preset and observe rate change to 6.79% and §05 qualifying rate update.
6. Click Base preset to restore defaults.
7. Scroll to §06 and read both risk flag rows ("Condo-fee burden" and "Deeply negative cash flow").
8. Scroll to §11 and check 4 of the 16 due diligence items.
9. Verify counter reads "4 / 16 complete".
10. Toggle dark mode.
11. Verify page appearance in dark mode.
12. Open DevTools Console and verify no errors were thrown throughout all steps.

PASS: All 11 steps complete without error. Metrics update when sliders change. OSFI preset works. Risk flags are present. Due diligence counter reaches 4/16. Dark mode toggle works. Console shows zero errors throughout the full interaction session.
FAIL: Any step fails — a section is missing, a metric doesn't update, a preset button has no effect, the checklist counter is wrong, dark mode doesn't apply, or any JavaScript error appears in the console.
─────────────────────────────────────────

---

## Test count verification

| Category                 | Tests   | Blocks    |
| ------------------------ | ------- | --------- |
| DealScore                | 6       | 1–6       |
| Metric                   | 4       | 7–10      |
| RentalCompsBar           | 6       | 11–16     |
| AIVerdictBlock           | 3       | 17–19     |
| RiskRow                  | 3       | 20–22     |
| MiniMap                  | 2       | 23–24     |
| PropertyHero             | 6       | 25–30     |
| FinancingSliders         | 9       | 31–39     |
| Slider recalculation     | 7       | 40–46     |
| OSFICard                 | 4       | 47–50     |
| LTTTable                 | 3       | 51–53     |
| EquityChart              | 6       | 54–59     |
| InvestmentMetricsSection | 7       | 60–66     |
| NeighbourhoodSection     | 5       | 67–71     |
| STRPlaceholderSection    | 3       | 72–74     |
| Section headings         | 11      | 75–85     |
| Layout                   | 4       | 86–89     |
| Accessibility            | 3       | 90–92     |
| Mobile layout 380px      | 5       | 93–97     |
| E2E flow                 | 14      | 98–111    |
| **Total**                | **111** | **1–111** |
