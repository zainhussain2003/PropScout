# PR7 Chrome UI Test Checklist

## Paywall · Account · Auth Stubs · Error States — Manual Browser Tests

**Generated:** 2026-05-30
**Branch:** feat/pr6-personal-landlord
**Total tests:** 105
**Browser:** Chrome (latest stable)
**Dev server:** `npm run dev --workspace=apps/web` → `http://localhost:5173`

**Pages under test:**

| Route                         | Component                | Notes                             |
| ----------------------------- | ------------------------ | --------------------------------- |
| `/account`                    | AccountPage              | All 4 tab views                   |
| `/account?view=saved`         | AccountPage              |                                   |
| `/account?view=profile`       | AccountPage              |                                   |
| `/account?view=plan`          | AccountPage              |                                   |
| `/account?view=notifications` | AccountPage              |                                   |
| `/auth/confirm`               | MagicLinkConfirmedPage   |                                   |
| `/auth/reset`                 | PasswordResetRequestPage |                                   |
| `/auth/reset/confirm`         | PasswordResetConfirmPage |                                   |
| `/auth/verified`              | EmailVerifiedPage        |                                   |
| `/welcome-to-pro`             | StripeWelcomePage        |                                   |
| `/checkout/cancelled`         | StripeCancelledPage      |                                   |
| `/[any unknown path]`         | NotFoundPage             | Catch-all                         |
| `/investor-report`            | InvestorReport           | Paywall test — MOCK_TIER = 'free' |
| `/tenant-report`              | TenantReport             | Paywall test — MOCK_TIER = 'free' |
| `/personal-report`            | PersonalBuyerPage        | Paywall test — MOCK_TIER = 'free' |
| `/landlord-report`            | LandlordPage             | Paywall test — MOCK_TIER = 'free' |

**Pre-test:** DevTools → Application → Clear Storage → Hard reload (Ctrl+Shift+R)

> ⚠ **Port dependency:** All TCs require the Vite dev server running on **port 5173**.
> If another process occupies 5173, Vite will step to 5174 and all URLs must be updated.

> ⚠ **MOCK_TIER:** Report route TCs in Blocks 2–4 depend on `MOCK_TIER = 'free'` being set
> in `apps/web/src/App.tsx`. This is the current default — do not change it before
> running these blocks.

> ⚠ **MANUAL TRIGGER REQUIRED:** TCs marked with this flag cannot be triggered through
> normal navigation. They require a temporary code change or a browser console call.
> Mark as BLOCKED if the trigger is unavailable in the current build.

> ⚠ **CONDITIONAL:** TCs marked with this flag depend on mock data, backend services,
> or UI states not wired in the current MVP build. Skip with BLOCKED if unavailable.

---

## Block 1 — Route Smoke Tests

_Navigate to each route; confirm the page loads without a white screen or red console errors._

[ ] TC-PR7-001 Start dev server and open `http://localhost:5173/account` in Chrome (latest)
Expected: AccountPage loads within 3 s; DevTools Console shows zero red errors;
no 404 for fonts, CSS, or JS chunks; "Saved analyses" or equivalent heading visible
| PASS | FAIL | NOTES |

[ ] TC-PR7-002 Navigate to `http://localhost:5173/account?view=saved`
Expected: AccountPage loads; the Saved Analyses tab view is the active view;
sidebar item for "Saved" is highlighted; no white screen; zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR7-003 Navigate to `http://localhost:5173/account?view=profile`
Expected: AccountPage loads; the Profile tab view is the active view;
a name input field (or profile form) is visible; zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR7-004 Navigate to `http://localhost:5173/account?view=plan`
Expected: AccountPage loads; the Plan tab view is active; a plan banner
(free tier dark card or pro banner) is visible; zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR7-005 Navigate to `http://localhost:5173/account?view=notifications`
Expected: AccountPage loads; the Notifications tab view is active; at least one
toggle switch is visible; zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR7-006 Navigate to `http://localhost:5173/auth/confirm`
Expected: MagicLinkConfirmedPage loads; a centered card with icon halo renders;
a serif headline is visible; zero red console errors; no broken layout
| PASS | FAIL | NOTES |

[ ] TC-PR7-007 Navigate to `http://localhost:5173/auth/reset`
Expected: PasswordResetRequestPage loads; a centered card with icon halo renders;
an email input and a submit button are present; zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR7-008 Navigate to `http://localhost:5173/auth/reset/confirm`
Expected: PasswordResetConfirmPage loads; a centered card with icon halo renders;
two password input fields are present; zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR7-009 Navigate to `http://localhost:5173/auth/verified`
Expected: EmailVerifiedPage loads; a centered card with icon halo renders;
a serif headline indicating email verification success is visible;
zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR7-010 Navigate to `http://localhost:5173/welcome-to-pro`
Expected: StripeWelcomePage loads; a centered card with icon halo renders;
a serif headline congratulating the user on upgrading is visible;
zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR7-011 Navigate to `http://localhost:5173/checkout/cancelled`
Expected: StripeCancelledPage loads; a centered card with icon halo renders;
a serif headline indicating the checkout was cancelled is visible;
zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR7-012 Navigate to `http://localhost:5173/nonsense-route-404`
Expected: NotFoundPage (catch-all `*` route) loads; "Nothing here." (or equivalent
404 heading) is visible; no white screen; zero red console errors; the page does
not show a React error boundary
| PASS | FAIL | NOTES |

---

## Block 2 — Paywall Components on Reports

_Requires `MOCK_TIER = 'free'` in `App.tsx` (current default). Run with dev server on
`localhost:5173`._

**Investor report — `/investor-report`**

[ ] TC-PR7-013 Open `/investor-report`; inspect for the blurred verdict element
Expected: In DevTools → Elements, search for `data-testid="verdict-blur"`;
the element is present in the DOM; the TruncatedVerdict component is rendered
instead of the full AIVerdictBlock
| PASS | FAIL | NOTES |

[ ] TC-PR7-014 On `/investor-report`, read the unlock strip below the blurred paragraph
Expected: A button or strip labelled "Unlock full verdict" (or equivalent unlock
CTA) is visible below the blurred paragraph; it is not hidden; it uses accent
colour or styling to draw attention
| PASS | FAIL | NOTES |

[ ] TC-PR7-015 On `/investor-report`, inspect the "Save" button in the ReportNav bar
Expected: The Save action in the Nav bar renders as a LockedButton; a "Pro" badge
(small pill) is visible on or beside the button; a lock SVG icon is present;
the button does not say "Save to account" in plain text
| PASS | FAIL | NOTES |

[ ] TC-PR7-016 On `/investor-report`, click the Save LockedButton in the Nav bar
Expected: The UpgradeModal slides in or fades in; it is visible over the report;
the report content is visible but dimmed behind the backdrop; the page does
not navigate away
| PASS | FAIL | NOTES |

**Tenant report — `/tenant-report`**

[ ] TC-PR7-017 Open `/tenant-report`; inspect for the blurred verdict element
Expected: `data-testid="verdict-blur"` is present in the DOM; TruncatedVerdict
is rendered in place of the full AIVerdictBlock; the full-text verdict paragraph
is not visible (it is blurred/hidden)
| PASS | FAIL | NOTES |

[ ] TC-PR7-018 On `/tenant-report`, read the unlock strip
Expected: "Unlock full verdict" (or equivalent) unlock CTA is visible below the
blurred paragraph in the TruncatedVerdict block
| PASS | FAIL | NOTES |

[ ] TC-PR7-019 On `/tenant-report`, inspect the Nav bar Save button
Expected: Save LockedButton with "Pro" badge and lock SVG is present in
ReportNav; clicking it opens UpgradeModal (do not close yet)
| PASS | FAIL | NOTES |

[ ] TC-PR7-020 On `/tenant-report`, locate the PDF LockedButton in the property hero / action bar
Expected: A LockedButton labelled "PDF" (or "Download PDF") with a lock icon and
"Pro" badge is present in the hero area or action bar of the tenant report;
it is distinct from the Save button
| PASS | FAIL | NOTES |

[ ] TC-PR7-021 On `/tenant-report`, click the PDF LockedButton
Expected: UpgradeModal opens; it does not navigate away; the modal is the
pdf-feature variant (headline is specific to PDF access, not generic)
| PASS | FAIL | NOTES |

**Personal buyer report — `/personal-report`**

[ ] TC-PR7-022 Open `/personal-report`; inspect for the blurred verdict element
Expected: `data-testid="verdict-blur"` is present in the DOM; the TruncatedVerdict
block renders instead of the full verdict card
| PASS | FAIL | NOTES |

[ ] TC-PR7-023 On `/personal-report`, read the unlock strip
Expected: "Unlock full verdict" (or equivalent) is visible below the blurred
paragraph
| PASS | FAIL | NOTES |

[ ] TC-PR7-024 On `/personal-report`, locate the PDF LockedButton in the checklist section
Expected: A LockedButton for PDF is present in the checklist / confirmation
section of the personal buyer report; it shows a lock icon and "Pro" badge;
it is not the same element as the Nav Save button
| PASS | FAIL | NOTES |

[ ] TC-PR7-025 On `/personal-report`, click the PDF LockedButton
Expected: UpgradeModal opens over the report; no page navigation; modal is
the pdf-feature variant
| PASS | FAIL | NOTES |

**Landlord report — `/landlord-report`**

[ ] TC-PR7-026 Open `/landlord-report`; inspect for the blurred verdict element
Expected: `data-testid="verdict-blur"` is present in the DOM; TruncatedVerdict
renders instead of LandlordVerdictHero full content
| PASS | FAIL | NOTES |

[ ] TC-PR7-027 On `/landlord-report`, read the unlock strip
Expected: "Unlock full verdict" (or equivalent) CTA is visible below the blurred
paragraph
| PASS | FAIL | NOTES |

[ ] TC-PR7-028 On `/landlord-report`, locate the PDF LockedButton in the checklist section
Expected: LockedButton for PDF with lock icon and "Pro" badge is present in the
checklist section of the landlord report
| PASS | FAIL | NOTES |

[ ] TC-PR7-029 On `/landlord-report`, click the PDF LockedButton
Expected: UpgradeModal opens over the report; no page navigation; modal is the
pdf-feature variant
| PASS | FAIL | NOTES |

**Cross-report verification**

[ ] TC-PR7-030 Open all 4 report pages in sequence; inspect DevTools for the full verdict text
Expected: On all 4 pages, searching the DOM (Ctrl+F in Elements panel) for
the full AIVerdictBlock eyebrow text "Scout AI" returns NO match — the full
block is replaced by TruncatedVerdict; confirm data-testid="verdict-blur" exists
on all 4 pages
| PASS | FAIL | NOTES |

---

## Block 3 — UpgradeModal (All Variants)

_Trigger each variant by clicking the relevant LockedButton as noted. Close and reopen
between variants to test each in isolation._

**pdf variant** — trigger via PDF LockedButton on `/tenant-report` or `/personal-report`

[ ] TC-PR7-031 Click PDF LockedButton; read the modal headline
Expected: The UpgradeModal is open; the headline is specific to PDF access
(e.g., "Download your full report as a PDF" or similar feature-specific copy);
it is NOT the generic "Unlock everything" headline
| PASS | FAIL | NOTES |

[ ] TC-PR7-032 With pdf variant open, read the pricing line
Expected: "$10/mo" (or "$10 / mo") is visible in the modal; the price is not
hidden, not zero, and not a placeholder
| PASS | FAIL | NOTES |

[ ] TC-PR7-033 With pdf variant open, click "Not right now"
Expected: Modal closes; no UpgradeModal element remains in the viewport;
the report content is visible and unchanged; no navigation occurred
| PASS | FAIL | NOTES |

**portfolio variant** — trigger via Save LockedButton in ReportNav on any report page

[ ] TC-PR7-034 Click Nav Save LockedButton; read the modal headline
Expected: The UpgradeModal is open; the headline is specific to saving / portfolio
access (e.g., "Save analyses to your account" or similar); it is NOT the pdf
headline
| PASS | FAIL | NOTES |

[ ] TC-PR7-035 With portfolio variant open, read the pricing line
Expected: "$10/mo" is visible in the modal
| PASS | FAIL | NOTES |

[ ] TC-PR7-036 With portfolio variant open, click "Not right now"
Expected: Modal closes; report is still visible; no navigation
| PASS | FAIL | NOTES |

**verdict variant** — trigger via "Unlock full verdict" button in TruncatedVerdict

[ ] TC-PR7-037 Click the "Unlock full verdict" strip; read the modal headline
Expected: The UpgradeModal is open; the headline is specific to unlocking the
full AI verdict (e.g., "Read the full Scout AI verdict" or similar); distinct
from pdf and portfolio headlines
| PASS | FAIL | NOTES |

[ ] TC-PR7-038 With verdict variant open, read the pricing line
Expected: "$10/mo" is visible in the modal
| PASS | FAIL | NOTES |

[ ] TC-PR7-039 With verdict variant open, click "Not right now"
Expected: Modal closes; TruncatedVerdict is still visible; report is unchanged;
no navigation
| PASS | FAIL | NOTES |

**generic variant** — MANUAL TRIGGER REQUIRED
_Trigger by temporarily calling `openUpgradeModal('generic')` in the browser console
via React DevTools or a temporary button. If unavailable, mark BLOCKED._

[ ] TC-PR7-040 Trigger generic variant; read the modal headline
Expected: The UpgradeModal is open; a generic Pro upgrade headline is visible
(e.g., "Upgrade to Investor Pro" or equivalent); the page behind is dimmed;
`data-testid="upgrade-modal-backdrop"` is present in the DOM
| PASS | FAIL | NOTES |

[ ] TC-PR7-041 With generic variant open, read the pricing line
Expected: "$10/mo" is visible in the modal; "cancel anytime" or equivalent
commitment-reducing text is also visible
| PASS | FAIL | NOTES |

[ ] TC-PR7-042 With generic variant open, click "Not right now"
Expected: Modal closes; report visible behind; no navigation; no console errors
| PASS | FAIL | NOTES |

**General modal behaviour**

[ ] TC-PR7-043 Open any UpgradeModal variant; click the backdrop (outside the card)
Expected: Clicking anywhere on the dimmed backdrop (not on the modal card itself)
closes the modal; the report is visible again; no error; no navigation
| PASS | FAIL | NOTES |

[ ] TC-PR7-044 Open any UpgradeModal variant; press the Escape key
Expected: Modal closes immediately on Escape; report is visible; no error;
no navigation; works regardless of which element inside the modal has focus
| PASS | FAIL | NOTES |

[ ] TC-PR7-045 After closing a modal (any method), confirm it is gone
Expected: In DevTools → Elements, `data-testid="upgrade-modal-backdrop"` is no
longer in the DOM (or has `display: none`); no lingering backdrop overlay
| PASS | FAIL | NOTES |

[ ] TC-PR7-046 After closing the modal, scroll and interact with the report
Expected: The report page is fully interactive; scrolling, hovering, and
clicking other elements all work normally; no CSS overflow or pointer-events
issue left by the modal
| PASS | FAIL | NOTES |

---

## Block 4 — HardLimitGate

_MANUAL TRIGGER REQUIRED for all TCs in this block. Trigger by temporarily calling
`openHardGate()` via the browser console (if wired to `window`) or by temporarily
adding a trigger button in `App.tsx`. Mark as BLOCKED if trigger is unavailable._

[ ] TC-PR7-047 Trigger HardLimitGate; confirm full-screen overlay renders
Expected: A fixed full-screen overlay appears covering the entire viewport;
no report content is visible behind it; the page does not scroll; the overlay
has a dark or ink-toned background; no red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR7-048 With HardLimitGate open, count the progress dots
Expected: Exactly `monthlyLimit` filled dots are visible in the usage progress
bar (3 filled dots if `used=3, monthlyLimit=3`); inspect with DevTools to
confirm each dot has `data-testid="hard-limit-dot"` attribute
| PASS | FAIL | NOTES |

[ ] TC-PR7-049 With HardLimitGate open, read the reset date text
Expected: A text string indicating when the limit resets is visible (e.g.,
"Resets in 32 days" or "Resets Jan 15"); the text is legible against
the gate background
| PASS | FAIL | NOTES |

[ ] TC-PR7-050 With HardLimitGate open, read the upgrade price
Expected: "$10" (or "$10/mo") is visible in the gate; the Upgrade CTA references
this price; no placeholder text like "N/A" or "$0" appears
| PASS | FAIL | NOTES |

[ ] TC-PR7-051 With HardLimitGate open, locate the "Upgrade now" button
Expected: A primary button labelled "Upgrade now" (or similar) is present and
visible; it uses the accent/terracotta background (var(--accent)); it does not
close the gate — clicking it would navigate to billing (stub OK for MVP)
| PASS | FAIL | NOTES |

[ ] TC-PR7-052 With HardLimitGate open, click "Wait it out"
Expected: The HardLimitGate overlay closes; the report or previous page is
visible again; no console errors; no page navigation to another route
| PASS | FAIL | NOTES |

[ ] TC-PR7-053 After "Wait it out" closes the gate, scroll and interact with the page
Expected: The page is fully interactive; no residual overlay or pointer-events
block; scrolling and clicking elements work normally
| PASS | FAIL | NOTES |

---

## Block 5 — Account Dashboard

_Navigate to `/account` (or each `?view=` variant). The AccountPage uses `MOCK_TIER`
and a hardcoded fixture (Marcus Reilly) from the stub component._

**Saved tab**

[ ] TC-PR7-054 Open `/account?view=saved`; count the analysis cards
Expected: Exactly 8 analysis cards (report tiles) are visible in the saved
analyses grid; each card shows an address, report type chip, and a date
| PASS | FAIL | NOTES |

[ ] TC-PR7-055 Click the "Investment" filter chip in the saved analyses view
Expected: The grid filters to show only investor-type analysis cards; any tenant,
personal, or landlord cards are hidden; the chip is visually selected (accent
border or filled background)
| PASS | FAIL | NOTES |

[ ] TC-PR7-056 Type an address fragment into the search input (e.g. "Harbour")
Expected: The displayed cards filter to show only entries whose address contains
"Harbour"; cards without the search term are removed from the visible grid;
clearing the input restores all cards
| PASS | FAIL | NOTES |

**Profile tab**

[ ] TC-PR7-057 Navigate to `/account?view=profile`; read the name field
Expected: The name input (or editable field) is pre-filled with "Marcus Reilly";
the field label ("Name" or "Full name") is visible; the field is not empty
| PASS | FAIL | NOTES |

[ ] TC-PR7-058 On Profile tab, read the email field
Expected: An email input or display field shows an email address (stub value);
it is labelled "Email"; the field is present and not empty
| PASS | FAIL | NOTES |

[ ] TC-PR7-059 On Profile tab, scroll to the Danger Zone section
Expected: A section labelled "Danger zone" (or "Delete account") is visible at
the bottom of the Profile tab; a destructive action button (e.g., "Delete account")
is present with a warning style (fail/clay tone or bordered)
| PASS | FAIL | NOTES |

**Plan tab**

[ ] TC-PR7-060 Navigate to `/account?view=plan`; confirm the free-tier banner
Expected: A dark banner or card (using var(--ink) or near-black background)
is visible indicating the current Free plan; "Free" or "Free tier" text is
present; the banner is distinct from the rest of the page
| PASS | FAIL | NOTES |

[ ] TC-PR7-061 On Plan tab, read the plan label and price line
Expected: The current plan name ("Free", "Investor Pro", etc.) and its price
or "$0/mo" are visible; "Upgrade to Investor Pro" CTA (or equivalent) is
present if on the free tier
| PASS | FAIL | NOTES |

**Notifications tab**

[ ] TC-PR7-062 Navigate to `/account?view=notifications`; inspect the toggles
Expected: At least 2 toggle switches are rendered; each has a visible label
(e.g., "Price drop alerts", "New comps available"); all toggles render without
broken layout
| PASS | FAIL | NOTES |

[ ] TC-PR7-063 Click one of the notification toggles
Expected: The toggle switches from off to on (or on to off); the visual state
changes (thumb position shifts, background colour changes); no console error;
the other toggles are unaffected
| PASS | FAIL | NOTES |

**Sidebar navigation**

[ ] TC-PR7-064 On any Account view, observe the sidebar
Expected: The currently active tab item is visually highlighted (filled background,
accent border, or bold text); the other sidebar items are in a muted/inactive
state; the active highlight matches the `?view=` query param in the URL
| PASS | FAIL | NOTES |

[ ] TC-PR7-065 Inspect the tier pill at the bottom of the sidebar
Expected: A small pill or badge at the bottom of the sidebar (above the avatar
or below the nav items) shows the current plan label — "Free" or "Investor Pro";
it uses the appropriate colour token (pass/sage for Pro, ink/muted for Free)
| PASS | FAIL | NOTES |

**Top navigation bar (AccountTopNav)**

[ ] TC-PR7-066 Inspect the Wordmark in the Account top nav
Expected: The PropScout wordmark renders with "Prop" in Geist regular weight
and "Scout" in Instrument Serif italic; the glyph/ScoutMark is present;
the wordmark navigates to `/` when clicked
| PASS | FAIL | NOTES |

[ ] TC-PR7-067 Click the dark mode toggle in the Account top nav
Expected: `<html>` gains `data-theme="dark"`; the AccountPage background, sidebar,
and all four tab views switch to dark tokens; text remains legible; no element
retains a hardcoded light colour
| PASS | FAIL | NOTES |

[ ] TC-PR7-068 Inspect the user pill in the Account top nav
Expected: A pill or avatar element shows "MR" (initials for Marcus Reilly) and
"Marcus" text; the initials are in a circle or rounded container; the full name
"Marcus Reilly" is not necessarily visible but "Marcus" is
| PASS | FAIL | NOTES |

**Tab switching**

[ ] TC-PR7-069 Click each of the four sidebar items in sequence (Saved, Profile, Plan, Notifications)
Expected: Each click switches the visible content view without a full page
reload; the URL query string updates to the corresponding `?view=` param;
no loading spinner appears between tab switches
| PASS | FAIL | NOTES |

[ ] TC-PR7-070 After switching tabs, press the browser Back button
Expected: The URL changes back to the previous `?view=` param; the correct
tab view is shown again; the sidebar highlight matches; no white screen or
React error
| PASS | FAIL | NOTES |

[ ] TC-PR7-071 Open DevTools → Console; clear it; click through all four tabs
Expected: After visiting all four tabs, the console shows zero red errors;
no "Cannot read properties of undefined" or React render exceptions
| PASS | FAIL | NOTES |

---

## Block 6 — Auth Stub Pages

_All stub pages share the same layout pattern: icon halo + serif headline + CTA button.
Test each for correct content, icon presence, and no console errors._

[ ] TC-PR7-072 Open `/auth/reset` — PasswordResetRequestPage
Expected: A centered card renders with a circular icon halo (glowing ring around
the icon); a serif headline requests the user's email for a reset link; an email
input and a "Send reset link" (or equivalent) button are present; zero red
console errors
| PASS | FAIL | NOTES |

[ ] TC-PR7-073 Open `/auth/reset/confirm` — PasswordResetConfirmPage
Expected: A centered card with icon halo; a serif headline prompts for a new
password; two password inputs ("New password" and "Confirm password") are present;
a submit button is visible; zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR7-074 Open `/auth/verified` — EmailVerifiedPage
Expected: A centered card with icon halo; a serif headline confirms email
verification (e.g., "Email verified."); a primary CTA button labelled
"Analyze a listing" (or equivalent) is present; zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR7-075 Open `/auth/confirm` — MagicLinkConfirmedPage
Expected: A centered card with icon halo; a serif headline confirms the magic
link sign-in (e.g., "You're signed in." or "Welcome back."); a primary CTA
button labelled "Go to dashboard" (or equivalent) is present; zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR7-076 Open `/welcome-to-pro` — StripeWelcomePage
Expected: A centered card with icon halo; a serif headline congratulates the
user on upgrading (e.g., "You're on Investor Pro."); a primary CTA button
labelled "Start analyzing" (or equivalent) is present; zero red console errors
| PASS | FAIL | NOTES |

[ ] TC-PR7-077 Open `/checkout/cancelled` — StripeCancelledPage
Expected: A centered card with icon halo; a serif headline acknowledges the
cancellation (e.g., "Checkout cancelled."); a primary CTA button labelled
"Try again" (or "See plans") is present; zero red console errors
| PASS | FAIL | NOTES |

**Auth stub interactions**

[ ] TC-PR7-078 On `/auth/reset`, type an email address and click "Send reset link"
Expected: After submitting, the form input disappears and a confirmation state
appears (e.g., "Reset link sent." or "Check your email"); the original email
field is no longer visible; no console error
| PASS | FAIL | NOTES |

[ ] TC-PR7-079 On `/auth/reset/confirm`, type mismatched passwords and click submit
Expected: An inline error message appears (e.g., "Passwords don't match."); the
form does not transition to a success state; the error uses a fail/clay colour
or is otherwise visually distinct; no console error
| PASS | FAIL | NOTES |

[ ] TC-PR7-080 On `/auth/reset/confirm`, type matching passwords and click submit
Expected: The form transitions to a success state (e.g., "Password updated." or
similar confirmation message); the password inputs disappear; a CTA button to
sign in or go to dashboard appears; no console error
| PASS | FAIL | NOTES |

[ ] TC-PR7-081 Check all 6 stub pages for emoji characters
Expected: In DevTools Console on each stub page, run
`document.body.innerText.match(/\p{Emoji_Presentation}/gu)` — result must be
`null` on all 6 pages; all icons are SVG line icons from the `<Icon>` component
| PASS | FAIL | NOTES |

---

## Block 7 — Error and State Components

[ ] TC-PR7-082 Navigate to `/nonsense-route-404`; read the page content
Expected: NotFoundPage renders; the heading "Nothing here." (or equivalent 404
heading) is visible; a "Back to home" button is present; clicking it navigates
to `/`; no React error boundary message appears
| PASS | FAIL | NOTES |

[ ] TC-PR7-083 Inspect the icon in NotFoundPage
Expected: The 404 icon is a line-icon SVG (from the `<Icon>` component); no
emoji character is used; the icon renders in the correct halo container
| PASS | FAIL | NOTES |

[ ] TC-PR7-084 MANUAL TRIGGER REQUIRED — BlockState tone variants (fail vs pass)
To trigger: temporarily render BlockState directly in a route or via
React DevTools by passing `tone="fail"`, `tone="pass"`, and `tone="caution"` props.
Expected: The icon colour differs between tones — fail uses var(--fail) clay,
pass uses var(--pass) sage, caution uses var(--caution) amber; inspect
computed colour in DevTools → Accessibility or Styles panel
| PASS | FAIL | NOTES |

[ ] TC-PR7-085 CONDITIONAL — ProvinceGate email form submission (requires route access)
If ProvinceGate is accessible via a route or test harness in the current build:
navigate to it; type an email in the waitlist form; click "Join waitlist" (or
equivalent).
Expected: After submit, the confirmation state appears immediately (no re-render
required); the email input field is no longer visible; confirmation text is shown;
no console error
| PASS | FAIL | NOTES |

[ ] TC-PR7-086 CONDITIONAL — NoCompsInlineState visible in investor / landlord report
Requires mock data with zero rental comps.
Expected: If triggered, the NoCompsInlineState block is visible within the report
with the "Low confidence" label and "limited rental comps" explanation text;
"Report an issue" link is present
| PASS | FAIL | NOTES |

---

## Block 8 — Dark Mode Across New Pages

[ ] TC-PR7-087 AccountPage: click dark mode toggle; navigate through all four tabs
Expected: With `data-theme="dark"` on `<html>`, the Saved, Profile, Plan, and
Notifications tab views all render correctly in dark mode; no element shows
hardcoded light colours; cards, sidebars, and inputs all respond to the theme
| PASS | FAIL | NOTES |

[ ] TC-PR7-088 Auth stub pages: click dark mode toggle on any auth stub page
Expected: If a dark mode toggle is present on the auth stub page, clicking it
switches the page to dark tokens and back; if no toggle is present, confirm
the light mode renders cleanly with correct contrast; no text disappears or
becomes unreadable
| PASS | FAIL | NOTES |

[ ] TC-PR7-089 UpgradeModal in dark mode: open modal while dark mode is active
Expected: With `data-theme="dark"` on `<html>`, the UpgradeModal card
background, headline, body text, and buttons all render with appropriate dark
tokens; no white-on-white or black-on-black contrast failures; the backdrop
is still visible as a dim overlay
| PASS | FAIL | NOTES |

[ ] TC-PR7-090 MANUAL TRIGGER REQUIRED — HardLimitGate in dark mode
Trigger HardLimitGate while dark mode is active.
Expected: The gate renders correctly in dark mode; the gate is designed as
a full-screen dark overlay by default, so confirm it looks correct in both
light and dark page modes — dots, text, and buttons must be legible against
the gate background in both cases
| PASS | FAIL | NOTES |

[ ] TC-PR7-091 UpgradeCard and ProBadge: inspect computed colours in dark mode
Expected: With `data-theme="dark"` active, the UpgradeCard background uses
dark token values (var(--surface) dark value); the ProBadge accent colour
remains terracotta (var(--accent)); no colour becomes illegible;
no element shows a raw hex colour in the Styles panel
| PASS | FAIL | NOTES |

---

## Block 9 — Design Token Compliance

[ ] TC-PR7-092 Inspect ProBadge computed colour in DevTools
Expected: Right-click the ProBadge pill → Inspect → Computed tab; the background
colour resolves to the value of `var(--accent)` (terracotta, approximately
`#D97757` in light mode); no raw hex literal appears as a direct CSS property
value in the component stylesheet
| PASS | FAIL | NOTES |

[ ] TC-PR7-093 Inspect the "Upgrade to Pro" button in UpgradeCard
Expected: The primary CTA button has `background: var(--accent)` (or resolves
to the accent terracotta value); it does not use a hardcoded hex background;
confirm via DevTools → Styles panel on the button element
| PASS | FAIL | NOTES |

[ ] TC-PR7-094 Hover over a LockedButton and inspect the hover state
Expected: On hover, the LockedButton border and text colour transition to
var(--accent) terracotta within 0.15s ease; the transition is smooth (not
instantaneous); no hardcoded hover colour in the component's inline styles
| PASS | FAIL | NOTES |

[ ] TC-PR7-095 Inspect typography on an auth stub page headline
Expected: Right-click the serif headline → Inspect → Computed → font-family;
the value resolves to "Instrument Serif"; body text resolves to "Geist";
any mono eyebrow or tag resolves to "Geist Mono"; no fallback fonts are
in use (meaning the Google Fonts load succeeded)
| PASS | FAIL | NOTES |

[ ] TC-PR7-096 Inspect HardLimitGate filled dots (MANUAL TRIGGER REQUIRED)
Expected: Trigger the HardLimitGate; right-click a filled dot → Inspect →
Computed → background-color; the colour resolves to the value of var(--accent);
it is not a hardcoded hex value; it matches the terracotta accent used elsewhere
| PASS | FAIL | NOTES |

---

## Block 10 — Modal Accessibility (UpgradeModal)

[ ] TC-PR7-097 Open UpgradeModal; Tab through interactive elements
Expected: Pressing Tab cycles focus through the interactive elements inside the
modal (e.g., Upgrade button, "Not right now" button, any links); focus does
NOT escape to elements on the report page behind the modal; at least 2 focusable
elements exist inside the modal
| PASS | FAIL | NOTES |

[ ] TC-PR7-098 Open UpgradeModal; press Shift+Tab to reverse-cycle
Expected: Shift+Tab reverse-cycles through modal elements; focus remains trapped
inside the modal; it does not skip back to the report content behind the backdrop;
the tab order wraps correctly at both ends
| PASS | FAIL | NOTES |

[ ] TC-PR7-099 Close UpgradeModal using "Not right now"; check focus destination
Expected: After the modal closes, keyboard focus returns to the LockedButton
that triggered the modal (not to the document body or an unrelated element);
confirm by checking which element has the `:focus` ring using DevTools →
Accessibility → Focus
| PASS | FAIL | NOTES |

[ ] TC-PR7-100 Open UpgradeModal; move focus to the modal body text; press Escape
Expected: Escape closes the modal even when a non-button element has focus
(tab to the body text area first, then press Escape); the modal disappears;
focus returns to the triggering LockedButton
| PASS | FAIL | NOTES |

---

## Block 11 — Navigation Integrity

[ ] TC-PR7-101 On `/welcome-to-pro`, click the primary "Start analyzing" CTA
Expected: The app navigates to `/` (the landing page or root route); no blank
screen; the home page or URL input renders; browser URL bar shows `http://localhost:5173/`
| PASS | FAIL | NOTES |

[ ] TC-PR7-102 On `/checkout/cancelled`, click the primary "Try again" CTA
Expected: The app navigates to `/account?view=plan` (the Plan tab of the account
page); the Plan tab is the active view; no blank screen; no console error
| PASS | FAIL | NOTES |

[ ] TC-PR7-103 On `/nonsense-route-404`, click "Back to home"
Expected: The app navigates to `/` (home); the browser URL bar updates;
no white screen; the NotFoundPage is no longer visible
| PASS | FAIL | NOTES |

[ ] TC-PR7-104 On `/auth/verified`, click the "Analyze a listing" (or equivalent) CTA
Expected: The app navigates to `/` (home); the EmailVerifiedPage is no longer
visible; the landing/home page renders correctly
| PASS | FAIL | NOTES |

[ ] TC-PR7-105 On `/auth/confirm`, click "Go to dashboard" (or equivalent) CTA
Expected: The app navigates to `/account` (the account dashboard); the
AccountPage renders with its default tab view; no console error
| PASS | FAIL | NOTES |

[ ] TC-PR7-106 After any navigation via a CTA button, press the browser Back button
Expected: The browser navigates back to the previous page correctly; the previous
page re-renders (or is restored from cache) without a broken history stack;
no `Cannot read properties of undefined` or React error in console
| PASS | FAIL | NOTES |

---

## Results Summary

| Block | Section                       | TCs     | Pass | Fail | Blocked |
| ----- | ----------------------------- | ------- | ---- | ---- | ------- |
| 1     | Route smoke tests             | 001–012 |      |      |         |
| 2     | Paywall components on reports | 013–030 |      |      |         |
| 3     | UpgradeModal (all variants)   | 031–046 |      |      |         |
| 4     | HardLimitGate                 | 047–053 |      |      |         |
| 5     | Account dashboard             | 054–071 |      |      |         |
| 6     | Auth stub pages               | 072–081 |      |      |         |
| 7     | Error and state components    | 082–086 |      |      |         |
| 8     | Dark mode across new pages    | 087–091 |      |      |         |
| 9     | Design token compliance       | 092–096 |      |      |         |
| 10    | Modal accessibility           | 097–100 |      |      |         |
| 11    | Navigation integrity          | 101–106 |      |      |         |
| —     | **TOTAL**                     | **106** |      |      |         |

**Tester:** ******\_\_\_\_****** **Date:** ******\_\_\_\_******

**Overall result:** [ ] PASS — all 106 TCs pass [ ] FAIL — see NOTES above

---

## Test Count Verification

| Block | Section                       | Count   |
| ----- | ----------------------------- | ------- |
| 1     | Route smoke tests             | 12      |
| 2     | Paywall components on reports | 18      |
| 3     | UpgradeModal (all variants)   | 16      |
| 4     | HardLimitGate                 | 7       |
| 5     | Account dashboard             | 18      |
| 6     | Auth stub pages               | 10      |
| 7     | Error and state components    | 5       |
| 8     | Dark mode across new pages    | 5       |
| 9     | Design token compliance       | 5       |
| 10    | Modal accessibility           | 4       |
| 11    | Navigation integrity          | 6       |
| —     | **Total**                     | **106** |

---

## TCs Requiring Manual Trigger or Backend Access

| TC                      | Type           | Description                                                         |
| ----------------------- | -------------- | ------------------------------------------------------------------- |
| TC-PR7-040 – TC-PR7-042 | MANUAL TRIGGER | generic UpgradeModal variant — no natural entry point in current UI |
| TC-PR7-047 – TC-PR7-053 | MANUAL TRIGGER | HardLimitGate — requires calling `openHardGate()` directly          |
| TC-PR7-084              | MANUAL TRIGGER | BlockState tone variants — no route exposes all tones in MVP        |
| TC-PR7-085              | CONDITIONAL    | ProvinceGate — no route in current App.tsx routes to it directly    |
| TC-PR7-086              | CONDITIONAL    | NoCompsInlineState — requires mock data with zero rental comps      |
| TC-PR7-090              | MANUAL TRIGGER | HardLimitGate in dark mode — same trigger as TC-PR7-047 block       |
| TC-PR7-096              | MANUAL TRIGGER | HardLimitGate dot token check — same trigger required               |

---

## Deferred to PR8

The following test areas are deferred to the PR8 (mobile responsive pass + final QA) cycle:

| Deferred area                                                                          | Reason                                                                                                  |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Mobile responsive layout for AccountPage (375px, 390px)                                | Mobile responsive pass is its own PR8 block; AccountPage has complex sidebar + tabs layout              |
| Mobile responsive layout for auth stub pages                                           | PR8 covers the full mobile pass for all pages added in PR7                                              |
| Mobile responsive layout for paywall components (UpgradeModal, HardLimitGate at 375px) | Modal overflow and scroll behaviour on small viewports deferred to PR8                                  |
| Full axe DevTools scan on all new pages                                                | a11y automated checks are in the PR7 test suite; full manual axe scan of all new routes deferred to PR8 |
| Real Stripe payment flow (checkout → webhook → tier upgrade)                           | Requires live Stripe test keys and backend webhook — deferred to integration testing phase              |
| Supabase auth flow (real magic link, real email)                                       | Requires live Supabase auth — stub pages only in PR7; live auth tested in integration phase             |
| ScraperPartialInlineState via real scraper partial data                                | Requires backend — deferred to backend integration testing                                              |

---

_Checklist version: PR7-v1 · Branch: feat/pr6-personal-landlord · Generated: 2026-05-30_
