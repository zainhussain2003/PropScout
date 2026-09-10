# Access setup — what Zain needs to obtain

Things only the account owner can do. Work through these while the code is being
built; each section says what to get, where to put it, and how to verify it.

Nothing here needs to happen in order, **except** the comparable-sales decision
(§2), which gates real work and has the longest lead time. Start there.

Legend: 🔴 blocks a feature · 🟡 unblocks polish · ⚪ no rush

---

## 1. ✅ Stripe — DONE (test mode), local only

**Completed 2026-09-06.** Three CAD monthly recurring products created in the
sandbox, all six env vars set in local `.env`, and a webhook endpoint created via
the API. Verified end to end: a real test checkout session returns 1000 CAD and a
`checkout.stripe.com` URL.

| Product          | Price ID                         |
| ---------------- | -------------------------------- |
| Investor Pro $10 | `price_1UCULC3XJvDRet2zdpU64iIf` |
| Professional $59 | `price_1UCUNM3XJvDRet2zN2lWVm4W` |
| Team / REIT $299 | `price_1UCUOH3XJvDRet2zXLt7SVVg` |

Webhook `we_1UCUWG3XJvDRet2zyIAZ9SdD` → `…/webhooks/stripe`, enabled, listening for
`checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`.

**Deliberately NOT added to Railway.** Billing stays dormant in production, which
is what "in place for later, not activated" means — the API returns 503
`BILLING_UNAVAILABLE` there (D-013). Copy the six values into the Railway
`@propscout/api` service whenever you want paid plans live. Swap `sk_test_`/
`pk_test_` for live keys only when you actually intend to charge people.

### Original setup steps (kept for reference / redoing in live mode)

The code is **already complete**: `stripeService.ts` (checkout + billing portal),
`POST /billing/checkout`, `POST /billing/portal`, and a signature-verified
`POST /webhooks/stripe`. It only lacks keys. Everything below can be done entirely
in **Test mode** — no business verification, no bank account, nothing charged. The
account stays inactive until you flip it live.

### What to do

1. Create an account at <https://dashboard.stripe.com/register>. Skip the business
   activation prompts; stay in **Test mode** (toggle top-right).
2. **Create three recurring products** — Product catalogue → _Add product_. The
   names are yours; the prices must match `docs/MVP_TODO.md` and the pricing page:

   | Product      | Price  | Billing            | Currency |
   | ------------ | ------ | ------------------ | -------- |
   | Investor Pro | 10.00  | Monthly, recurring | CAD      |
   | Professional | 59.00  | Monthly, recurring | CAD      |
   | Team / REIT  | 299.00 | Monthly, recurring | CAD      |

   After saving each, open it and copy the **Price ID** — it starts `price_`, not
   `prod_`. The `prod_` id is the wrong one and will fail at checkout.

3. **Get the API keys** — Developers → API keys. In Test mode you want the
   _Secret key_ (`sk_test_…`) and _Publishable key_ (`pk_test_…`).

4. **Create the webhook** — Developers → Webhooks → _Add endpoint_.
   - Local testing: install the Stripe CLI and run
     `stripe listen --forward-to localhost:3001/webhooks/stripe`. It prints a
     signing secret (`whsec_…`) — use that one locally.
   - Deployed: endpoint URL `https://propscoutapi-production.up.railway.app/webhooks/stripe`
   - Events to send: `checkout.session.completed`,
     `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Signing secret** (`whsec_…`).

### Where the values go

Local `.env` (all seven; the three `STRIPE_PRICE_*` are currently missing entirely,
and the three key vars exist but are empty):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_TEAM=price_...
```

Railway (`@propscout/api` service → Variables) — **none of these currently exist in
production**, which is why billing cannot work there. Same six values.

### Verify

```bash
curl -s -X POST http://localhost:3001/billing/checkout \
  -H 'Content-Type: application/json' -d '{"tier":"pro"}'
```

A `url` starting `https://checkout.stripe.com/` means it works. Test card
`4242 4242 4242 4242`, any future expiry, any CVC.

**Do not** put live (`sk_live_…`) keys anywhere until you actually want to charge
people. Test and live keys can coexist — Railway holds live, local holds test.

---

## 2. 🔴 Comparable recent sales — a decision, not just a key

This is the one genuinely blocked item, and it needs a call from you before any
code is worth writing.

### The problem

**Canadian sold prices are licensed data.** Unlike the US, there is no free or
public source for what a specific address sold for. CREA and the local real estate
boards control it, and every site showing sold data (HouseSigma, Zolo, Wahi,
Strata) is either a licensed member or operating on terms that forbid scraping.
Scraping them would put the product at legal risk and is not on the table.

So the report currently says _"No comparable-sales source yet — recent sold prices
aren't available for this area."_ That is honest, and it is the last visibly empty
block in the investor and personal-buyer reports.

### Your options

| Path                                                    | What it needs from you                                                            | Cost                      | Lead time    | Gets us                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------- | ------------ | ---------------------------------------------------------- |
| **A. Third-party MLS API** (Repliers, Realtyna, Bridge) | Sign up, agree to terms; some ask for a REALTOR® sponsor                          | ~$100–500/mo              | Days         | Address-level sold comps via a clean API. **Recommended.** |
| **B. CREA DDF**                                         | CREA membership _or_ an authorized member sponsoring you as a technology provider | Free with membership      | Weeks–months | Listing data; sold data depends on board rules             |
| **C. Local board VOW** (TRREB)                          | REALTOR® membership + a signed VOW agreement                                      | Membership dues           | Months       | Best data, heaviest compliance burden                      |
| **D. Teranet / ONLAND**                                 | Enterprise contract                                                               | $5K–20K/yr (per spec §13) | Weeks        | Land-registry transfers, not MLS comps                     |

**My recommendation: A.** It is the only one that turns into working software in
days rather than months, and it can be swapped for B or C later — the code will sit
behind a service file (`comparableSalesService.ts`), so changing provider is a
one-file change.

Start here: <https://repliers.com> (TRREB/Ontario coverage, REST API, has a trial).

### What I need back from you

Whichever path you pick: the **API key/token**, the **base URL**, and any
**attribution string** the licence requires (most MLS feeds mandate a "Data
provided by…" line — I will render it in the report).

### What I checked before concluding this

Free aggregate sources were tested and ruled out, so this is not an untried
assumption:

- **StatsCan 34-10-0013** ("Residential property values") — province-level totals
  from 2005. No neighbourhood granularity.
- **CREA MLS® HPI** — the benchmark data is published through a web tool, not as a
  bulk download or public API.
- **Our own `listings` table** — 22 rows, all asking prices, no sale dates.

So there is no free substitute that fills this section, at any granularity useful
to a specific address. It stays honestly empty until a licensed feed is in place —
which is why this decision is worth making sooner rather than later.

---

## 3. ✅ Google Places — DONE

**Completed 2026-09-06.** Billing linked, **Places API (New)** enabled on project
`352178646394` ("My First Project"), and `GOOGLE_PLACES_KEY` in `.env` replaced.

**The old key was the problem, not just the API.** It belonged to a different
project, so enabling APIs here would never have fixed it. The Maps onboarding flow
created a new "Maps Platform API Key" in this project; that is the one now in
`.env`. If you ever see `PERMISSION_DENIED` again, check the project id in the
error message before anything else.

Verified live: nearest transit **70 m**, grocery **0.99 km**, pharmacy **0.56 km**
for the Sheppard Ave test property, plus real school results.

### Original setup steps (for reference)

Currently **every** Google Maps API on the project owning `GOOGLE_PLACES_KEY`
denies: Places (New) returns `403 PERMISSION_DENIED`, and legacy APIs return
`REQUEST_DENIED: You're calling a legacy API, which is not enabled for your
project`. The code is already migrated to Places API (New) and waiting.

### What to do

1. Go to <https://console.cloud.google.com> and select the project that owns the
   existing `GOOGLE_PLACES_KEY` (or create a new one — then send me the new key).
2. **Enable billing** — Billing → link a billing account. Google requires a card on
   file even inside the free tier; Maps Platform gives **$200 of free usage per
   month**, which comfortably covers our volume. Without billing, every call 403s
   regardless of which APIs are enabled.
3. **Enable the API** — APIs & Services → Library → search **"Places API (New)"** →
   _Enable_. Note it is the one literally named _(New)_; enabling the old "Places
   API" alone will not work.
4. **Check key restrictions** — APIs & Services → Credentials → your key. Under
   _API restrictions_, either choose _Don't restrict key_ or make sure **Places API
   (New)** is in the allowed list. Under _Application restrictions_, choose **None**
   or **IP addresses** — an HTTP-referrer restriction will break it, because we call
   it from the server, not the browser.
5. Optional but sensible: set a **budget alert** at ~$50/mo so a runaway loop cannot
   surprise you.

### Verify

```bash
curl -s "https://places.googleapis.com/v1/places:searchNearby" \
  -H "Content-Type: application/json" \
  -H "X-Goog-Api-Key: $GOOGLE_PLACES_KEY" \
  -H "X-Goog-FieldMask: places.displayName" \
  -d '{"includedTypes":["school"],"maxResultCount":1,"locationRestriction":{"circle":{"center":{"latitude":43.65,"longitude":-79.38},"radius":1000}}}'
```

A JSON body with `places` means it works. `PERMISSION_DENIED` means billing or the
API is still off.

**Unblocks:** the Neighbourhood section's nearest transit / grocery / highway
on-ramp / pharmacy distances, in the investor, landlord, personal and tenant
reports.

---

## 4. ⚪ Smaller items, no rush

| Item                           | What                                                                                              | Why it matters                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **CMHC vacancy rates**         | Latest Rental Market Survey from cmhc-schl.gc.ca → update `apps/api/src/constants/cmhcVacancy.ts` | Feeds the demand component of the deal score (max 10 pts); values are currently indicative, not authoritative |
| **Ontario property tax rates** | Refresh `apps/api/src/constants/propertyTaxRates.ts` from municipal budget docs                   | Currently the 2024/25 cycle                                                                                   |
| **ScraperAPI render mode**     | Ask support why `render=true` 500s on Realtor.ca                                                  | Would return `year_built` and sometimes condo fees                                                            |
| **Resend**                     | The key in `.env` returns 401                                                                     | Only used by local agent tooling, not the app — ignore unless you want transactional email                    |

---

## Quick reference — every credential the app reads

| Variable                                           | Status             | Needed for                            |
| -------------------------------------------------- | ------------------ | ------------------------------------- |
| `SUPABASE_URL` / `_ANON_KEY` / `_SERVICE_ROLE_KEY` | ✅ working         | Everything                            |
| `ANTHROPIC_API_KEY`                                | ✅ working         | Haiku structured-flag extraction only |
| `MAPBOX_TOKEN` / `VITE_MAPBOX_TOKEN`               | ✅ working         | Geocoding, maps                       |
| `WALKSCORE_API_KEY`                                | ✅ working         | Walk + Transit score                  |
| `SCRAPER_API_KEY`                                  | ✅ working         | Realtor.ca listing scrape             |
| `GOOGLE_PLACES_KEY`                                | 🔴 denies          | §3 above                              |
| `STRIPE_*` (6 vars)                                | 🟡 empty / missing | §1 above                              |
| Comparable-sales provider                          | 🔴 undecided       | §2 above                              |
| `RESEND_API_KEY`                                   | ⚪ 401             | Local agent tooling only              |
