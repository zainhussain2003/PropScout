# Free beta deployment profile

This is a prepared deployment candidate, not a deployed or reviewer-accepted release.
The owner requested deployment responsibility on October 6, 2026, retaining the
no-new-spending constraint. Existing release rules still require an explicit
candidate record and independent acceptance; neither is claimed here.

## Proposed hosting

Use **one Render Free Docker web service**, built from
`deploy/free-beta/Dockerfile`, with repository root as build context. Its Node API
is public on Render's PORT; the existing Python calculator and scraper listen
only on loopback. No public unauthenticated calculator service is added. Keep the
existing Vercel frontend and Supabase database. Do not create Render Postgres,
paid disks, workers, cron services, paid builds or a payment method.

This candidate needs an actual Linux container build, memory/PDF concurrency
verification under the free instance limit, and cold-start/deployed smoke checks
before switching frontend traffic. Render may suspend free services at quota
limits and cold starts take roughly a minute. This is a limited feedback beta,
not an uptime guarantee. Do not use artificial keep-alive traffic.

Official reference: https://render.com/docs/free and https://render.com/docs/faq.
Without a payment method, allowance exhaustion suspends services/builds rather
than charging overage. Verify the actual new workspace has no payment method.
Do not presume an existing paid workspace is cost-safe.

## Environment

The launcher forces free feature access, disables checkout and metered optional
providers, disables the private HPI integration, and connects Node to loopback
Python. Required environment fields, entered only in the host's private settings:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: existing database access.
- `SCRAPER_API_KEY`: existing included allowance, only after verifying automatic
  upgrades and pay-as-you-go remain disabled. Exhaustion must fail gracefully.
- `NOMINATIM_CONTACT_EMAIL=support@propscout.ca`: identifies the small-beta geocoder.
- `FRONTEND_URL`: actual frontend origin, required for CORS and PDF rendering.
- `PORT`: supplied by Render.

The owner specifically approved free Render account creation, Render terms and
transmission of the existing Supabase service key and ScraperAPI key, with no
payment method. Account creation completed; the workspace billing page showed
no card on file, no pending charges and zero services. The build pipeline spend
limit was $0. On October 8, under the recorded one-release exception, the
published beta branch was deployed on Render Free at
`https://propscout-free-beta.onrender.com`. Only the two approved keys were
transferred. Real HPI remains disabled and absent from the build.
Do not copy a whole `.env` file or unrelated credentials to a new host.
Frontend configuration must set `VITE_FREE_ONLY_BETA=true`, which ignores even
an existing Mapbox token and blocks its browser transport, with HPI disabled;
`VITE_API_URL` changes only after the new backend smoke checks pass.

## Data and feature boundaries

- Nominatim is opt-in via `GEOCODING_PROVIDER=nominatim`, with identifying contact,
  at most one upstream request every 1.1 seconds, at most five queued callers,
  1,000-entry in-memory cache and no autocomplete/bulk operation. Deploy only
  one API process/instance. Canadian country, house number, street, city and
  postal district identity checks reject mismatches and ambiguous results.
- Source attribution is available via the existing footer's Data sources link.
  Privacy identifies the address disclosure to Nominatim.
- `FREE_ONLY_BETA=true` blocks Mapbox geocoding/directions, Google Places, stored
  Walk Score and Haiku extraction calls. Nominatim still supplies coordinates;
  school/census/rental data and deterministic calculations/verdicts remain.
  Existing non-beta behavior is retained unless this profile is enabled.
- Walk Score's live key was verified, but its free licence forbids score storage.
  Saved reports cannot enable it without a storage licence or a separately
  implemented transient display. Do not present absent scores as measured zero.
- No verified Ontario sold-comparable entitlement was observed. No US samples
  may be used to fill that gap. Personal price valuation remains unavailable.
- No real CREA HPI workbook, values or database may enter the build context,
  Git, host settings, preview or deployment. Its feature stays off.

## Database and release gates

Read-only production inspection on October 6 found the `analyses` job-state and
guest-attribution columns absent. The existing migrations are:

- `supabase/migrations/20260913_add_analyses_status.sql`
- `supabase/migrations/20260916_add_analyses_guest_id.sql`

Prepare these through the release coordinator, inspect their backfill/index
effects and confirm backup/rollback before application. Neither migration was
applied in the October 6 preparation pass. Both were applied on October 8
under the specific release exception, after backing up the original analyses
and verifying unchanged original fields. New hosted reports persist complete
status and guest attribution; signed-in claiming remains outside this test scope.
Old-schema compatibility alone does not establish
job-state persistence or guest claiming on the deployed database.

The current repository rules reserve commit creation and promotion to the
coordinator. No candidate commit, push, merge or release is claimed for these
initial local preparation. The October 8 owner exception is recorded in
`docs/BETA_RELEASE_EXCEPTION.md`. An owner-authorized release exception must be recorded explicitly
if release will precede the deferred independent review.

After a candidate is accepted: build the free container; prove cold start,
memory and all four PDFs; apply authorized database changes; switch frontend;
verify four modes, real URL retrieval, share links and feedback on the deployed
beta. Preserve the old deployment for rollback until these checks pass.
