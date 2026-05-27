# UI Testing Checklist — Blocks 3 & 4

## Manual Browser Verification for PRs 1–3

---

## Prerequisites

Before starting, confirm all of the following:

- `npm run dev --workspace=apps/web` is running → http://localhost:5173 returns HTTP 200
- Browser DevTools is open (F12)
- **axe DevTools** browser extension is installed and active
- **React DevTools** browser extension is installed (required for Nav variant tests)
- Hard-refresh the page before beginning each category (Ctrl+Shift+R)

---

## BLOCK 3 — PR 1 Shared Components

─────────────────────────────────────────
TEST: Typography and design tokens
BLOCK: 3
CATEGORY: Typography
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Open DevTools → Network tab → filter by "Font" type → hard-refresh (Ctrl+Shift+R)
3. Confirm requests appear for fonts.googleapis.com loading "Instrument+Serif", "Geist", and "Geist+Mono"
4. Right-click the hero display heading → Inspect → Computed panel → search "font-family" → note the resolved value
5. Right-click any paragraph of body text → Inspect → Computed → search "font-family" → note the resolved value
6. Right-click a price or percentage in the Pricing section (e.g., "$10") → Inspect → Computed → search "font-family" → note the resolved value
7. Look at the wordmark in the top-left Nav: visually confirm "Prop" looks different from "Scout" — one should be sans-serif regular weight, the other serif italic
8. Right-click "Scout" in the wordmark → Inspect → Computed → confirm font-family contains "Instrument Serif"
9. Right-click the page background → Inspect → Styles panel → look at the rule setting background on the root or body — confirm the value reads `var(--bg)` not a raw hex
10. Right-click any white card on the page → Inspect → Styles → confirm background is `var(--surface)` not `#FFFFFF` directly
11. Find the dark mode toggle in the Nav (button with accessible name "Switch to dark mode") → click it
12. In DevTools → Elements panel, select the `<html>` element → confirm `data-theme="dark"` attribute appears
13. Visually scan the full page in dark mode: confirm background shifts from warm cream to a dark tone, cards darken, text lightens — nothing stays stuck at a light-mode colour
14. Click the toggle again → confirm `data-theme` returns to "light" and page restores original appearance
    PASS: Three Google Font families load with HTTP 200. Hero heading resolves to "Instrument Serif". Body text resolves to "Geist". Price values resolve to "Geist Mono". "Scout" in the wordmark is visibly serif italic, "Prop" is sans-serif. Background and card background are set via `var()` tokens in the Styles panel — no raw hex appears in component-level rules. After clicking the dark mode toggle, `data-theme="dark"` is on `<html>` and the full page shifts to dark-mode colours with nothing stuck white. Toggling back restores light mode.
    FAIL: Any font request returns non-200 or is absent. Body text renders in Arial, -apple-system, or system default. Heading is not serif. Prices are not monospaced. "Scout" and "Prop" look identical. A raw hex value like `background: #F1ECE2` appears directly in a component stylesheet (not inside tokens.css `:root`). Clicking the dark mode toggle does not add `data-theme` to `<html>`. Any element stays white or black after dark mode is activated.
    ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Icons — all 17 names render visible SVGs, aria-hidden, and respond to size and stroke props
BLOCK: 3
CATEGORY: Icons
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Visually scan the landing page for icon usage: Nav toggle buttons, FAQ expand/collapse chevrons, feature list icons, button icons, risk row indicators, report showcase
3. In DevTools → Console, run: `document.querySelectorAll('svg').length` — note the count
4. In DevTools → Console, run: `document.querySelectorAll('svg:not([aria-hidden="true"])').length` — note the count (must be 0)
5. In DevTools → Elements, use Ctrl+F to search `<svg` and step through each result — for each, confirm it has at least one child element (path, circle, polyline, line, rect) and is not an empty `<svg></svg>`
6. For the icons visible on the page, confirm these specific names are not blank: the moon/sun icon (dark mode toggle), the arrow/chevron icon (FAQ expand), any check icon (feature list), any sparkle icon (AI features)
7. Find two icon instances that appear at different sizes (e.g., a small inline icon vs a larger decorative icon) — right-click each → Inspect → note the width/height on the `<svg>` element — confirm they differ
8. Note any icon name from the full set (arrow, link, check, sun, moon, house, chart, shield, doc, map, key, flag, sparkle, paste, plus, minus, dot) that does NOT appear on the landing page — these are "not present on this screen" and are not a failure
   PASS: The console expression `document.querySelectorAll('svg:not([aria-hidden="true"])').length` returns 0. Every `<svg>` in the DOM has `aria-hidden="true"`. No SVG element is empty — each has visible child path/shape elements. Icons that are present on the page are visually distinct from each other (different shapes). Two icons of different declared sizes actually render at different pixel dimensions.
   FAIL: Console expression returns any number greater than 0 (SVGs missing `aria-hidden`). Any `<svg>` is completely empty with no children. Any icon location shows a blank square, missing glyph, or partial broken path. Two icons in different roles are visually identical (wrong name used for one). All icons appear the same size regardless of their purpose.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Button — all three variants, hover transition, disabled state, and keyboard activation
BLOCK: 3
CATEGORY: Button
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Find the primary "Analyze" button (or primary CTA button) → right-click → Inspect → Computed → check background-color and color values
3. Find the "Sign in" button in the Nav (ghost variant) → right-click → Inspect → Styles → check background and border values
4. Find an accent-coloured button in the Pricing section or CTA section (if present) → right-click → Inspect → Computed → check background-color
5. Right-click the primary button → Inspect → Styles panel → look for a `transition` property → note the duration and easing value
6. In DevTools → Elements, with the primary button selected, click the `:hov` toggle and force `:hover` state → check the new colour values in Computed — should shift to `var(--accent)` / #D97757 (terracotta)
7. Leave the URL input empty (do not type anything) → observe the Analyze button — note if it appears visually muted or disabled
8. With the URL input empty, click Analyze → confirm it does not navigate or open a modal (it should show a validation error, not fire an action)
9. Click somewhere neutral on the page to clear focus → press Tab repeatedly until a button receives keyboard focus → confirm a visible focus ring appears on the focused button
10. With a button focused, press Enter → confirm its action fires
11. Tab to another button, press Space → confirm its action fires
12. Right-click any ghost button → Inspect → confirm background is transparent or uses `var(--surface)` / very light token, and border is visible
    PASS: Primary button: dark background (#0E1320 / `var(--ink)`), light text. Ghost button: transparent background, visible border. Accent button (if present): terracotta background (#D97757). `transition` property present on buttons with duration `0.15s` and easing `ease`. Forcing `:hover` shows terracotta colour. An empty Analyze click shows an error rather than navigating. A visible focus ring appears on Tab-focused buttons. Enter and Space both trigger button actions.
    FAIL: Primary button is white or transparent. Ghost button has a dark filled background identical to primary. No `transition` property on any button. Hover colour is blue, green, or no change. Disabled state is not visually distinct from active. No focus ring appears on keyboard focus (pressing Tab shows no visual indicator). Enter or Space on a focused button does nothing.
    ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Card — surface colour, border-radius, shadow, border, and children
BLOCK: 3
CATEGORY: Card
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Find a card component on the page (pricing tier cards, the report showcase framed preview, or any contained content block with a white/surface background and rounded corners)
3. Right-click the card → Inspect → Computed panel → check: background-color, border-radius, box-shadow, border
4. Confirm background uses the surface token (resolves to white #FFFFFF in light mode)
5. Confirm border-radius is visibly rounded (approximately 16–24px — matching `var(--radius-lg)`)
6. Confirm a box-shadow is present (some depth is visible)
7. Confirm a border is present (faint line using `var(--line)`)
8. Confirm all content inside the card (text, buttons, numbers) is visually contained within the card edges — nothing overflows the rounded corners
9. Open DevTools responsive mode → set viewport width to 768px → confirm cards do not overflow their container and no horizontal scrollbar appears
   PASS: Card has white/surface background, visibly rounded corners (~16–24px radius), a subtle drop shadow, and a faint border. All card children render inside the card boundary. At 768px width, cards reflow without overflow.
   FAIL: Card background is transparent or the page background colour. Corners are sharp (0 radius). No box-shadow visible. Content overflows the card edges. At 768px, a card causes horizontal page overflow.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Chip — both variants (with and without accent dot)
BLOCK: 3
CATEGORY: Chip
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Scan the page for small pill/badge label elements (may appear in pricing section as tier labels, feature tags, or section eyebrow labels)
3. Find a Chip without an accent dot — right-click → Inspect → confirm it has no `::before` pseudo-element or dot child rendering before the text
4. Confirm the chip is pill-shaped: right-click → Inspect → Computed → check border-radius (should be very high, 999px or 50%, giving fully rounded ends)
5. Find a Chip with an accent dot (terracotta dot before text) — right-click → Inspect → confirm a `::before` pseudo-element or small dot element exists before the text
6. Confirm the dot colour resolves to `var(--accent)` / #D97757 (terracotta) in the Computed panel
7. Confirm neither chip variant uses an emoji or bullet character (·, •, ★) — the dot must be a styled CSS element
   PASS: Non-accent chip is pill-shaped with no dot preceding the text. Accent chip is pill-shaped with a small circular terracotta dot before the text. The dot is implemented as a CSS pseudo-element or styled span — not a Unicode bullet character. Both chips contain readable text.
   FAIL: Chip has square corners (border-radius: 0 or very small). Non-accent chip shows a dot when it should not. Accent chip has no dot. The dot is a literal `•` or `·` character in the text. Chip text overflows the pill shape.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: VerdictPill — pass, caution, and fail tones
BLOCK: 3
CATEGORY: VerdictPill
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Scroll to the report showcase section (the demo report preview embedded in the landing page) — this section should show verdict pills
3. Find a passing verdict pill (green tone) → right-click → Inspect → Computed → check color or background-color → confirm it resolves to `var(--pass)` / #4F7A48 (sage green)
4. Find a caution verdict pill (amber tone) → right-click → Inspect → Computed → confirm it resolves to `var(--caution)` / #B98724 (amber)
5. Find a fail verdict pill (red tone) → right-click → Inspect → Computed → confirm it resolves to `var(--fail)` / #B14A37 (clay red)
6. For each pill, confirm a dot precedes the text label
7. For each pill, check the element's `style=""` attribute in the Elements panel — confirm colour is NOT set via an inline style attribute (colour must come from a CSS class, not `style="color: #4F7A48"`)
8. Confirm all three tones are visually distinct from each other
   PASS: Pass pill resolves to sage green (#4F7A48). Caution pill resolves to amber (#B98724). Fail pill resolves to clay red (#B14A37). All three have a dot prefix. No pill has a colour set via an inline `style` attribute. All three are visually distinguishable.
   FAIL: Any two pills are the same colour (indistinguishable tones). Any pill colour is hardcoded via an inline style attribute. No dot precedes any pill text. The wrong token is used (e.g., fail renders green). Any pill is missing from the showcase section.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: SectionHead — standard (no verdict) and with verdict pill
BLOCK: 3
CATEGORY: SectionHead
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Scroll to the "How it works" section → locate the SectionHead element at the top of that section
3. Confirm a small eyebrow label or tag text appears above or near the main heading (e.g., a small all-caps or monospace label identifying the section)
4. Confirm the main heading text is in Instrument Serif (serif font, visually distinct from body text) → right-click the heading → Inspect → Computed → font-family
5. Confirm NO VerdictPill (no coloured dot-prefixed pill) appears in this SectionHead
6. Scroll to the report showcase demo section where a section shows a verdict (e.g., "Is the rent fair?" with a pass/caution/fail result)
7. Confirm the SectionHead there contains a VerdictPill alongside the heading text
8. Confirm the pill has the correct tone colour (green/amber/red) matching the demo result
9. Confirm the heading and pill are visually aligned without overlap or layout breakage
   PASS: The standard SectionHead has an eyebrow label and a serif heading with no verdict pill. The verdict SectionHead has an eyebrow label, a serif heading, and a visible VerdictPill with the correct tone colour. Heading and pill are aligned. No layout overflow.
   FAIL: Eyebrow label is missing in either variant. Heading is in a sans-serif font. A verdict pill appears in the standard (no-verdict) SectionHead. The verdict pill is absent from the section that should show one. Pill and heading overlap or break layout.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Nav — landing variant, report variant, account variant, and responsive layout
BLOCK: 3
CATEGORY: Nav
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173 → observe the Nav at the top of the page
2. Confirm the landing variant shows: Wordmark on the left, "Sign in" button, at least one CTA button, anchor links to sections ("How it works", "Pricing")
3. Confirm NO back/return link (← or "Back") is present in the landing Nav
4. Open DevTools → Set responsive mode to 1280px → confirm no horizontal overflow in the Nav and no elements break
5. Set responsive mode to 768px → confirm Nav reflows cleanly (items may collapse or stack but nothing breaks or overflows)
6. Open React DevTools extension → Components tab → find the Nav component in the component tree
7. In the React DevTools Props panel, change `variant` from "landing" to "report" → observe the Nav in the browser
8. Confirm the report variant shows: Wordmark present, a back link (← or chevron + "Back" text), CTA buttons and section anchor links are gone
9. In React DevTools, change `variant` to "account" → observe the Nav
10. Confirm the account variant shows: Wordmark present, account-related element (avatar, account menu, or user indicator), Sign in button replaced or absent
11. Change variant back to "landing" → confirm it restores to its original appearance
    PASS: Landing variant: Wordmark + Sign in + CTA + anchor links, no back link. Report variant: Wordmark + back link, no CTA or anchor links. Account variant: Wordmark + account element, Sign in replaced. No layout overflow at 1280px. No broken elements at 768px.
    FAIL: Landing variant is missing the Sign in button or CTA. A back link appears in the landing variant. Report variant shows no back link. Account variant looks identical to landing. Changing variant in React DevTools produces no visible change. Nav overflows horizontally at 1280px. Elements clip or stack incorrectly at 768px.
    ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Footer — content, links, semantic element, and responsive layout
BLOCK: 3
CATEGORY: Footer
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173 → scroll to the very bottom of the page
2. Confirm the Wordmark SVG ("PropScout") appears in the footer
3. Confirm a disclaimer or legal note is present — look for text containing "not financial" or "not legal advice" or similar
4. Confirm "PropScout Analytics Inc." copyright text is present
5. Find the Privacy link → right-click → "Copy link address" → confirm the href is `/privacy` (a relative path, not an external URL)
6. Find the Terms link → right-click → "Copy link address" → confirm the href is `/terms`
7. In DevTools → Elements, use Ctrl+F to search for `<footer` → confirm a semantic `<footer>` element exists (not a `<div>` labelled "footer")
8. In DevTools responsive mode, set to 1280px → confirm no horizontal overflow in the footer
9. Set to 768px → confirm footer content reflows without overlap or clipping
   PASS: Wordmark present. Disclaimer text present. Copyright text present. Privacy href="/privacy". Terms href="/terms". A `<footer>` semantic element exists in the DOM. No overflow at 1280px. Readable layout at 768px.
   FAIL: Wordmark absent. Disclaimer text missing. Copyright missing. Privacy or Terms link goes to "#" or an external URL. No `<footer>` element — a plain `<div>` is used instead. Horizontal scrollbar at 1280px from footer overflow. Footer content clips or overlaps at 768px.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: SignInModal — closed by default, opens with animation, focus management, focus trap, keyboard close, backdrop close, and card-click safety
BLOCK: 3
CATEGORY: SignInModal
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173 — do not click anything
2. In DevTools → Console, run: `document.querySelector('[role="dialog"]')` → confirm it returns null (modal not in DOM on load)
3. Click the "Sign in" button in the Nav → watch for an open animation (backdrop fades in, card slides or scales up)
4. After modal opens, in DevTools → Elements, confirm a `[role="dialog"]` element now exists
5. Select the dialog element → confirm `aria-modal="true"` appears in its attribute list
6. Immediately after the modal opens (without clicking), press Tab once → confirm keyboard focus is inside the modal on the first focusable element (visible focus ring appears inside the modal card)
7. Press Tab repeatedly → confirm focus cycles through all focusable elements inside the modal without ever jumping to elements behind the backdrop (URL input, Nav buttons, footer links)
8. Press Shift+Tab from the first focusable element → confirm focus wraps to the last focusable element inside the modal
9. Press Escape → confirm the modal closes
10. In DevTools → Console, run `document.querySelector('[role="dialog"]')` → confirm it returns null again (fully removed)
11. Confirm no semi-transparent overlay layer remains on the page (all content is fully clickable)
12. Click "Sign in" again to reopen the modal
13. Click on the dark backdrop area outside the modal card → confirm the modal closes and overlay is removed
14. Click "Sign in" again → when modal is open, click directly on the modal card content (the white/surface box, not the backdrop) → confirm the modal stays open
    PASS: `querySelector('[role="dialog"]')` returns null on page load. Modal opens with a visible transition (not instant). `role="dialog"` and `aria-modal="true"` are present. Focus is inside the modal immediately after it opens. Tab is trapped — focus never reaches elements behind the backdrop. Shift+Tab wraps correctly. Escape closes the modal and removes all overlay layers. Backdrop click closes the modal. Clicking card content does not close the modal.
    FAIL: A `role="dialog"` element exists on page load without any interaction. Modal appears with no animation. `role="dialog"` or `aria-modal="true"` is missing. Focus remains on the Sign in button after the modal opens. Tab escapes the modal to the URL input or Nav. Escape does nothing. A ghost overlay remains after closing (page is not fully clickable). Clicking card content dismisses the modal.
    ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Accessibility — axe sweep on shared components (Block 3)
BLOCK: 3
CATEGORY: Accessibility
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Open the axe DevTools extension panel (usually in DevTools → axe DevTools tab)
3. Click "Scan ALL of my page" (or "Analyze") with no modal open
4. Note the count of Violations (critical, serious, moderate, minor)
5. For any violation, expand it and note which element is affected and what the rule is
6. Click "Sign in" to open the SignInModal
7. With the modal open, run the axe scan again
8. Note any new violations that appear with the modal open (especially focus management and dialog role issues)
9. Close the modal and press Tab through all interactive elements (buttons, links, input) — confirm every focusable element has a visible focus indicator (not hidden outline)
   PASS: Axe reports zero violations on the base landing page. Axe reports zero violations with the SignInModal open. Every interactive element is reachable by Tab. Every Tab-focused element has a visible focus ring.
   FAIL: Axe reports one or more violations of any severity. A "critical" or "serious" violation appears in the axe panel. Any interactive element is unreachable by keyboard Tab. Any Tab-focused element shows no visible focus indicator (if the only focus style is `outline: none` with no replacement, that is a failure).
   ─────────────────────────────────────────

---

## BLOCK 4 — PR 3 Landing Page + ModeModal

─────────────────────────────────────────
TEST: Landing page structure — all major sections present
BLOCK: 4
CATEGORY: Landing Page
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173 in a fresh browser tab
2. Confirm the page loads with no console errors (open DevTools → Console → confirm no red error messages)
3. Confirm the Nav is present at the top with the Wordmark
4. Scroll down slowly and confirm each of the following sections is present and has a heading or visible content:
   a. Hero section — URL input bar and Analyze button visible
   b. Report showcase section — an embedded demo report preview (browser-chrome framed preview)
   c. "How it works" section — visible heading and step content
   d. Pricing section — tier cards visible (Free, Investor Pro, Professional at minimum)
   e. FAQ section — "Common Questions" heading and at least 5 question rows
   f. CTA section — a final call-to-action block before the footer
5. Confirm the Footer is present at the very bottom
6. Open DevTools → set responsive mode to 1280px → confirm no horizontal scrollbar
7. Set responsive mode to 1024px → confirm no horizontal scrollbar and no broken layout
   PASS: All six sections (Hero, Showcase, How it works, Pricing, FAQ, CTA) are present and contain visible content. Footer present. Zero console errors on load. No horizontal overflow at 1280px or 1024px.
   FAIL: Any section is missing entirely. The page is blank or shows only a loading state. A horizontal scrollbar appears at 1280px. Red error messages appear in the console on page load.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: URL validation — empty input
BLOCK: 4
CATEGORY: URL Validation
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Ensure the URL input field is empty (clear it if it has any pre-filled text)
3. Click the "Analyze" button without entering any text
4. Observe what happens — look for an inline error message near the input
   PASS: An inline error or warning message appears near the input field. The message contains text matching "paste a listing URL" or similar prompt to enter a URL. No modal opens. No navigation occurs. The Analyze button action is blocked.
   FAIL: The page navigates or a modal opens despite an empty input. No error message appears. The page crashes or shows an unhandled error.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: URL validation — invalid URL (no http/https scheme)
BLOCK: 4
CATEGORY: URL Validation
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Click the URL input field
3. Type: `www.realtor.ca/real-estate/12345/some-address` (no http:// or https:// prefix)
4. Click the "Analyze" button
5. Look for an inline error message near the input
6. Confirm the Analyze action did not proceed (no modal opened, no navigation)
   PASS: An inline error message appears indicating the URL is not valid (text containing something like "doesn't look like a valid URL" or equivalent). No modal opens. No navigation occurs.
   FAIL: The invalid URL is accepted and a modal opens or navigation occurs. No error message appears. The page crashes.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: URL validation — unsupported domain
BLOCK: 4
CATEGORY: URL Validation
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Click the URL input and type: `https://www.google.com/property/123`
3. Click "Analyze"
4. Look for an inline error message
5. Note the exact text of the error message
6. Find and click the "Dismiss" button that should appear with the error
7. Confirm the error message disappears after dismissing
   PASS: An error message appears containing text matching "not a usable link" (case-insensitive). A "Dismiss" button is present. Clicking Dismiss removes the error message from the DOM. No modal opens during this flow.
   FAIL: No error message appears. The error text does not mention the URL being unsupported or not usable. No Dismiss button is present. Clicking Dismiss does not remove the error message. The error message persists after dismissal.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: URL validation — US Zillow blocked
BLOCK: 4
CATEGORY: URL Validation
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Click the URL input and type: `https://www.zillow.com/homedetails/12345`
3. Click "Analyze"
4. Look for an inline error message
5. Note the exact text of the error message — it should reference Canadian properties
   PASS: An error message appears containing text matching "Canadian properties only" (case-insensitive). No modal opens. No navigation occurs. The error is specific to the US Zillow domain — not the same generic message as the unsupported domain error.
   FAIL: US Zillow is accepted as a valid URL and the flow continues to a modal or navigation. No error message appears. The error message says "not a usable link" (wrong — this should be a specific Canada-only message, not the generic unsupported error).
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: URL validation — valid Realtor.ca for-sale URL
BLOCK: 4
CATEGORY: URL Validation
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Click the URL input and type (or paste): `https://www.realtor.ca/real-estate/27619830/146-east-19th-street-hamilton`
3. Confirm no error message appears after typing (field should show a neutral or valid state)
4. Click "Analyze"
5. Observe what happens — the Hero should transition to a progress or scraping state, then either show a "done" state with an "Open report" button, or open the ModeModal directly
6. If an "Open report" button appears, click it → ModeModal should open
7. If ModeModal opens, confirm it shows "Investment" and "Personal Use" options (not Tenant/Landlord)
   PASS: Typing a valid Realtor.ca URL produces no error message in the input area. Clicking Analyze proceeds past the validation step (transitions to progress or modal). A ModeModal with Investment and Personal Use choices is reachable from this URL. No "not a usable link" or "Canadian properties only" error appears.
   FAIL: The valid Realtor.ca URL triggers an error message. Clicking Analyze on a valid URL shows a validation error. The flow never progresses past the URL input. A ModeModal shows Tenant/Landlord options instead of Investment/Personal Use.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: URL validation — valid Zillow.ca URL
BLOCK: 4
CATEGORY: URL Validation
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Clear the URL input
3. Type (or paste): `https://www.zillow.ca/for-sale/12345`
4. Confirm no validation error appears
5. Click "Analyze"
6. Confirm the flow proceeds (progress state, modal, or similar) without a "not supported" or "US listing" error
   PASS: `zillow.ca` is accepted as a valid URL — no error message appears. Clicking Analyze proceeds past validation. The flow continues without a "Canadian properties only" or unsupported domain error (that error is only for `zillow.com`, not `zillow.ca`).
   FAIL: `zillow.ca` triggers the US Zillow error ("Canadian properties only"). `zillow.ca` triggers the unsupported domain error. The flow fails on a valid Canadian Zillow URL.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: URL validation — valid Realtor.ca for-rent URL
BLOCK: 4
CATEGORY: URL Validation
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Clear the URL input
3. Type (or paste): `https://www.realtor.ca/rental/5702-buttermill-ave`
4. Confirm no validation error appears
5. Click "Analyze"
6. Observe what happens — the Hero should proceed past validation
7. If a ModeModal opens (directly or after clicking "Open report"), confirm it shows "Tenant" and "Landlord" options (not Investment/Personal Use) because this is a for-rent URL
   PASS: The `/rental/` URL passes validation with no error. Clicking Analyze proceeds. When ModeModal opens, it shows Tenant and Landlord choices, not Investment and Personal Use.
   FAIL: The rental URL triggers any validation error. The flow does not proceed. A ModeModal shows Investment/Personal Use options instead of Tenant/Landlord for a `/rental/` URL.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: URL validation — paste works the same as typing
BLOCK: 4
CATEGORY: URL Validation
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Copy this URL to your clipboard: `https://www.realtor.ca/real-estate/27619830/146-east-19th-street-hamilton`
3. Click the URL input field
4. Paste using Ctrl+V (or Cmd+V on Mac)
5. Confirm the full URL appears in the input field
6. Confirm no validation error appears after pasting (same as when typing)
7. Click "Analyze" → confirm the flow proceeds identically to when the URL was typed
8. Repeat with an invalid URL: copy `https://www.example.com/property`, paste it, click Analyze → confirm the error message appears the same as when typed
   PASS: Pasting a URL into the input populates the field correctly. The validation behaviour (error or success) is identical whether the URL was typed character-by-character or pasted in one action. Both valid and invalid pasted URLs produce the same outcome as typed ones.
   FAIL: Pasting does not populate the input field. A pasted URL produces a different outcome than the same URL typed (e.g., pasting passes validation but typing fails, or vice versa). The input field does not accept paste events.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Pricing toggle — monthly and annual switching
BLOCK: 4
CATEGORY: Pricing Section
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Scroll to the Pricing section — confirm the heading contains "Pricing" and "cad" (case-insensitive, may read "Pricing · CAD")
3. Note the current prices shown on the tier cards (default monthly view)
4. Find the monthly/annual or monthly/yearly toggle button — click the "Yearly" or "Annual" option
5. Observe the prices on the tier cards — they should change
6. Confirm the page now shows a yearly price for the Investor Pro tier — specifically look for text matching "$100 billed yearly" or "100 billed yearly" (case-insensitive)
7. Click "Monthly" to switch back → confirm prices return to their original monthly values
   PASS: The Pricing section heading is present. A toggle between monthly and annual billing is visible. Clicking "Yearly" updates the displayed prices. The Investor Pro yearly price shows "100 billed yearly" (approximately $100/year). Clicking "Monthly" restores the original monthly prices.
   FAIL: No pricing section appears. No billing period toggle is present. Clicking Yearly does not change the displayed prices. The yearly Investor Pro price does not show approximately $100. Switching back to Monthly does not restore original prices.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: FAQ accordion — expand and collapse
BLOCK: 4
CATEGORY: FAQ Section
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Scroll to the FAQ section — confirm a heading "Common Questions" (or similar) is visible
3. Confirm at least 5 question rows are visible
4. Confirm all FAQ items are collapsed on initial load — no answer content is visible beneath any question
5. Find the question "Why Ontario only?" (or similar phrasing about Ontario) — click on it
6. Confirm the answer expands below that question — look specifically for text containing "province-specific"
7. Confirm only that item expanded — all other FAQ items remain collapsed
8. Click the same question again → confirm it collapses and the answer text disappears
9. Click a different FAQ question → confirm it expands
10. Click it again → confirm it collapses
    PASS: FAQ heading is present. At least 5 questions are visible. All items are collapsed on page load (no answers visible before any click). Clicking a question expands its answer. The word "province-specific" appears in the "Why Ontario only" answer after clicking. Clicking again collapses it. Other items remain collapsed when one is opened. The accordion works as a toggle — open and close on successive clicks.
    FAIL: FAQ section is missing or has fewer than 5 questions. One or more items are open on initial page load. Clicking a question does nothing. The answer to "Why Ontario only?" does not contain text about "province-specific". Clicking a question opens multiple answers simultaneously. Clicking an open question a second time does not close it.
    ─────────────────────────────────────────

─────────────────────────────────────────
TEST: ModeModal — for-sale URL opens modal with Investment and Personal Use options
BLOCK: 4
CATEGORY: ModeModal
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. In the URL input, type: `https://www.realtor.ca/real-estate/27619830/146-east-19th-street-hamilton`
3. Click "Analyze"
4. If a progress/scraping state appears, wait for it to complete and click "Open report" if a button appears, OR the ModeModal may open directly
5. When the ModeModal is open, confirm `role="dialog"` and `aria-modal="true"` are present (check DevTools Elements)
6. Confirm the modal shows a question about investment vs personal use (NOT a question about tenant vs landlord)
7. Confirm two choice cards are visible: one for buying as an investment, one for personal use / living in
8. Look for text matching "buying it as an investment" and "buying it to live in" (case-insensitive)
9. Confirm NO "Free forever" badge or pill appears in either card (that is only for the tenant option on rent listings)
   PASS: ModeModal opens from a for-sale URL. `role="dialog"` and `aria-modal="true"` are present. The question is about investment vs personal use. Two cards are present: one about buying as an investment, one about living in. No "Free forever" badge appears.
   FAIL: ModeModal does not open after submitting a valid for-sale URL. The modal shows Tenant/Landlord options instead of Investment/Personal Use. "Free forever" badge appears for a for-sale listing. `role="dialog"` or `aria-modal="true"` is missing.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: ModeModal — clicking Investment routes to investor report path
BLOCK: 4
CATEGORY: ModeModal
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173 and submit a valid Realtor.ca for-sale URL to open the ModeModal
2. When the modal shows Investment and Personal Use cards, click the "Investment" card (the one about buying as an investment)
3. Observe: the modal should show a loading/progress indicator briefly, then close
4. Check the browser URL bar — confirm the path contains `mode=investor` (e.g., `/analyzing?mode=investor&kind=sale` or `/r/[token]?mode=investor`)
5. Confirm no console error appeared during this transition
6. Note: the destination page may be blank or show a 404 because the report page does not exist yet — that is expected. What matters is that the URL path contains `mode=investor` and no JavaScript error was thrown
   PASS: Clicking the Investment card closes the modal and navigates to a URL containing `mode=investor`. No JavaScript error appears in the console. The navigation action fires cleanly even if the destination page is not yet built.
   FAIL: Clicking Investment does nothing — the modal stays open permanently. Navigation occurs but the URL does not contain `mode=investor`. A JavaScript error is thrown in the console. The modal closes but the browser URL stays at `/`.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: ModeModal — clicking Personal Use routes to personal buyer report path
BLOCK: 4
CATEGORY: ModeModal
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173 and submit a valid Realtor.ca for-sale URL to open the ModeModal (navigate back if needed — press the browser back button and re-submit)
2. When the modal shows Investment and Personal Use cards, click the "Personal Use" card (buying it to live in)
3. Observe the modal close and check the browser URL bar
4. Confirm the path contains `mode=personal` or `mode=buyer` (the mode name for personal purchase)
5. Confirm no console error appeared
   PASS: Clicking Personal Use closes the modal and navigates to a URL containing the personal buyer mode parameter (e.g., `mode=personal`). No JavaScript error. Navigation fires cleanly.
   FAIL: Clicking Personal Use has the same URL result as clicking Investment (both go to `mode=investor`). Modal stays open. A JavaScript error is thrown. Browser stays at `/`.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: ModeModal — for-rent URL opens modal with Tenant and Landlord options
BLOCK: 4
CATEGORY: ModeModal
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Navigate back to the landing page if needed (press browser back)
3. In the URL input, type: `https://www.realtor.ca/rental/5702-buttermill-ave`
4. Click "Analyze" and wait for the ModeModal to appear (click "Open report" if required)
5. Confirm the modal's question is about being a tenant vs landlord (NOT investment vs personal use)
6. Confirm two choice cards appear: one for evaluating as a tenant, one for pricing as a landlord
7. Look for text matching "evaluating this as a tenant" and "pricing my own unit" (case-insensitive)
8. Confirm the Tenant card shows a "Free forever" badge or pill
   PASS: ModeModal opens from a for-rent URL. The question is about tenant vs landlord. Two cards: one about being a tenant, one about being a landlord/pricing. The tenant card has a "Free forever" badge. No investment/personal-use question appears.
   FAIL: ModeModal shows Investment/Personal Use cards for a for-rent URL (kind detection failed). "Free forever" badge is missing from the tenant card. The modal does not open at all from a rental URL. Landlord and Tenant cards are swapped or missing.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: ModeModal — Tenant option routes without requiring login
BLOCK: 4
CATEGORY: ModeModal
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173 and submit a for-rent URL to open the ModeModal (`https://www.realtor.ca/rental/5702-buttermill-ave`)
2. Confirm you are NOT logged in (no user session active — if there is one, use a private/incognito window)
3. Click the "Tenant" card
4. Observe — the modal should close and navigate to the tenant report path WITHOUT showing a sign-in prompt or gate
5. Confirm the browser URL contains `mode=tenant`
6. Confirm no sign-in modal or authentication redirect appears
   PASS: Clicking Tenant while not logged in navigates directly to the tenant report path (URL contains `mode=tenant`). No sign-in modal opens. No login/auth redirect occurs. The navigation is immediate without any authentication barrier.
   FAIL: Clicking Tenant opens the SignInModal or redirects to a login page. Navigation is blocked until the user signs in. The URL does not contain `mode=tenant`. A console error about authentication is thrown.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: ModeModal — Landlord option routes correctly
BLOCK: 4
CATEGORY: ModeModal
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173 and submit a for-rent URL to open the ModeModal
2. Click the "Landlord" card (pricing my own unit)
3. Check the browser URL bar after the modal closes
4. Confirm the path contains `mode=landlord`
5. Confirm no JavaScript error appears in the console
   PASS: Clicking Landlord closes the modal and navigates to a URL containing `mode=landlord`. No JavaScript error. Navigation fires cleanly.
   FAIL: Clicking Landlord navigates to the same path as Tenant (mode detection failed). Modal stays open. A JavaScript error is thrown. The URL does not change from `/`.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: ModeModal — open animation (backdrop fade and card translate + scale)
BLOCK: 4
CATEGORY: ModeModal
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Open DevTools → Animations panel (three-dot menu → More tools → Animations, or from the Rendering panel)
3. Submit a valid URL to trigger the ModeModal
4. At the exact moment the modal begins to open, observe the Animations panel — look for recorded animation entries
5. Look for two animations: one on the backdrop overlay (opacity 0→1) and one on the modal card (opacity 0→1, translateY 8px→0, scale 0.98→1)
6. Confirm the animation duration is approximately 0.25s
7. If the Animations panel is difficult to catch in time, repeat the open action — use the DevTools Animations panel "pause" feature to capture the animation at the start
8. As an alternative to the Animations panel: watch the modal open visually — confirm the backdrop does NOT snap in instantly, and the card does NOT pop in without movement
   PASS: The backdrop fades in gradually (visible opacity transition, not instant). The modal card visibly translates upward (it starts slightly lower and moves up) and scales (starts slightly smaller and grows to full size) during open. Animation duration is approximately 0.25 seconds. The Animations panel shows entries for modal-backdrop-in and/or modal-card-in.
   FAIL: Both the backdrop and card appear instantly with no animation (modal snaps open). The Animations panel shows no animation entries when the modal opens. The card appears at full scale without any translate/scale motion.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: ModeModal — Escape key closes the modal
BLOCK: 4
CATEGORY: ModeModal
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173 and submit a valid URL to open the ModeModal
2. When the modal is open, press the Escape key
3. Confirm the modal closes
4. In DevTools → Elements, confirm `[role="dialog"]` is no longer in the DOM
5. Confirm no backdrop overlay layer remains (the page should be fully interactive)
   PASS: Escape closes the ModeModal. The `role="dialog"` element is removed from the DOM after closing. The backdrop overlay is completely removed. Page content is fully clickable.
   FAIL: Escape does nothing — modal stays open. Modal disappears visually but a transparent overlay layer remains and blocks clicks. `role="dialog"` remains in the DOM after the modal visually closes.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: ModeModal — backdrop click closes the modal
BLOCK: 4
CATEGORY: ModeModal
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173 and submit a valid URL to open the ModeModal
2. When the modal is open, click on the dark backdrop area outside and away from the modal card (click in a corner of the screen far from the card)
3. Confirm the modal closes
4. Confirm no overlay layer remains
   PASS: Clicking the backdrop outside the card closes the ModeModal completely. The overlay is removed. Page is fully interactive after closing.
   FAIL: Clicking the backdrop does nothing. Clicking outside the modal card causes a console error. The modal closes but the backdrop overlay layer persists.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: ModeModal — clicking inside the card does NOT close the modal
BLOCK: 4
CATEGORY: ModeModal
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173 and submit a valid URL to open the ModeModal
2. When the modal is open, click directly on the modal card's heading text or body text (NOT on the choice buttons — click on descriptive text or whitespace inside the card)
3. Confirm the modal remains open
4. Click a second time on the card content — modal should still be open
   PASS: Clicking on content inside the modal card (text, padding, non-button areas) does not close the modal. The click event does not propagate to the backdrop handler. The modal remains fully open and functional.
   FAIL: Clicking anywhere inside the modal card closes it. Even clicking on the heading text or padding inside the card triggers the backdrop-close handler.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: ModeModal — URL is preserved in the input after closing the modal
BLOCK: 4
CATEGORY: ModeModal
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Type a valid URL into the input: `https://www.realtor.ca/real-estate/27619830/146-east-19th-street-hamilton`
3. Click "Analyze" to trigger the modal flow
4. When the ModeModal is open, close it using Escape (do not select a mode card)
5. After the modal closes, look at the URL input field
6. Confirm the URL you typed is still present in the input field — it has not been cleared
   PASS: After dismissing the ModeModal with Escape, the URL input still contains the URL that was submitted. The input field is not empty and not reset.
   FAIL: After closing the modal with Escape, the URL input is empty or has been reset to its placeholder text. The URL disappears from the input on modal close.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Province gate — BC URL triggers the province gate screen
BLOCK: 4
CATEGORY: Province Gate
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. In the URL input, type a BC listing URL — for example: `https://www.realtor.ca/real-estate/27034022/1234-main-street-vancouver-bc`
3. Click "Analyze"
4. Observe what happens — if a province gate / waitlist screen appears, proceed to the next steps. If the ModeModal appears instead (offering Investment/Personal Use), the province gate is not yet wired in this build.
5. NOTE: If ModeModal opens instead of a province gate, mark this test as N/A — the province detection requires the live scraper pipeline which is not connected in the current build. Record "N/A — province gate not yet wired" and move on.
6. If a province gate screen does appear, confirm it is a full-screen or prominent gate (not a small inline error message)
   PASS: A province gate / waitlist screen appears after submitting a BC URL, blocking access to the analysis and explaining that coverage is Ontario-only. OR, if not wired: ModeModal appears and this test is recorded as N/A.
   FAIL: The page crashes or throws a JavaScript error when a BC URL is submitted. A raw error object or stack trace is displayed. The URL validation incorrectly blocks the BC Realtor.ca URL before it even reaches the province check.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Province gate — correct province name is displayed
BLOCK: 4
CATEGORY: Province Gate
─────────────────────────────────────────
Steps:

1. This test is only applicable if the previous test ("BC URL triggers gate") showed a province gate screen.
2. If the previous test was N/A, mark this test as N/A as well.
3. If a province gate screen is visible, look for the province name in the gate UI
4. Confirm the text reads "British Columbia" (not "BC", not a generic "unsupported province" message)
   PASS: The province gate screen specifically names "British Columbia". The user is informed which province was detected, not just a generic "unsupported" message.
   FAIL: The gate says "BC" instead of "British Columbia". The gate shows a generic "unsupported province" message without naming the province. The province name is wrong (shows a different province).
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Province gate — email capture form works
BLOCK: 4
CATEGORY: Province Gate
─────────────────────────────────────────
Steps:

1. This test is only applicable if the province gate screen is reachable.
2. If the province gate is not reachable (previous tests were N/A), mark this as N/A.
3. On the province gate screen, find the email capture / waitlist sign-up form
4. Enter a valid email address: `test@example.com`
5. Click the submit button
6. Confirm a success message or confirmation appears
   PASS: Email input accepts text. Submitting a valid email shows a success confirmation or acknowledgement message. No page crash.
   FAIL: No email input is present on the province gate. Submitting the form crashes the page. No feedback is given after submission.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Province gate — empty email submission shows a validation error
BLOCK: 4
CATEGORY: Province Gate
─────────────────────────────────────────
Steps:

1. This test is only applicable if the province gate screen is reachable.
2. If the province gate is not reachable (previous tests were N/A), mark this as N/A.
3. On the province gate screen, find the email input — leave it empty
4. Click the submit button without entering any text
5. Confirm a validation error appears (not a page crash, not silent failure)
   PASS: Submitting an empty email field shows an inline validation error message near the input. The form does not submit successfully. No page crash.
   FAIL: Submitting an empty email shows no error — form appears to submit successfully. The page crashes on empty submission. A raw JavaScript error is displayed.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Error state — scraper failure renders cleanly
BLOCK: 4
CATEGORY: Error States
─────────────────────────────────────────
Steps:

1. This test requires the scraper error state to be triggerable. Without a live scraper connection, this state may not be reachable from the current build.
2. Attempt to trigger the error state using one of these methods:
   a. If React DevTools is available: open the Components tab, find the Hero component, change its `status` state to "error" and observe the render
   b. If the Hero accepts a URL that produces a known scraper error: submit a URL that looks valid but would fail (e.g., a realtor.ca URL for a listing ID that does not exist)
3. If neither method produces an error state, mark this test as N/A — scraper error state not yet triggerable in current build.
4. If an error state is visible, confirm: no raw JavaScript error object is shown, no stack trace is visible, the error message is human-readable and friendly
5. Confirm the error state offers a retry option (re-try button or "try again" link) OR a manual entry fallback path
   PASS: The error state shows a friendly, human-readable message (no stack trace, no raw Error object). A retry or manual entry option is present. OR, the state is not reachable and is recorded as N/A.
   FAIL: The error state displays a raw JavaScript stack trace or error object to the user. No recovery option (retry or manual entry) is offered. The page crashes instead of showing an error state.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Accessibility — axe scan on the landing page with no modal open
BLOCK: 4
CATEGORY: Accessibility
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Do not open any modal — ensure the page is in its default state
3. Scroll through the entire page once so all content is rendered
4. Open the axe DevTools extension panel
5. Click "Scan ALL of my page" (or equivalent full-page scan button)
6. Wait for the scan to complete
7. Note the total number of violations and their severity levels (critical, serious, moderate, minor)
8. For any violation found, expand it and note: which element is affected, which WCAG rule is violated, and the rule description
   PASS: Axe reports zero violations across all severity levels (critical, serious, moderate, and minor). The "Violations" count reads 0.
   FAIL: Axe reports one or more violations of any severity. Any critical or serious violation appears — these include: missing alt text, insufficient colour contrast, missing form labels, missing landmark roles, or invalid ARIA attributes.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Accessibility — axe scan with ModeModal open
BLOCK: 4
CATEGORY: Accessibility
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173
2. Submit a valid URL to open the ModeModal: `https://www.realtor.ca/real-estate/27619830/146-east-19th-street-hamilton`
3. When the ModeModal is open (do not close it), open the axe DevTools panel
4. Click "Scan ALL of my page"
5. Wait for the scan to complete
6. Note any new violations that did not appear on the base landing page scan
7. Specifically look for dialog-role violations, focus management violations, and ARIA attribute errors
   PASS: Axe reports zero violations with the ModeModal open. The dialog has proper role, aria-modal, and focus management that does not create axe violations. No new violations appear compared to the base scan.
   FAIL: Axe reports one or more violations specifically caused by the modal being open. Common modal violations: dialog element missing accessible name (`aria-labelledby` or `aria-label`), focus not managed correctly, backdrop elements not hidden from assistive technology.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Console errors — zero errors during the full landing page walkthrough
BLOCK: 4
CATEGORY: Console / Network
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173 in a fresh tab with DevTools open
2. In DevTools → Console tab, click the "Clear console" button (⊘ icon) to start fresh
3. Filter the Console to show "Errors" only (click the dropdown that says "All levels" and select "Errors")
4. Perform the following actions in sequence, watching the console after each:
   a. Page load — wait for full render
   b. Scroll through the entire page to the footer
   c. Toggle dark mode on and off
   d. Click Sign in → open SignInModal → close with Escape
   e. Type a valid URL → click Analyze → wait for ModeModal to open → dismiss with Escape
   f. Expand two FAQ items → collapse them
   g. Click the Yearly pricing toggle → click Monthly
5. After all actions, count the total number of red error entries in the Console
6. Note: React Router future flag warnings (yellow) are expected and are NOT failures — only red errors count
   PASS: Zero red error entries appear in the Console across all actions. React Router warnings (yellow, about v7_startTransition or v7_relativeSplatPath) are present but are not counted as failures.
   FAIL: Any red error entry appears in the Console at any point. An "Uncaught TypeError", "Uncaught ReferenceError", failed module import error, or React rendering error (Error Boundary message) appears.
   ─────────────────────────────────────────

─────────────────────────────────────────
TEST: Network errors — zero failed requests during normal flow
BLOCK: 4
CATEGORY: Console / Network
─────────────────────────────────────────
Steps:

1. Open http://localhost:5173 in a fresh tab with DevTools open
2. In DevTools → Network tab, click the "Clear" button to start fresh
3. Check "Preserve log" so requests persist across page interactions
4. Perform the same sequence of actions as the Console test:
   a. Hard-refresh the page (Ctrl+Shift+R)
   b. Scroll the full page
   c. Toggle dark mode
   d. Open and close SignInModal
   e. Submit a valid URL to open ModeModal and dismiss it
   f. Expand and collapse FAQ items
   g. Toggle pricing between monthly and yearly
5. In the Network tab, filter by "Status" — look for any request with a 4xx or 5xx status code (they appear in red)
6. Note: requests to external font services (fonts.googleapis.com, fonts.gstatic.com) returning 200 are fine. The calc engine (/health) is not called by the frontend in normal flow at this stage.
7. Count the number of failed (red) network requests
   PASS: Zero network requests return a 4xx or 5xx status code during the full walkthrough. All page assets (JS, CSS, fonts, images) load with 200 or appropriate cache status (304).
   FAIL: Any request returns 404 (missing asset), 500 (server error), or any other 4xx/5xx status. A JS chunk or CSS file fails to load (404 in the Network tab causes a broken page). Font requests fail with non-200 status.
   ─────────────────────────────────────────

---

## Results Table

Fill in each row with ✅ PASS, ❌ FAIL, or N/A after completing the test.
Add brief notes in the Notes column for any failures or N/A items.

```
BLOCK 3 — PR 1 SHARED COMPONENTS
  [ ] Typography + tokens
  [ ] Icons (all 17)
  [ ] Button (3 variants + hover + disabled + keyboard)
  [ ] Card
  [ ] Chip (with and without accent)
  [ ] VerdictPill (pass / caution / fail)
  [ ] SectionHead (with and without verdict)
  [ ] Nav (landing / report / account variants)
  [ ] Footer
  [ ] SignInModal (open / close / focus trap / keyboard)
  [ ] Accessibility — axe sweep

BLOCK 4 — PR 3 LANDING + MODAL
  [ ] Landing page structure (all sections present)
  [ ] URL validation — empty input
  [ ] URL validation — invalid URL
  [ ] URL validation — unsupported domain
  [ ] URL validation — US Zillow blocked
  [ ] URL validation — valid Realtor.ca for-sale
  [ ] URL validation — valid Zillow.ca
  [ ] URL validation — valid Realtor.ca for-rent
  [ ] URL validation — paste works same as typing
  [ ] Pricing toggle (monthly / annual)
  [ ] FAQ accordion (expand / collapse)
  [ ] ModeModal — for-sale opens with Investment + Personal Use
  [ ] ModeModal — Investment routes correctly
  [ ] ModeModal — Personal Use routes correctly
  [ ] ModeModal — for-rent opens with Tenant + Landlord
  [ ] ModeModal — Tenant routes without login
  [ ] ModeModal — Landlord routes correctly
  [ ] ModeModal — animation (backdrop fade + card translate + scale)
  [ ] ModeModal — Escape closes modal
  [ ] ModeModal — backdrop click closes modal
  [ ] ModeModal — card click does NOT close modal
  [ ] ModeModal — URL preserved in input after close
  [ ] Province gate — BC URL triggers gate
  [ ] Province gate — correct province name shown
  [ ] Province gate — email capture works
  [ ] Province gate — empty email shows error
  [ ] Error state — scraper failure renders cleanly
  [ ] Accessibility — axe on landing page
  [ ] Accessibility — axe with ModeModal open
  [ ] Console errors — zero during full walkthrough
  [ ] Network errors — zero failed requests
```

---

_Note: Three province gate tests and the scraper error state test may return N/A in the current build.
Province detection and scraper error states require the live scraper pipeline, which is not connected until
later PRs. If any of those four tests returns N/A, record it as N/A (not FAIL) in the results table._
