# Backlog — everything that is not done

> **Purpose:** the single list of what remains, after the 2026-09-12 reconciliation of every
> audit finding against `master` (see
> [`docs/product-audit/RECONCILIATION_2026-09-12.md`](product-audit/RECONCILIATION_2026-09-12.md)).
> Each row says what it is blocked on. Code-only items Claude can do without a decision are marked
> **[code]**; the rest need the owner.
>
> Owner rule (2026-09-12): **paywall/pricing and manual-testing work are lower priority.**
>
> Update in the same commit as the work. Delete rows when done.

---

## 1. Owner decisions

| Item                                    | Decision needed                                                                                                                                      | Why it matters                                                                                                      | Written up     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------- |
| **S-01 / S-03 / S-04 — scoring method** | Overlapping economics in the component weights; the display floor at 5; severe-gate constants documented as unsourced placeholders.                  | Spec §10 is the formula; changing it is a product decision and moves pinned regression values.                      | Audit S-\*     |
| **Guest policy (A-09)**                 | Spec §5: "a guest gets one free analysis with email capture". Build it, or leave guests uncounted? Should a guest report be claimable after sign-in? | Quota is per account; signing out is a bypass; guest reports are never owned so their flags can never be dismissed. | D-071          |
| **Break-even rent definition**          | Keep "current rent − current cash flow" or gross up vacancy to the break-even rent (≈ $140/mo higher on the calibration unit)?                       | Definitional; changes a pinned value either way.                                                                    | D-074          |
| **"True monthly cost" headline**        | ~24% of the personal headline is modelled (insurance, utilities, maintenance from a 1.5% assumption). Keep "true", or "estimated all-in"?            | Rows are labelled estimate/confirm; the headline word is not.                                                       | Counter-review |
| **Rent control (landlord vs tenant)**   | A landlord task must distinguish vacancy pricing from a sitting-tenant increase; needs an authoritative Ontario source for the guideline.            | Legal behaviour; not to be paraphrased from memory.                                                                 | Counter-review |
| **Stripe key mode** (lower priority)    | Live or test keys on the production API.                                                                                                             | Checkout answers 503 "paid plans not open yet" until price IDs exist.                                               | D-076          |

## 2. Credentials and dashboards (owner has access; Claude does not)

| Item                                                                             | What to do                                                                                                                                                                                                                                                                                   | Evidence                                                                                                            |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Custom SMTP for Supabase auth** — _do this first_                              | Supabase → Authentication → SMTP → Resend / Postmark / SES. The built-in mailer allows a few auth emails **per hour across all users**.                                                                                                                                                      | `429 email rate limit exceeded` within minutes of testing on 2026-09-12. Nobody but the owner can sign in reliably. |
| **Stripe price IDs on Railway** (lower priority)                                 | Railway → API → `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_TEAM`; `FRONTEND_URL=https://propscout.ca`.                                                                                                                                                                   | Upgrade → 500 on 2026-09-12; now an honest 503 (#46).                                                               |
| **Google OAuth** (owner: leave as is)                                            | Supabase → Providers → Google, with a Google Cloud OAuth client. Or hide the button.                                                                                                                                                                                                         | `provider is not enabled` in auth logs.                                                                             |
| **Railway calc-engine public domain**                                            | Remove the dead domain or re-attach one; nothing depends on it.                                                                                                                                                                                                                              | `…-e94c.up.railway.app` 502s; README corrected (#45).                                                               |
| **Google Places key on Railway** (`GOOGLE_PLACES_KEY`, Places API (New) enabled) | The tenant location section and the personal neighbourhood rows read "We couldn't pull nearby amenity distances" on every live report (20 Carlton St, 2026-09-14). The API returns `[]` when the key is unset; the routed walk/drive times (D-096) have nothing to route to until it is set. |
| **Repliers plan covering TRREB** (`REPLIERS_API_KEY`)                            | The free key returns US sample data only, so the personal report's comparable-sales section is always the honest empty state. Swapping is a key change; check the first Ontario response's field shapes before trusting it.                                                                  | `comparableSalesService.ts` header; D-014.                                                                          |
| **Vercel env hygiene**                                                           | `VITE_SUPABASE_ANON_KEY` stays a **Config** variable holding the `sb_publishable_…` key alone.                                                                                                                                                                                               | Sign-in was down until 2026-09-12 (D-075).                                                                          |

## 3. Migrations (human gate — Claude writes, owner applies)

| Item                                                                             | What it unlocks                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Apply `20260913_add_analyses_status.sql`** (`analyses.status`, `failure_code`) | J-06 / T-02. Code is merged (D-087) and runs either side of the migration: until it is applied a failed run still reads "pending" until the 3-minute bound; once applied the analyzing page says "failed" within one poll. Follow-ups after apply: J-10 cancel; J-11 reload guard (#52) as a row-level claim. Chip `task_0720c82b`. |
| **`20260701_add_schools_name_postal_unique.sql`**                                | Confirm applied — schools rendered live on 2026-09-12, so the table has rows; the unique index for `load-schools.mjs` re-runs is what this gates.                                                                                                                                                                                   |

## 4. Real data the owner has to supply

| Item                          | Needed                                                                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Golden dataset**            | Stale row corrected 2026-09-14: 96 cases exist (45 real, 51 synthetic) and the gate passes. More real full descriptions are welcome, not required. |
| **Founder-note copy** (PR10)  | 3–4 sentences in the owner's words for `FOUNDER_NOTE_BODY`. Nothing may be invented.                                                               |
| **Fraser Institute rankings** | `fraser_rank_pct` is null for every school; the source must be licensed/loaded before display.                                                     |

## 5. Code-only, not yet done **[code]**

Ordered by how much a user would notice.

| Item | Notes |
| ---- | ----- |

## 6. Paywall / pricing (lower priority per owner)

Controls and claims were made honest on 2026-09-13 (#71, D-091): every pricing CTA does what it
says or says why it cannot; unbuilt features carry a "planned" tag; "Talk to us" needs
`VITE_CONTACT_EMAIL` on Vercel (owner) and says "contact channel not open yet" until then.
What remains needs the owner: Stripe price IDs (§2), and the decision to build or drop the
planned rows (portfolio tracker, white-label PDF, bulk analysis, seats, API access).

## 7. Manual testing (lower priority per owner)

Not yet done: Stripe checkout end to end (blocked on price IDs); **landlord value input on
production** (built and verified through the local API against live reports on 2026-09-15,
D-107 — the production API deploys with #87); PDF export on production (needs a Pro account); mobile on a real device;
scraper-fail state live (needs a listing Realtor.ca will not serve).

Nightly rental-comps job confirmed running on 2026-09-15: live reports carry comps last seen 2026-09-13/14 from Kijiji (Toronto) and Rentals.ca + PadMapper (Ottawa).

Verified live on 2026-09-14: non-Ontario address → province gate; US URL → "not a usable link"; rural address (Bancroft) → proxy rent, estimated tax and default vacancy all labelled, and §03 now stays with a finding (D-101).

Verified live on 2026-09-12 and not needing a repeat: address path, Realtor.ca scrape, investor /
tenant / personal reports with independent recomputation, magic-link sign-in, attribution,
owner-only dismissal, stranger share-link view, guest report ownership, presets against the live
rate, Toronto LTT, real maps, schools, SunScout obstruction, 60-comp rent band.

## 8. Roadmap from the report audits (not defects)

From the four per-report audits' "field to work on" columns, grouped. None started.

- **Comparables:** individual comp rows shipped (#79, D-099 — rent, beds, sqft, FSA, distance,
  source, seen date; no address). Still to do: map them; weight by building/type/size/recency;
  and the original wording — return sanitized individual comp rows (source, date, location, beds, sqft,
  distance, similarity) for rent; map them; weight by building/type/size/recency; licensed Ontario
  sold-sales feed for personal FMV (blocked on a provider decision).
- **Provenance:** field-level badges (listing says / you entered / calculated / assumed as of),
  extraction confidence, scrape timestamps, geocoder match type.
- **Schools:** attendance-boundary polygons, grades, Fraser data (pedestrian routing shipped —
  #80, D-100).
- **Location:** routed walking/driving times shipped (#76, D-096); transit times would need a
  transit routing source.
- **Financing:** rate provenance/date, fixed vs variable, CMHC rules, renewal scenarios, saved
  side-by-side cases; personal-report financing controls.
- **Checklists:** notes, owners, deadlines, attachments (ticks are kept per browser since #75,
  D-095; account-side storage would need a table).
- **SunScout:** facade is now labelled assumed vs set-by-you and persists with the figures
  (#78, D-098); floor confirmation still to do (needs a floor input in the pipeline).
- **Equity build:** flat/conservative/stress scenarios with selling costs, tax, capex.
- **STR:** dated rules snapshot with municipal citations until an official source exists.
- **Landlord:** verified rent-control guidance; mortgage balance / rate inputs and an
  owned-outright path (engine: DSCR not applicable on zero debt, CoC on full value — D-107);
  a pricing-health score once the comps table has months of DOM / trend history.
