/**
 * nightlyAlarm.draft.ts  —  ⚠️ DRAFT / PREPARE-ONLY ARTIFACT. NOT WIRED. DO NOT RUN. ⚠️
 *
 * Reviewable draft of the production nightly yield-alarm entry point. It composes the
 * four REVIEWED sandbox modules (classifyCity, retry, alarmDecision, aggregate) into a
 * run-level alarm. Every point that would touch something LIVE is a throwing stub,
 * marked `TODO(live)`, naming the real (Python) location — nothing here imports, calls,
 * or executes the live scraper, the city list, Resend, or process.exit on import.
 *
 * ════════════════════════════════════════════════════════════════════════════════════
 * BLOCKING INTEGRATION REALITY (read before placing this anywhere):
 *
 *   The alarm modules are TypeScript. The live dependencies are Python or absent:
 *     • Scraper fetch  → Python: services/scrapers/sources/browser.py::open_page(browser, url) -> Page | None
 *                                 services/scrapers/sources/rentals_ca.py::fetch_listings(browser) -> list[...]
 *                        Neither returns the {status, rows, blocked} PageResult shape this alarm consumes.
 *     • City/source    → Python: services/scrapers/constants.py  (TARGET_CITIES, KIJIJI_CITIES=("toronto",))
 *     • Resend email   → DOES NOT EXIST. Only RESEND_API_KEY is declared in .env.example (line 36).
 *
 *   A TS entry point cannot `import` Python. Before this is real you must choose the
 *   runtime boundary (port the alarm to Python / run TS that consumes the scraper's
 *   JSON output / a shared store) AND build the PageResult adapter. See the pre-flight
 *   checklist at the bottom of this file. This draft deliberately does NOT pick one —
 *   that is an escalate-category decision for the human.
 * ════════════════════════════════════════════════════════════════════════════════════
 */

import { aggregateRun, SourceCityPages } from "./aggregate";
import { AlarmDecision, AlarmSummary, AlarmLevel } from "./alarmDecision";
import { PageResult } from "./classifyCity";

// ─────────────────────────────────────────────────────────────────────────────────────
// LIVE TOUCHPOINT 1 — the run's (source, city) targets
// ─────────────────────────────────────────────────────────────────────────────────────
/**
 * TODO(live): The real source/city list is Python:
 *   services/scrapers/constants.py → TARGET_CITIES (12 cities) and KIJIJI_CITIES = ("toronto",).
 * Kijiji is gated to Toronto only (see constants.py). This TS draft cannot import those
 * Python tuples — feed this from the chosen cross-language bridge (see checklist #2).
 * Do NOT hardcode a city list here; it must come from the single source of truth.
 */
function getRunTargets(): { source: string; city: string }[] {
  throw new Error(
    "NOT WIRED (TODO live #1): source/city targets live in services/scrapers/constants.py " +
      "(TARGET_CITIES + KIJIJI_CITIES, Python). Bridge required — see pre-flight checklist."
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────
// LIVE TOUCHPOINT 2 — the real scraper fetch (+ adapter to PageResult)
// ─────────────────────────────────────────────────────────────────────────────────────
/**
 * TODO(live): The real fetch path is the EXISTING Python scraper — do NOT reimplement scraping:
 *   services/scrapers/sources/browser.py::open_page(browser: Browser, url: str) -> Page | None
 *   services/scrapers/sources/rentals_ca.py::fetch_listings(browser) -> list[RawRentalListing]
 * Neither returns { status, rows, blocked }. An ADAPTER must derive PageResult per page:
 *   status  ← HTTP status of the page response
 *   rows    ← count of listings parsed from the page
 *   blocked ← the scraper's soft-block detection (the sandbox scraper/open_page.ts shows the
 *             intended {status, blocked} shape, but it is a TS reference — NOT the live path).
 * The adapter + cross-language bridge do not exist yet (checklist #1).
 */
async function fetchPagesFor(source: string, city: string): Promise<PageResult[]> {
  throw new Error(
    `NOT WIRED (TODO live #2): fetch for ${source}/${city} must call the Python scraper ` +
      `(browser.py::open_page / rentals_ca.py::fetch_listings) and adapt each page to ` +
      `{ status, rows, blocked }. No adapter/bridge exists yet — see pre-flight checklist.`
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────
// LIVE TOUCHPOINT 3 — the Resend notification send
// ─────────────────────────────────────────────────────────────────────────────────────
/**
 * TODO(live): There is NO Resend helper in the repo — only RESEND_API_KEY in .env.example (line 36).
 * Per the project's service-layer rule, build a dedicated resendService (do NOT call the
 * Resend API inline here). It should send the per-city summary: which cities were BLOCKED
 * and which were NEEDS_REVIEW. HARD and SOFT both notify; NONE does not (notification undefined).
 */
async function sendNotification(summary: AlarmSummary, level: AlarmLevel): Promise<void> {
  throw new Error(
    `NOT WIRED (TODO live #3): no Resend helper exists (RESEND_API_KEY in .env.example only). ` +
      `Would send a ${level} alarm — blocked=[${summary.blockedCities.join(", ")}] ` +
      `needsReview=[${summary.needsReviewCities.join(", ")}]. Build resendService — see checklist.`
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────
// COMPOSITION — this part is REAL and reviewable (uses the four reviewed modules verbatim)
// ─────────────────────────────────────────────────────────────────────────────────────
/**
 * Compose the run: fetch every target's pages, aggregate to a run-level AlarmDecision,
 * and (for HARD/SOFT) dispatch the notification. Returns the decision; the caller owns
 * process.exit. Pure orchestration over the reviewed modules — no scraping/alarm logic
 * is reimplemented here.
 */
export async function runNightlyAlarm(): Promise<AlarmDecision> {
  const targets = getRunTargets(); // TODO(live #1)

  const entries: SourceCityPages[] = [];
  for (const { source, city } of targets) {
    const pages = await fetchPagesFor(source, city); // TODO(live #2)
    entries.push({ source, city, pages });
  }

  // The reviewed composition: classify → per-source breaker → run-level decision.
  const decision: AlarmDecision = aggregateRun(entries);

  // HARD and SOFT carry a notification; NONE leaves it undefined.
  if (decision.notification) {
    await sendNotification(decision.notification, decision.level); // TODO(live #3)
  }

  return decision;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// LIVE TOUCHPOINT 4 — process exit
// ─────────────────────────────────────────────────────────────────────────────────────
/**
 * TODO(live): The nightly job's exit code IS the alarm. HARD → exitCode 1 (non-zero) must
 * fail the Railway cron run so it surfaces; SOFT and NONE → 0. Confirm the cron/alerting
 * treats a non-zero nightly exit as the HARD alarm before relying on it.
 */
export async function main(): Promise<void> {
  const decision = await runNightlyAlarm();
  // TODO(live #4): real termination. HARD=1 fails the job; SOFT/NONE=0.
  process.exit(decision.exitCode);
}

// Intentionally NOT auto-invoked: importing or typechecking this file executes nothing.
// TODO(live): decide the real entry trigger (Railway nightly cron) and enable explicitly.
// if (require.main === module) { void main(); }

/* ════════════════════════════════════════════════════════════════════════════════════
 * PRE-FLIGHT CHECKLIST — verify/wire each before this goes live (escalate-category):
 *
 *  1. RUNTIME BOUNDARY + PageResult ADAPTER (biggest item)
 *     Alarm = TS; scraper + constants = Python. Choose: port alarm to Python /
 *     run TS over the scraper's JSON output / shared store. Then build the adapter
 *     mapping each scraped page → { status, rows, blocked }.
 *
 *  2. SOURCE/CITY LIST
 *     services/scrapers/constants.py → TARGET_CITIES (12), KIJIJI_CITIES=("toronto",).
 *     Confirm the (source × city) pairing rules (Kijiji = Toronto only) feed getRunTargets().
 *
 *  3. RESEND HELPER
 *     Does not exist. Build a dedicated resendService (service-layer rule — not inline),
 *     sending the BLOCKED / NEEDS_REVIEW per-city summary. Wire sendNotification to it.
 *
 *  4. ENV VARS
 *     RESEND_API_KEY (declared in .env.example; confirm it's set in the real env), plus
 *     whatever the scraper bridge needs. Never hardcode.
 *
 *  5. EXIT-CODE SEMANTICS
 *     Confirm the nightly cron + alerting treat non-zero exit (HARD) as the alarm, and
 *     that SOFT/NONE exit 0 (a soft alarm must NOT fail the job, only notify).
 * ════════════════════════════════════════════════════════════════════════════════════ */
