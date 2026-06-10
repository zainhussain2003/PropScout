"""
Shared Playwright browser helper for the rental source scrapers.

Each source module borrows a page from here so browser launch options,
timeouts, and politeness delays stay consistent across sources.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from playwright.async_api import Browser, Page, async_playwright

from constants import PAGE_LOAD_TIMEOUT_MS, REQUEST_DELAY_SECONDS

logger = logging.getLogger(__name__)

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


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


async def open_page(browser: Browser, url: str) -> Page | None:
    """
    Open a URL in a new page with the standard user agent and timeout,
    waiting the politeness delay first.

    Args:
        browser: Running Playwright browser.
        url: URL to navigate to.

    Returns:
        Loaded Page, or None if navigation failed (logged, never raises).
    """
    await asyncio.sleep(REQUEST_DELAY_SECONDS)
    page = await browser.new_page(user_agent=_USER_AGENT)
    try:
        await page.goto(url, timeout=PAGE_LOAD_TIMEOUT_MS, wait_until="domcontentloaded")
        return page
    except Exception:
        logger.exception("Navigation failed: %s", url)
        await page.close()
        return None
