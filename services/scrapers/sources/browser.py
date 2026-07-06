"""
Shared Playwright browser helper for the rental source scrapers.

Each source module borrows a page from here so browser launch options,
timeouts, and politeness delays stay consistent across sources.

This module also owns the fetch-path observability types the yield alarm needs
(``PageResult``, ``PageFetch``, ``SourceFetchResult``). The fetch path RECORDS
the raw {status, rows, blocked} signal per page; it does NOT classify it — the
alarm/classifier is a later, separate port.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import AsyncIterator

from playwright.async_api import Browser, Page, async_playwright

from constants import PAGE_LOAD_TIMEOUT_MS, REQUEST_DELAY_SECONDS
from normalization import RawRentalListing

logger = logging.getLogger(__name__)

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# Status used for a navigation that produced no response (timeout / DNS /
# connection error). Deliberately not a real HTTP status so callers can tell a
# hard navigation failure apart from any page the server actually served.
NAV_FAILED_STATUS = 0

# HTTP statuses that, on their own, mean the request was refused or throttled —
# an anti-bot block, not listings.
_BLOCKED_STATUSES = (403, 429)

# Lowercase substrings that mark an anti-bot challenge / interstitial page rather
# than real listing content. Many of these return HTTP 200 with a challenge body,
# so a clean status is not enough — the body must be checked too. Documented
# marker list; extend it as new interstitials are seen (TEMPLATE — spec 11.2):
#   "just a moment"          — Cloudflare JS-challenge interstitial
#   "checking your browser"  — Cloudflare / DDoS-Guard interstitial
#   "attention required"     — Cloudflare block page (error 1020 / WAF)
#   "cf-chl" / "cf_chl"      — Cloudflare challenge-platform markers in scripts
#   "hcaptcha"               — hCaptcha widget present
#   "recaptcha"              — Google reCAPTCHA widget present (covers g-recaptcha)
#   "ddos-guard"             — DDoS-Guard interstitial
_BLOCK_MARKERS = (
    "just a moment",
    "checking your browser",
    "attention required",
    "cf-chl",
    "cf_chl",
    "hcaptcha",
    "recaptcha",
    "ddos-guard",
)


@dataclass
class PageResult:
    """Outcome of one ``open_page`` call.

    page    — the loaded Page, or None if navigation failed (do not use it then).
    status  — HTTP status of the navigation response, or ``NAV_FAILED_STATUS``
              (0) when navigation failed or produced no response.
    blocked — True when the fetch looks anti-bot blocked: a 403/429 status, or a
              body carrying a challenge/captcha marker (``_BLOCK_MARKERS``).
    """

    page: Page | None
    status: int
    blocked: bool


@dataclass
class PageFetch:
    """Per-page observability record for one (source, city, page) fetch.

    Carries the raw signal a yield alarm needs to tell apart what an empty page
    really means — without this, a block is indistinguishable from end-of-results:
      • real but empty page  → status 200, rows 0, blocked False (NEEDS_REVIEW)
      • anti-bot block       → blocked True (and/or status 403/429)
      • end of results       → status 200, rows 0 (after earlier rows>0 pages)
      • navigation failure   → status NAV_FAILED_STATUS (0)
    This is the raw signal only; classification is a later, separate port.
    """

    source: str
    city: str
    page: int
    status: int
    rows: int
    blocked: bool


@dataclass
class SourceFetchResult:
    """What a source's ``fetch_listings`` returns: the parsed listings plus the
    per-page fetch records (one per (city, page) actually fetched) that produced
    them. ``listings`` flows on into the existing pipeline unchanged; ``pages`` is
    the new observability signal."""

    listings: list[RawRentalListing] = field(default_factory=list)
    pages: list[PageFetch] = field(default_factory=list)


@asynccontextmanager
async def launch_browser() -> AsyncIterator[Browser]:
    """
    Launch a headless Chromium browser for a scrape run.

    Yields:
        Playwright Browser, closed automatically on exit.
    """
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        try:
            yield browser
        finally:
            await browser.close()


async def open_page(browser: Browser, url: str) -> PageResult:
    """
    Open a URL in a new page with the standard user agent and timeout,
    waiting the politeness delay first.

    Captures the navigation's HTTP status and a block signal so callers can tell
    an anti-bot block (403/429, or a challenge-marker body) apart from a genuine
    end-of-results page. Never raises: a navigation failure returns a PageResult
    with ``page=None`` and ``status=NAV_FAILED_STATUS``.

    Args:
        browser: Running Playwright browser.
        url: URL to navigate to.

    Returns:
        PageResult(page, status, blocked). ``page`` is None only when navigation
        failed; ``status`` and ``blocked`` are always populated.
    """
    await asyncio.sleep(REQUEST_DELAY_SECONDS)
    page = await browser.new_page(user_agent=_USER_AGENT)
    try:
        response = await page.goto(
            url, timeout=PAGE_LOAD_TIMEOUT_MS, wait_until="domcontentloaded"
        )
    except Exception:
        logger.exception("Navigation failed: %s", url)
        await page.close()
        return PageResult(page=None, status=NAV_FAILED_STATUS, blocked=False)

    status = response.status if response is not None else NAV_FAILED_STATUS
    blocked = await _detect_block(page, status)
    return PageResult(page=page, status=status, blocked=blocked)


async def open_page_capturing_token(
    browser: Browser, url: str, token_path_suffix: str = "/graphql"
) -> tuple[PageResult, str | None]:
    """
    Open a URL like ``open_page``, but also capture the ``Authorization`` bearer
    the loaded SPA sends on its OWN first request to ``token_path_suffix``.

    Some sources (rentals.ca) no longer render listings into HTML — the data
    lives behind an authenticated same-origin API the SPA calls with a
    short-lived bearer token it mints client-side. Rather than reverse-engineer
    that token, we let the page load and hydrate, watch its outgoing requests,
    and lift the bearer off the first API call it makes. The caller can then
    replay an enriched query in-page (``page.evaluate`` fetch), riding the same
    Cloudflare clearance and token.

    Args:
        browser: Running Playwright browser.
        url: URL to navigate to.
        token_path_suffix: Request URL suffix whose Authorization header to grab.

    Returns:
        (PageResult, token). ``token`` is None if the SPA made no matching
        request in time (or the page failed to load). Never raises.
    """
    captured: dict[str, str] = {}

    def _grab(request: object) -> None:
        try:
            if request.url.endswith(token_path_suffix):
                auth = request.headers.get("authorization")
                if auth and "token" not in captured:
                    captured["token"] = auth
        except Exception:  # never let a listener break navigation
            pass

    await asyncio.sleep(REQUEST_DELAY_SECONDS)
    page = await browser.new_page(user_agent=_USER_AGENT)
    page.on("request", _grab)
    try:
        response = await page.goto(
            url, timeout=PAGE_LOAD_TIMEOUT_MS, wait_until="domcontentloaded"
        )
    except Exception:
        logger.exception("Navigation failed: %s", url)
        await page.close()
        return PageResult(page=None, status=NAV_FAILED_STATUS, blocked=False), None

    status = response.status if response is not None else NAV_FAILED_STATUS
    blocked = await _detect_block(page, status)
    # The SPA fires its own API call during hydration — give it that window.
    try:
        await page.wait_for_load_state("networkidle", timeout=PAGE_LOAD_TIMEOUT_MS)
    except Exception:
        pass  # ad/analytics chatter can keep the network busy — token may still be caught
    return PageResult(page=page, status=status, blocked=blocked), captured.get("token")


async def _detect_block(page: Page, status: int) -> bool:
    """
    Decide whether a served page is an anti-bot block.

    A 403 or 429 is a block on the status alone. Otherwise the page body is
    scanned for a documented challenge/captcha marker (``_BLOCK_MARKERS``) —
    many interstitials return HTTP 200 with a challenge page rather than a 4xx.
    Reading the body never raises out of here: if the content can't be read the
    page is treated as not-blocked (the per-page row count still flags it empty).

    Args:
        page: The loaded page to inspect.
        status: The navigation HTTP status already captured.

    Returns:
        True if the fetch looks blocked, else False.
    """
    if status in _BLOCKED_STATUSES:
        return True
    try:
        body = (await page.content()).lower()
    except Exception:
        logger.exception("Could not read page body for block detection")
        return False
    return any(marker in body for marker in _BLOCK_MARKERS)
