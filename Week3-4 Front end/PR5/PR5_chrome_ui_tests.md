# PR5 — Tenant Report: Chrome UI Test Checklist

Manual browser tests to run at `http://localhost:5173/tenant-report`.  
Mark each test **PASS** or **FAIL**. All must pass before merging to `master`.

---

## Prerequisites

```
npm run dev --workspace=apps/web
```

Open `http://localhost:5173/tenant-report` in Chrome (latest stable).  
Clear cache before each test session: DevTools → Application → Clear Storage.

---

## T1 — Page load & layout

| #     | Test                                                            | Expected                           | Result |
| ----- | --------------------------------------------------------------- | ---------------------------------- | ------ |
| T1-01 | Page loads without console errors                               | No red errors in DevTools Console  |        |
| T1-02 | Background colour is warm cream `#F1ECE2`                       | Body background is not white       |        |
| T1-03 | "Prop*Scout*" wordmark renders in Nav                           | "Scout" is italic Instrument Serif |        |
| T1-04 | Address "Unit 3705 · 28 Charles Street East" appears in hero    | Correct address displayed          |        |
| T1-05 | Score gauge shows 58 in caution (amber) colour                  | Amber ring + "58" visible          |        |
| T1-06 | Verdict label "Negotiate first" shown near gauge                | Correct label                      |        |
| T1-07 | Target range "$1,950 – $2,000/mo" shown in score card           | Correct target range               |        |
| T1-08 | Chips row shows "For rent", "Available March 1", "Pet-friendly" | All 5 chips present                |        |
| T1-09 | Photo grid placeholder tiles render (no broken img tags)        | Grey placeholder tiles show        |        |
| T1-10 | Footer renders at bottom of page                                | Footer visible on scroll-down      |        |

---

## T2 — §01 Rent Positioning

| #     | Test                                                                   | Expected                      | Result |
| ----- | ---------------------------------------------------------------------- | ----------------------------- | ------ |
| T2-01 | Section header "Rent positioning" visible                              | Correct topic label           |        |
| T2-02 | RentalCompsBar renders with asking ($2,150) marker                     | Marker present on bar         |        |
| T2-03 | "Low", "Mid", "High" labels on bar                                     | Three position labels visible |        |
| T2-04 | Four metric tiles present (monthly savings, annual, comps, confidence) | All four tiles render         |        |

---

## T3 — §02 Listing Accuracy (FlagDeepRow)

| #     | Test                                                           | Expected                     | Result |
| ----- | -------------------------------------------------------------- | ---------------------------- | ------ |
| T3-01 | Three flag rows render (red, amber, green)                     | Three cards with left border |        |
| T3-02 | Red flag has "!" glyph with fail (clay) colour border          | Clay-red left border         |        |
| T3-03 | Amber flag has "?" glyph with caution (amber) colour border    | Amber left border            |        |
| T3-04 | Green flag has "✓" glyph with pass (sage) colour border        | Sage left border             |        |
| T3-05 | Clicking red flag expands — evidence quote appears             | Italic evidence text visible |        |
| T3-06 | Expanded red flag shows "Ask before signing" box in terracotta | Terracotta callout box       |        |
| T3-07 | Clicking red flag again collapses it                           | Evidence hidden again        |        |
| T3-08 | Green (good) flag — clicking expands evidence only, no ask box | No "Ask before signing"      |        |

---

## T4 — §03 Listed vs Reality

| #     | Test                                                       | Expected               | Result |
| ----- | ---------------------------------------------------------- | ---------------------- | ------ |
| T4-01 | Section §03 is visible (has bad-tone mismatches)           | Section present        |        |
| T4-02 | Left card header "Marketing copy" renders                  | Left header visible    |        |
| T4-03 | Right card header "After our analysis" renders             | Right header visible   |        |
| T4-04 | "2 bedrooms + study" appears in left card                  | Listed text present    |        |
| T4-05 | "1 proper bedroom + 1 glass-door den" in right card with ✗ | Bad row styled in clay |        |
| T4-06 | "2 full bathrooms" in right card with ✓                    | Ok row styled in ink   |        |
| T4-07 | Verdict shows "3 mismatches" in section header             | Correct mismatch count |        |

---

## T5 — §04 Negotiation

| #     | Test                                               | Expected                                   | Result |
| ----- | -------------------------------------------------- | ------------------------------------------ | ------ |
| T5-01 | Target range "$1,950 – $2,000/mo" in leverage card | Correct range                              |        |
| T5-02 | Annual savings estimate visible                    | "$600–1,200 saved" text                    |        |
| T5-03 | "Why you have leverage" header renders             | Leverage section visible                   |        |
| T5-04 | All 5 leverage factor rows present                 | 5 rows in table                            |        |
| T5-05 | Suggested message text rendered in italic style    | Italic message with terracotta left border |        |
| T5-06 | "Copy" button present in message card              | Copy button visible                        |        |
| T5-07 | Clicking "Copy" shows "Copied!" text in button     | Button label changes                       |        |
| T5-08 | "Copied!" label reverts to "Copy" after ~2 seconds | Label reverts                              |        |
| T5-09 | All 4 "Why this works" bullets visible             | 4 bullet items                             |        |

---

## T6 — §05 Monthly Cost

| #     | Test                                           | Expected           | Result |
| ----- | ---------------------------------------------- | ------------------ | ------ |
| T6-01 | Section "Monthly cost" header renders          | Correct topic      |        |
| T6-02 | Rent row shows asking $2,150 and target $1,975 | Two values per row |        |
| T6-03 | Hydro row shows "~$80–110/mo" note             | Note visible       |        |
| T6-04 | Parking row shows "unclear — confirm" note     | Note visible       |        |
| T6-05 | Totals row at bottom of table                  | Total row renders  |        |

---

## T7 — §06 What's Included

| #     | Test                                                                 | Expected               | Result |
| ----- | -------------------------------------------------------------------- | ---------------------- | ------ |
| T7-01 | Grid of amenity cells renders                                        | Auto-fill grid visible |        |
| T7-02 | ✓ glyph on "Heat" (sage green)                                       | Green ✓ visible        |        |
| T7-03 | $ glyph on "Hydro / electricity" (amber)                             | Amber $ visible        |        |
| T7-04 | ? glyph on "Parking" (clay red)                                      | Clay ? visible         |        |
| T7-05 | Legend: three swatch dots with "Included", "Extra", "Unclear" labels | All three legend items |        |
| T7-06 | "12 of 14 items confirmed included" summary line                     | Correct count          |        |

---

## T8 — §07 Location & Commute

| #     | Test                                                          | Expected                      | Result |
| ----- | ------------------------------------------------------------- | ----------------------------- | ------ |
| T8-01 | Mobility scores card on left renders                          | Left card present             |        |
| T8-02 | Walk Score: 72 with amber/caution styling                     | 72 in amber                   |        |
| T8-03 | Transit Score: 85 with pass/sage styling                      | 85 in sage                    |        |
| T8-04 | Bike Score: 58 with amber/caution styling                     | 58 in amber                   |        |
| T8-05 | Progress bars fill proportionally to score values             | Bars roughly at 72%, 85%, 58% |        |
| T8-06 | Distances card on right renders with 9 rows                   | 9 distance rows               |        |
| T8-07 | "VMC Subway (Line 1)" row shows "2 min walk"                  | Correct value                 |        |
| T8-08 | "Walkable cafés / restaurants" row shows amber/caution colour | Amber text                    |        |

---

## T9 — §08 Schools

| #     | Test                                                     | Expected                          | Result |
| ----- | -------------------------------------------------------- | --------------------------------- | ------ |
| T9-01 | Three columns: "Elementary", "Middle", "High school"     | All three headers                 |        |
| T9-02 | "Jesse Ketchum Jr & Sr PS" card in Elementary column     | School name present               |        |
| T9-03 | "In catchment" badge on Jesse Ketchum card               | Badge visible (terracotta border) |        |
| T9-04 | No "In catchment" badge on St. Michael's Catholic School | No badge                          |        |
| T9-05 | "Above avg" label in sage/pass colour                    | Sage green label                  |        |
| T9-06 | "Average" label in muted colour                          | Muted/grey label                  |        |
| T9-07 | Board glyphs: P (sage), C (terracotta), F (amber)        | Correct colour per glyph          |        |
| T9-08 | "0.6 km · 8 min" distance line on Jesse Ketchum card     | Correct distance                  |        |

---

## T10 — §09 SunScout Placeholder

| #      | Test                                                | Expected       | Result |
| ------ | --------------------------------------------------- | -------------- | ------ |
| T10-01 | Placeholder card renders with "Coming Phase 2" chip | Chip visible   |        |
| T10-02 | Placeholder does not crash or show errors           | No error state |        |

---

## T11 — §10 Comps Map

| #      | Test                                           | Expected         | Result |
| ------ | ---------------------------------------------- | ---------------- | ------ |
| T11-01 | Map container renders                          | Map area visible |        |
| T11-02 | Map section shows comp pin data or placeholder | No crash         |        |

---

## T12 — §11 Unit & Building Details

| #      | Test                                                  | Expected          | Result |
| ------ | ----------------------------------------------------- | ----------------- | ------ |
| T12-01 | Section "Unit & building" header renders              | Correct topic     |        |
| T12-02 | Collapsed state shows — click to expand               | Expand works      |        |
| T12-03 | Expanded: "1+den" beds, "1" baths, "620" sqft visible | Correct specs     |        |
| T12-04 | "37th floor" detail visible when expanded             | Floor data shown  |        |
| T12-05 | Collapse button works                                 | Section collapses |        |

---

## T13 — §12 Before You Sign (Checklist)

| #      | Test                                                  | Expected                          | Result |
| ------ | ----------------------------------------------------- | --------------------------------- | ------ |
| T13-01 | Section "Before you sign" header renders              | Correct topic                     |        |
| T13-02 | All 6 checklist items visible                         | 6 items rendered                  |        |
| T13-03 | Critical items visually distinct (e.g. bold or badge) | Critical items styled differently |        |
| T13-04 | Counter shows "0 / 6 complete" initially              | Correct initial count             |        |
| T13-05 | Check one item → counter shows "1 / 6 complete"       | Counter increments                |        |
| T13-06 | Checked item shows strikethrough text                 | Strikethrough applied             |        |
| T13-07 | Check all 6 → counter shows "6 / 6 complete"          | Counter at maximum                |        |

---

## T14 — Conversion Block

| #      | Test                                                  | Expected                   | Result |
| ------ | ----------------------------------------------------- | -------------------------- | ------ |
| T14-01 | "Investor report" upsell card renders below checklist | Card present               |        |
| T14-02 | Dark rent-drop email card renders                     | Dark card with email input |        |
| T14-03 | No emoji appears anywhere on the page                 | Zero emoji characters      |        |

---

## T15 — Nav behaviour

| #      | Test                                              | Expected                               | Result |
| ------ | ------------------------------------------------- | -------------------------------------- | ------ |
| T15-01 | Nav shows "Prop*Scout*" wordmark                  | Wordmark renders                       |        |
| T15-02 | "Tenant report" breadcrumb label in Nav           | Correct label                          |        |
| T15-03 | Address slug "3705-charles-st-e" in Nav copy-link | Slug in href or text                   |        |
| T15-04 | "Save report" button in Nav                       | Button present                         |        |
| T15-05 | Theme toggle (sun/moon) button in Nav             | Toggle button present                  |        |
| T15-06 | Clicking theme toggle switches body to dark mode  | `data-theme="dark"` on html            |        |
| T15-07 | Clicking again reverts to light mode              | `data-theme` removed or set to "light" |        |

---

## T16 — Design token compliance

| #      | Test                                                      | Expected                      | Result |
| ------ | --------------------------------------------------------- | ----------------------------- | ------ |
| T16-01 | No raw hex colours in inline styles (DevTools inspect)    | All CSS uses `var(--…)`       |        |
| T16-02 | Card borders are `var(--line)` colour (grey, not black)   | Borders visible but not harsh |        |
| T16-03 | Hover states on flag rows turn terracotta `var(--accent)` | Hover colour correct          |        |
| T16-04 | Section background is `var(--bg)` warm cream              | Background is warm, not white |        |

---

## T17 — Mobile (375px viewport)

| #      | Test                                           | Expected                   | Result |
| ------ | ---------------------------------------------- | -------------------------- | ------ |
| T17-01 | Resize to 375px — no horizontal scroll         | Content fits               |        |
| T17-02 | Listed vs Reality grid stacks to single column | Two cards stack vertically |        |
| T17-03 | Negotiation grid stacks to single column       | Left/right cards stack     |        |
| T17-04 | School grid stacks to single column            | Three columns become one   |        |
| T17-05 | FlagDeepRow cards remain readable at 375px     | Text not clipped           |        |

---

_Last updated: 2026-05-28 · PR5 Tenant Report_
