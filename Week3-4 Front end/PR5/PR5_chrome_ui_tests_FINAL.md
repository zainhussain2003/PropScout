# PR5 Chrome UI Test Checklist

## Tenant Report — Manual Browser Tests

**Date:** 2026-05-28
**Browser:** Chrome (latest stable)
**Dev server:** `npm run dev --workspace=apps/web` → `http://localhost:5173/tenant-report`
**Pre-test:** DevTools → Application → Clear Storage → Hard reload (Ctrl+Shift+R)

> ⚠ **Port dependency:** All TCs require the Vite dev server running on **port 5173**.
> If another process occupies 5173, Vite will step to 5174 and all URLs must be updated.
> See [TC-PR5-001](#) for the startup check.

---

## 1 · Page Load & Navigation

[ ] TC-PR5-001 Start dev server and open http://localhost:5173/tenant-report in Chrome (latest)
Expected: Page loads within 3 s; DevTools Console shows zero red errors;
no 404 for fonts, CSS, or JS chunks
| PASS | FAIL | NOTES |

[ ] TC-PR5-002 Inspect the <html> element in DevTools (Elements panel)
Expected: No data-theme attribute (light mode default); background of <body>
is the warm cream token value #F1ECE2
| PASS | FAIL | NOTES |

[ ] TC-PR5-003 Open DevTools → Network, reload; filter by "Font"
Expected: Instrument Serif, Geist, and Geist Mono are all loaded from
Google Fonts — no font 404s
| PASS | FAIL | NOTES |

[ ] TC-PR5-004 Scroll the full page top-to-bottom in one pass
Expected: No layout shifts; no broken image gaps beyond the expected
photo-placeholder tiles; Footer renders at the very bottom
| PASS | FAIL | NOTES |

[ ] TC-PR5-005 Inspect any visible inline style (right-click → Inspect on any card)
Expected: All colour values reference CSS variables (var(--...)); no raw
hex or rgba literals visible in the inline style attribute
| PASS | FAIL | NOTES |

---

## 2 · ReportNav — Sticky Bar, Breadcrumb, Theme Toggle, Sign-in

[ ] TC-PR5-006 Observe the Nav bar at the top of the page before scrolling
Expected: PropScout wordmark on the left — "Prop" in Geist regular weight,
"Scout" in Instrument Serif italic; no text misalignment
| PASS | FAIL | NOTES |

[ ] TC-PR5-007 Read the breadcrumb label in the Nav bar
Expected: The label "Tenant report" (exact capitalisation) is visible between
the wordmark and the address slug
| PASS | FAIL | NOTES |

[ ] TC-PR5-008 Read the address slug text / link in the Nav bar
Expected: The slug "3705-charles-st-e" is visible; clicking it either copies
the share link to clipboard or navigates to the report URL
| PASS | FAIL | NOTES |

[ ] TC-PR5-009 Scroll down past the hero section (~600px), then look at the Nav bar
Expected: Nav bar remains visible and fixed at the top (sticky); it does not
scroll away with the page content
| PASS | FAIL | NOTES |

[ ] TC-PR5-010 Locate the "Save to account" button in the Nav bar area
Expected: Button is present; clicking it does not throw a JS error
(MVP stub — no auth required yet)
| PASS | FAIL | NOTES |

[ ] TC-PR5-011 Locate the theme toggle button (sun / moon icon) in the Nav bar
Expected: Button renders with an SVG icon (not an emoji); no text label needed;
aria-label reads "Toggle dark mode" (verify in DevTools Accessibility)
| PASS | FAIL | NOTES |

[ ] TC-PR5-012 Click the theme toggle button once
Expected: The <html> element gains data-theme="dark"; the page background
shifts to the dark token value; the Nav bar re-renders in dark palette
| PASS | FAIL | NOTES |

[ ] TC-PR5-013 Click the theme toggle button a second time (while in dark mode)
Expected: data-theme switches back to "light" (or is removed); background
returns to warm cream; no visual flash or reflow artefacts
| PASS | FAIL | NOTES |

[ ] TC-PR5-014 Locate the "Sign in" action in the Nav; click it
Expected: Sign-in modal bottom-sheet slides up; backdrop dims the page;
modal is dismissible via the close button or clicking the backdrop
| PASS | FAIL | NOTES |

---

## 3 · Section §01 — Property Header

[ ] TC-PR5-015 Read the h1 heading in the hero area
Expected: "Unit 3705 · 28 Charles Street East" is displayed in
Instrument Serif; text is not clipped or wrapped awkwardly
| PASS | FAIL | NOTES |

[ ] TC-PR5-016 Read the subtitle / address line below the h1
Expected: "Toronto · M4Y · Bay Corridor" is visible in a muted colour
| PASS | FAIL | NOTES |

[ ] TC-PR5-017 Count the chip tags in the chips row beneath the address
Expected: Exactly 5 chips: "For rent", "Available March 1",
"Pet-friendly", "12-mo lease", "Furnished optional"
| PASS | FAIL | NOTES |

[ ] TC-PR5-018 Inspect the photo grid (left side of hero)
Expected: One large hero tile (2fr) and three stacked thumbnails (1fr) render;
tiles show labelled placeholder text (unit · skyline view / living /
kitchen / bedroom) instead of broken <img> tags; the "+ 18 more"
badge appears on the bottom thumbnail
| PASS | FAIL | NOTES |

[ ] TC-PR5-019 Read the quick-facts row (beds / baths / sqft / floor)
Expected: "1+den · 1 bath · 620 sqft · 37th floor" visible with Icon glyphs;
no raw text without icons
| PASS | FAIL | NOTES |

[ ] TC-PR5-020 Locate the score card on the right side of the hero
Expected: A sticky card (stays in viewport as you scroll the hero area);
contains the circular DealScore gauge showing 58 in amber/caution ring
| PASS | FAIL | NOTES |

[ ] TC-PR5-021 Read the verdict label below the score gauge
Expected: "Negotiate first" in mono uppercase in the caution/amber token colour;
below it, "Priced above market and listing may misrepresent the unit."
| PASS | FAIL | NOTES |

[ ] TC-PR5-022 Read the asking / target section of the score card
Expected: "Asking" label with "$2,150/mo"; a highlighted target band
"Your target · $1,950–$2,000" in sage/pass token colour
| PASS | FAIL | NOTES |

[ ] TC-PR5-023 Click the "Save to account" primary button in the score card
Expected: Button is present, full-width, terracotta background; click does not
throw a console error; "Share" and "PDF" ghost buttons are also visible
| PASS | FAIL | NOTES |

---

## 4 · Section §02 — Listed vs Reality

[ ] TC-PR5-024 Confirm the section is visible on this page load (mismatches exist in demo data)
Expected: The §03 data-section block with heading "Listed vs Reality" is present;
it is not hidden (demo data has 3 bad-tone reality items)
| PASS | FAIL | NOTES |

[ ] TC-PR5-025 Read the two card headers
Expected: Left card shows "How it's listed" (mono eyebrow) + "Marketing copy"
(serif); right card shows "What you'll actually get" (mono eyebrow, fail/
clay colour) + "After our analysis" (serif)
| PASS | FAIL | NOTES |

[ ] TC-PR5-026 Read the listed (left) column items
Expected: 7 bullet items visible; includes "2 bedrooms + study",
"2 full bathrooms", "9ft ceilings throughout",
"Expansive windows, filled with natural light",
"105 sqft balcony, unobstructed views", "Ensuite laundry",
"Parking — contact manager"
| PASS | FAIL | NOTES |

[ ] TC-PR5-027 Read the reality (right) column: bad-tone rows
Expected: 3 rows styled in clay/fail colour with ✗ prefix:
"1 proper bedroom + 1 glass-door den",
"Floor-to-ceiling windows in living — den likely has none",
"No parking confirmed — clarify urgently"
| PASS | FAIL | NOTES |

[ ] TC-PR5-028 Read the reality (right) column: ok-tone rows
Expected: 4 rows styled in default ink colour with ✓ prefix (sage):
"2 full bathrooms", "9ft ceilings in main living area",
"105 sqft balcony — legitimate", "Ensuite laundry confirmed"
| PASS | FAIL | NOTES |

[ ] TC-PR5-029 Read the SectionHead verdict in the §03 header
Expected: "3 mismatches" is visible in the verdict area of the section head
| PASS | FAIL | NOTES |

[ ] TC-PR5-030 Hidden-when-zero test (requires temporary data modification — mark BLOCKED if
unable to test without code change)
Expected: If all reality items had tone="ok", the entire §03 block would
disappear from the DOM (returns null). Confirm via unit test
TC-PR5-030 is covered by the automated test suite instead.
| PASS | FAIL | NOTES |

---

## 5 · Section §03 — Listing Accuracy Flags / FlagDeepRow

[ ] TC-PR5-031 Count the FlagDeepRow cards in the §02 data-section block
Expected: Exactly 3 flag cards rendered; visual left-border colours are:
clay/fail (red flag), amber/caution (amber flag), sage/pass (good flag)
| PASS | FAIL | NOTES |

[ ] TC-PR5-032 Read the red flag label and inspect its left border colour
Expected: Label: "The 'second bedroom' is likely a den"; 3px left border
in var(--fail) clay red; circular icon shows "!" glyph
| PASS | FAIL | NOTES |

[ ] TC-PR5-033 Read the amber flag label and inspect its left border colour
Expected: Label: "Parking status unclear"; left border in var(--caution) amber;
circular icon shows "?" glyph in amber
| PASS | FAIL | NOTES |

[ ] TC-PR5-034 Read the good flag label and inspect its left border colour
Expected: Label: "Utilities are clear"; left border in var(--pass) sage;
circular icon shows "✓" glyph in sage
| PASS | FAIL | NOTES |

[ ] TC-PR5-035 Click the red flag card header to expand it
Expected: Expanded panel slides/renders beneath the header; "Evidence from listing"
eyebrow appears; the evidence quote is displayed in italic Instrument Serif
with a left accent border: '"Bright open-concept living with a sleek
sliding glass den/2nd bedroom..."'
| PASS | FAIL | NOTES |

[ ] TC-PR5-036 With the red flag expanded, check the "Ask before signing" box
Expected: A terracotta-bordered callout box appears below the evidence quote;
it begins with "Ask before signing" in mono uppercase (terracotta);
body text: "Ask the landlord to confirm in writing whether the room
has a window and a solid door."
| PASS | FAIL | NOTES |

[ ] TC-PR5-037 Click the red flag header again (while expanded)
Expected: The expanded panel collapses; evidence quote and callout box are
hidden; the card returns to its compact height
| PASS | FAIL | NOTES |

[ ] TC-PR5-038 Expand the good flag card (Utilities)
Expected: Evidence quote visible: '"All utilities except hydro included.
Tenant pays internet."'; NO "Ask before signing" callout box rendered
(good-tone flags have no ask prop)
| PASS | FAIL | NOTES |

---

## 6 · Section §04 — Full Unit Breakdown

[ ] TC-PR5-039 Scroll to the §11 data-section block "Unit & building details"
Expected: Section head shows topic "Unit & building details" with verdict
"24 line items"; a collapse/expand button is visible
| PASS | FAIL | NOTES |

[ ] TC-PR5-040 Observe the section in its default (collapsed) state
Expected: The "Show all unit and building specs" button is shown; the
spec rows beneath it are NOT visible; plus icon in button
| PASS | FAIL | NOTES |

[ ] TC-PR5-041 Click the expand button to open the spec sheet
Expected: Two columns appear — "The unit" (left) and "The building" (right);
columns are separated by a vertical divider line; minus icon replaces plus
| PASS | FAIL | NOTES |

[ ] TC-PR5-042 Read selected rows in "The unit" column
Expected: "Floor" → "37th of 55"; "'Bedroom 2' / den" → "Sliding glass door ·
no privacy" in var(--fail) clay; "Bathrooms" → "1 full · ensuite"
in var(--pass) sage; "Balcony" → "105 sqft · unobstructed" in sage
| PASS | FAIL | NOTES |

[ ] TC-PR5-043 Read selected rows in "The building" column
Expected: "Building name" → "Transit City 2"; "Year built" → "2022";
"Pets" → "Allowed · no size limit" in sage;
"Median building rent (1-bed)" → "$2,000/mo"
| PASS | FAIL | NOTES |

[ ] TC-PR5-044 Scroll to the §05 data-section block "Monthly cost"
Expected: Section head topic "Monthly cost", verdict contains "Save $" text;
a three-column table renders with headers "Line item", "At asking",
"At target ↓" (target column in terracotta/accent)
| PASS | FAIL | NOTES |

[ ] TC-PR5-045 Read the cost table data rows and totals row
Expected: Rent row: $2,150 asking / $1,975 target; Hydro: $65 / $65;
Internet: $70 / $70; Heat+water+AC: "— incl." in both columns;
Parking: $150 asking / $0 target; Totals row shows $2,435 asking /
$2,110 target in large serif type
| PASS | FAIL | NOTES |

---

## 7 · Section §05 — Rental Comps

[ ] TC-PR5-046 Scroll to the §01 data-section block "Rent positioning"
Expected: Section head topic "Rent positioning", verdict "Is the rent fair?",
tone caution; SectionHead verdict label "§150 above market"
| PASS | FAIL | NOTES |

[ ] TC-PR5-047 Inspect the RentalCompsBar chart card
Expected: A horizontal bar with Low ($1,800), Mid ($1,950), High ($2,300)
position labels; an "Asking" marker visually positioned at $2,150
(to the right of Mid)
| PASS | FAIL | NOTES |

[ ] TC-PR5-048 Read the narrative paragraph beside the bar
Expected: Contains "$1,900–2,100" and "$2,300" as inline tabular numbers;
mentions "§02" in the text body
| PASS | FAIL | NOTES |

[ ] TC-PR5-049 Count and read the four Metric tiles
Expected: "Asking" $2,150 (caution status); "Market median" $1,950;
"Building median" $2,000; "Negotiation gap" $150–200 (pass status)
| PASS | FAIL | NOTES |

[ ] TC-PR5-050 Hover over the RentalCompsBar asking marker
Expected: A tooltip or label appears (or the marker highlights); no hover
state breaks the layout or triggers a console error
| PASS | FAIL | NOTES |

---

## 8 · Section §06 — Amenities / WhatsIncludedSection

[ ] TC-PR5-051 Scroll to the §06 data-section block "What's included"
Expected: Section head visible; a CSS auto-fill grid of amenity cells renders
below (not a simple list)
| PASS | FAIL | NOTES |

[ ] TC-PR5-052 Count the total amenity cells
Expected: 14 cells total: 12 with "incl" status, 1 "extra" (Hydro), 1 "unclear"
(Parking)
| PASS | FAIL | NOTES |

[ ] TC-PR5-053 Verify glyph colours for the three status types
Expected: incl cells: ✓ glyph in sage/pass; extra cell (Hydro): $ glyph in
amber/caution; unclear cell (Parking): ? glyph in clay/fail
| PASS | FAIL | NOTES |

[ ] TC-PR5-054 Read the "extra" amenity note for Hydro
Expected: The Hydro cell shows "~$80–110/mo" as a sub-note below the label
| PASS | FAIL | NOTES |

[ ] TC-PR5-055 Read the "unclear" amenity note for Parking
Expected: The Parking cell shows "confirm with landlord" as a sub-note
| PASS | FAIL | NOTES |

[ ] TC-PR5-056 Inspect the legend below the grid
Expected: Three legend items with coloured dot swatches:
sage dot "Included", amber dot "Extra cost", clay dot "Unclear"
| PASS | FAIL | NOTES |

[ ] TC-PR5-057 Read the summary count line
Expected: A line reading "12 of 14 items confirmed included" is visible
below the grid (or in the section head verdict)
| PASS | FAIL | NOTES |

---

## 9 · Section §07 — Location & Commute

[ ] TC-PR5-058 Scroll to the §07 data-section block "Location & commute"
Expected: Section head topic "Location & commute"; a two-column layout
with mobility scores card (left) and distances card (right)
| PASS | FAIL | NOTES |

[ ] TC-PR5-059 Read the three mobility score rows in the left card
Expected: "Walk Score" 72 in amber; "Transit Score" 85 in sage;
"Bike Score" 58 in amber; each has a subtitle note
| PASS | FAIL | NOTES |

[ ] TC-PR5-060 Inspect the progress bars beneath each mobility score
Expected: Walk Score bar fills ~72% of width; Transit bar ~85%; Bike bar ~58%;
bar colours match token (amber / sage / amber respectively)
| PASS | FAIL | NOTES |

[ ] TC-PR5-061 Count the rows in the distances card (right column)
Expected: Exactly 9 distance rows rendered; first row is
"VMC Subway (Line 1) · 2 min · walk" in sage/pass colour
| PASS | FAIL | NOTES |

[ ] TC-PR5-062 Read the caution-tone distance rows
Expected: At least 3 rows in amber/caution: "Walkable cafés / restaurants — Limited",
"Nearest grocery — 8 min walk", "Active construction nearby — Yes"
| PASS | FAIL | NOTES |

[ ] TC-PR5-063 Read the pass-tone distance rows
Expected: Pass/sage colour on: "VMC Subway (Line 1)", "Downtown Toronto",
"York University", "Hwy 400 / 407", "Vaughan Mills · Costco · IKEA",
"Pearson Airport"
| PASS | FAIL | NOTES |

[ ] TC-PR5-064 Inspect the section head verdict text
Expected: "Excellent transit · limited walk" is visible in the SectionHead
verdict area
| PASS | FAIL | NOTES |

---

## 10 · Section §08 — SunScout

[ ] TC-PR5-065 Scroll to the §09 data-section block "SunScout"
Expected: Section head topic "SunScout", question "How much light will you
actually get?", verdict "Solar path analysis · Phase 2" (caution tone)
| PASS | FAIL | NOTES |

[ ] TC-PR5-066 Inspect the placeholder card content
Expected: "Sun hours analysis" mono eyebrow; "Coming Phase 2" Chip tag in
terracotta; h3 heading about solar path modeling shipping Q3 2026
| PASS | FAIL | NOTES |

[ ] TC-PR5-067 Read the projected score mention in the body text
Expected: Text includes "84/100 (Excellent)" and references "37th floor
south-facing unit"
| PASS | FAIL | NOTES |

[ ] TC-PR5-068 Click the "Notify me when SunScout ships" button
Expected: Button is present with arrow icon (not emoji); click does not throw
a JS error (stub — MVP does not require a real submission)
| PASS | FAIL | NOTES |

---

## 11 · Section §09 — AI Verdict

[ ] TC-PR5-069 Locate the AIVerdictBlock — it renders immediately below the hero section
Expected: Full-bleed dark card visible near the top of the page (before §01);
eyebrow reads "Scout AI · tenant verdict" in mono uppercase
| PASS | FAIL | NOTES |

[ ] TC-PR5-070 Read the verdict headline
Expected: Headline begins "Do not sign at $2,150"; the $2,150 figure is
coloured in terracotta/accent; text continues to describe the
"second bedroom" as a den with a sliding glass door
| PASS | FAIL | NOTES |

[ ] TC-PR5-071 Read the verdict sub-paragraph
Expected: Contains "$1,950–2,000/mo" target in terracotta; mentions
"14 competing rentals", "22 days", and "documented misrepresentation"
| PASS | FAIL | NOTES |

[ ] TC-PR5-072 Check the ScoutMark watermark is not visible (not needed at non-dark-hero position)
Expected: If the AIVerdictBlock uses a dark background, inspect for a faint
ScoutMark glyph watermark at 6–8% opacity per spec; confirm no
logo/watermark leaks into light sections
| PASS | FAIL | NOTES |

[ ] TC-PR5-073 Switch to dark mode (via Nav toggle) and observe the verdict block
Expected: AI Verdict block remains legible; contrast is maintained; no text
disappears against the dark background
| PASS | FAIL | NOTES |

---

## 12 · Section §10 — Negotiation

[ ] TC-PR5-074 Scroll to the §04 data-section block "Negotiation"
Expected: Section head topic "Negotiation", verdict "Strong leverage"
in pass/sage tone; two-column layout: left leverage card,
right suggested message card
| PASS | FAIL | NOTES |

[ ] TC-PR5-075 Read the target rent range in the left leverage card
Expected: "Your target" eyebrow; large serif "$1,950 – $2,000" with "/mo" suffix;
sub-line reads "That's $600–1,200 saved over a 12-month lease."
| PASS | FAIL | NOTES |

[ ] TC-PR5-076 Count the leverage factor rows
Expected: Exactly 5 rows under "Why you have leverage":
"Competing rentals in this building — 14 listings",
"Days on market for this unit — 22 days",
"Price drops since listing — 1 · –$50",
"Documented misrepresentation — Glass-door bedroom (§02)",
"12-month rent trend in this FSA — –1.4%"
| PASS | FAIL | NOTES |

[ ] TC-PR5-077 Read the suggested message card on the right
Expected: "Suggested message" mono eyebrow in terracotta; message text
is displayed in italic Instrument Serif with a terracotta left
border; message begins "Hi — thanks for showing the unit at 28 Charles"
| PASS | FAIL | NOTES |

[ ] TC-PR5-078 Locate and click the "Copy" button in the message card header
Expected: Button contains a paste/copy SVG icon and " Copy" text label;
aria-label is "Copy message to clipboard" before clicking
| PASS | FAIL | NOTES |

[ ] TC-PR5-079 After clicking "Copy", immediately check the button's accessible name
Expected: aria-label (visible in DevTools → Accessibility) changes to
"Message copied to clipboard" within ~100 ms of the click
| PASS | FAIL | NOTES |

[ ] TC-PR5-080 Wait ~2.5 seconds after clicking "Copy"
Expected: aria-label reverts to "Copy message to clipboard";
no visible error; button remains clickable
| PASS | FAIL | NOTES |

[ ] TC-PR5-081 Open a plain text editor and paste (Ctrl+V) after clicking "Copy"
Expected: The full suggested message text is pasted (clipboard write worked);
the pasted text begins "Hi — thanks for showing the unit at 28 Charles"
| PASS | FAIL | NOTES |

[ ] TC-PR5-082 Count the "Why this works" bullet points
Expected: Exactly 4 bullets with check SVG icons (not emoji ✓):
starts with "Names the specific misrepresentation",
ends with "Signals readiness ('we can sign this week')"
| PASS | FAIL | NOTES |

---

## 13 · Section §11 — Schools

[ ] TC-PR5-083 Scroll to the §08 data-section block "Schools nearby"
Expected: Section head topic "Schools nearby"; three columns visible —
"Elementary", "Middle", "High school"
| PASS | FAIL | NOTES |

[ ] TC-PR5-084 Read the section head verdict label
Expected: "3 catchment · 8 total" (3 schools are in-catchment out of 8 total;
the verdict format is "N catchment · N total")
| PASS | FAIL | NOTES |

[ ] TC-PR5-085 Inspect the Jesse Ketchum card in the Elementary column
Expected: "P" board glyph in sage; "In catchment" badge visible (terracotta
outline pill, top-right corner of card); card background tinted accent;
"Above avg" label in sage; distance "0.6 km · 8 min"
| PASS | FAIL | NOTES |

[ ] TC-PR5-086 Inspect St. Michael's Catholic School in the Elementary column
Expected: "C" board glyph in terracotta/accent; NO "In catchment" badge;
"Average" label in muted colour; distance "0.9 km · 11 min"
| PASS | FAIL | NOTES |

[ ] TC-PR5-087 Inspect Lord Lansdowne French Immersion in the Elementary column
Expected: "F" board glyph in amber; NO "In catchment" badge;
"Above avg" label in sage; grades "SK–6"
| PASS | FAIL | NOTES |

[ ] TC-PR5-088 Inspect the Middle column schools
Expected: 2 cards: "Lord Dufferin PS · Gr 7–8" (public, in-catchment) and
"St. Paul Catholic · Gr 7–8" (catholic, not in catchment)
| PASS | FAIL | NOTES |

[ ] TC-PR5-089 Inspect the High school column schools
Expected: 3 cards: "Jarvis Collegiate Institute" (public, in-catchment, Above avg),
"St. Michael's Choir School" (catholic, not in catchment, Above avg),
"Étienne-Brûlé Secondary" (french, not in catchment, "32 min · TTC")
| PASS | FAIL | NOTES |

[ ] TC-PR5-090 Read the source note below the school grid
Expected: Paragraph mentions EQAO and Fraser Institute as quality sources;
"Highlighted = this address sits inside the school's attendance boundary"
| PASS | FAIL | NOTES |

---

## 14 · Section §12 — Confirm-Before-Signing Checklist + Conversion Prompt

[ ] TC-PR5-091 Scroll to the §12 data-section block "Before you sign"
Expected: Section head topic "Before you sign", question "Get these in writing.",
verdict "6 items · 3 critical" in caution tone
| PASS | FAIL | NOTES |

[ ] TC-PR5-092 Read the counter in its default unchecked state
Expected: "0 / 6 complete" is visible above the checklist items
| PASS | FAIL | NOTES |

[ ] TC-PR5-093 Count the checklist items and identify critical ones
Expected: 6 checkbox rows total; 3 of them show a "Critical" pill badge
(terracotta outlined pill): "Does the second room have an exterior
window?", "Is parking included or extra ($/mo)?",
"Lease term — 12 months or month-to-month after?"
| PASS | FAIL | NOTES |

[ ] TC-PR5-094 Click one checklist item to check it
Expected: Checkbox toggles checked; counter increments to "1 / 6 complete";
checked item's text gets line-through decoration and reduced opacity
| PASS | FAIL | NOTES |

[ ] TC-PR5-095 Click the same item again to uncheck it
Expected: Counter returns to "0 / 6 complete"; line-through is removed;
item text returns to full opacity
| PASS | FAIL | NOTES |

[ ] TC-PR5-096 Check all 6 items in sequence
Expected: Counter reads "6 / 6 complete"; all items show line-through text
| PASS | FAIL | NOTES |

[ ] TC-PR5-097 Locate and inspect the Conversion Block section below §12
Expected: Two cards side by side — left: "Wondering if you should buy instead
of rent?" (light card); right: "Get notified if this rent drops."
(dark card with var(--ink) background)
| PASS | FAIL | NOTES |

[ ] TC-PR5-098 Read the dark rent-drop card and test the email form
Expected: Email input field present; placeholder "you@example.com";
"Notify me" button in terracotta (btn-accent); submitting the form
does not throw a console error (preventDefault stub)
| PASS | FAIL | NOTES |

---

## 15 · Design Token Compliance

[ ] TC-PR5-099 Pick 5 different components (a card, a button, a section background, a chip,
a flag border) and inspect inline styles in DevTools
Expected: Every colour value uses var(--...) tokens; no raw hex, rgb(), or
rgba() literals visible in any inline style attribute
| PASS | FAIL | NOTES |

[ ] TC-PR5-100 Hover over any card that has a hover state
Expected: Border or background transitions to var(--accent) terracotta within
0.15s ease; no instant jumps or flicker
| PASS | FAIL | NOTES |

[ ] TC-PR5-101 Inspect a flag card's left border colour (red flag)
Expected: Left border is exactly 3px solid; DevTools computed colour matches
var(--fail) value; not a margin, padding, or outline hack
| PASS | FAIL | NOTES |

[ ] TC-PR5-102 Verify no emoji characters anywhere on the page
Expected: Ctrl+F in Chrome → search "🏠" or "✅" or any emoji;
zero results; all icons are SVG from the <Icon> component
| PASS | FAIL | NOTES |

[ ] TC-PR5-103 Toggle dark mode and check that the Tenant report title bar, cards, and
section backgrounds all respond to the theme change
Expected: All tokens resolve to their dark-mode values via the data-theme="dark"
attribute on <html>; no component retains hardcoded light colours
| PASS | FAIL | NOTES |

---

## 16 · Mobile — 375px Layout

[ ] TC-PR5-104 Open DevTools → Device Toolbar (Ctrl+Shift+M); set viewport to 375 × 812
Expected: Page is responsive at 375px; no horizontal scrollbar; all sections
are visible within the viewport width
| PASS | FAIL | NOTES |

[ ] TC-PR5-105 Inspect the Property Hero at 375px
Expected: Two-column hero (photo grid + score card) collapses to a single
column; score card stacks below the photo grid; no content overflow
| PASS | FAIL | NOTES |

[ ] TC-PR5-106 Inspect the §02 Listed vs Reality cards at 375px
Expected: Side-by-side "How it's listed" / "What you'll actually get" cards
stack vertically into a single column; both cards are full-width
| PASS | FAIL | NOTES |

[ ] TC-PR5-107 Inspect the §04 Negotiation layout at 375px
Expected: Leverage card and suggested message card stack into a single column;
the "Copy" button remains accessible and visible
| PASS | FAIL | NOTES |

[ ] TC-PR5-108 Inspect the §07 Location & Commute layout at 375px
Expected: Mobility scores card and distances card stack into a single column;
no text is clipped
| PASS | FAIL | NOTES |

[ ] TC-PR5-109 Inspect the §11 Schools grid at 375px
Expected: Three-column school grid (Elementary / Middle / High) collapses to
a single column; each school card is full-width and readable
| PASS | FAIL | NOTES |

[ ] TC-PR5-110 Scroll the full page at 375px
Expected: FlagDeepRow cards, checklist items, and cost table all remain
readable; no text overflow, no element extends beyond the viewport;
Footer renders correctly at the bottom
| PASS | FAIL | NOTES |

---

## Results Summary

| Total | Pass | Fail | Blocked | Tester | Date |
| ----- | ---- | ---- | ------- | ------ | ---- |
| 110   |      |      |         |        |      |

---

_Checklist version: PR5-FINAL · Branch: feat/pr4-investor-report · Last updated: 2026-05-28_
