# Backlog — what needs a person, a credential, or a decision

> **Purpose:** the work Claude cannot finish alone. Every row here is blocked on something
> outside the repo: an owner decision, a dashboard, a key, a migration gate, or real data.
> Code-only work goes through PRs and `docs/AUDIT_TRACKER.md`; this file is the rest.
>
> Rule from the owner (2026-09-12): **paywall/pricing and manual-testing work are lower
> priority.** Do the honest, code-only fixes first; these wait.
>
> Update in the same commit as the work. Delete rows when done; do not tick them.

---

## Owner decisions (nothing can proceed until decided)

| Item                                   | Decision needed                                                                                                                                                                        | Why it matters                                                                                                                                                                                        | Where it's written up  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **L-03 — what a landlord score means** | Is landlord mode _acquisition underwriting_ (today's investor score with a landlord label) or _operating / pricing health_ (needs its own method)?                                     | Live landlord traffic renders investor content. `LandlordPage` is now fixture-free and safe to route (#39), but routing it before this decision trades one wrong report for a different wrong report. | D-070, audit L-01/L-03 |
| **Guest policy**                       | Spec §5 says "a guest gets one free analysis with email capture". Build that, or leave guests uncounted?                                                                               | The free-tier quota (#40) is per account; signing out is a bypass. The IP rate limit is the only bound on guests.                                                                                     | D-071 known limits     |
| **Break-even rent definition**         | Keep "current rent − current cash flow" (self-consistent with the tile beside it) or gross up the vacancy allowance to the break-even rent (≈ $140/mo higher on the calibration unit)? | Definitional, not a bug; changes a pinned regression value either way.                                                                                                                                | D-074                  |
| **Stripe key mode**                    | Live or test keys on the production API?                                                                                                                                               | Lower priority per owner. Checkout currently answers 503 "paid plans not open yet" (#46).                                                                                                             | D-076                  |

## Credentials / dashboards (owner has access; Claude does not)

| Item                                                | What to do                                                                                                                                                                                                    | Status / evidence                                                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Custom SMTP for Supabase auth** — _do this first_ | Supabase → Authentication → SMTP Settings → Resend / Postmark / SES. Built-in mailer allows only a few auth emails **per hour across all users**.                                                             | Hit `429 email rate limit exceeded` within minutes of testing on 2026-09-12. Nobody but the owner can reliably sign in until this is done. |
| **Stripe price IDs on Railway** (lower priority)    | Railway → API service → variables: `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_TEAM` from the Stripe dashboard. Also `FRONTEND_URL=https://propscout.ca` for the success/cancel redirects. | "Upgrade" returned 500 on 2026-09-12 (secret key set, price ID missing). Now 503 with an honest message (#46).                             |
| **Google OAuth** (owner: leave as is for now)       | Supabase → Authentication → Providers → Google, with a Google Cloud OAuth client ID/secret. Or hide the button.                                                                                               | "Continue with Google" fails with `provider is not enabled` (auth logs, 2026-09-12).                                                       |
| **Railway calc-engine public domain**               | Either remove the dead public domain or re-attach one. Nothing depends on it — the API reaches the engine over Railway's private network.                                                                     | `propscout-production-e94c.up.railway.app` returns 502 on every path; README corrected (#45).                                              |
| **Vercel env hygiene**                              | Keep `VITE_SUPABASE_ANON_KEY` a **Config** variable holding the `sb_publishable_…` key alone. Never paste two values into one variable.                                                                       | Production sign-in was down until 2026-09-12 because the Mapbox token had been concatenated onto the anon key (D-075).                     |

## Migrations (human gate — Claude writes them, does not apply them)

| Item                                                | What it unlocks                                                                                                                                      | Notes                                                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Persist analysis job status** (`analyses.status`) | A failed analysis becomes distinguishable from a slow one. Today `updateAnalysisStatus` is a no-op and status is inferred from `calculated_metrics`. | The analyzing page's 3-minute stall screen (#37) is the best that can be said without it. Chip `task_0720c82b`. |
| **`beds_known` / `baths_known` from the scraper**   | A genuine studio renders "Studio" instead of "— bed". Today 0 cannot be told from missing, so 0 is treated as not provided (D-072).                  | Scraper change (`realtor_scraper.py` emits the flags, like `taxes_known`) + migration + API/web plumbing.       |
| **`20260701_add_schools_name_postal_unique.sql`**   | `load-schools.mjs` upsert; school sections light up.                                                                                                 | Not applied as of the last check; see AUDIT_TRACKER Phase 3.                                                    |

## Real data the owner has to supply

| Item                         | Needed                                                                   | Notes                                                                              |
| ---------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **Golden dataset**           | 47 more labelled listing descriptions (`golden_cases.json` has 3 of 50). | The 95% gate passes trivially at this size and must not be reported as meaningful. |
| **Founder-note copy** (PR10) | 3–4 sentences in the owner's own words for `FOUNDER_NOTE_BODY`.          | Ships with real words or not at all; nothing may be invented.                      |

## Manual testing (lower priority per owner, 2026-09-12)

What the automated suites and the production runs on 2026-09-12 did **not** cover:

- Stripe checkout end to end (blocked on price IDs above).
- Landlord and personal-buyer modes on production with a real listing (only investor mode was run).
- PDF export on production (Pro-gated; needs a Pro account).
- Mobile layout on a real device (jsdom guards exist; see AUDIT_TRACKER T-09).
- Tenant-mode quota exemption on production (verified by API tests only).

Verified live on 2026-09-12 and not needing a repeat: address path, Realtor.ca scrape, signed-in
attribution, owner-only flag dismissal, stranger share-link view, guest report ownership, financing
presets against the live rate, Toronto municipal LTT, real Mapbox maps, magic-link sign-in.
