"""Unit tests for sources.browser.open_page — Playwright Browser/Page/Response mocked.

open_page is the fetch-path observability seam: it must surface the HTTP status,
flag anti-bot blocks (403/429 or a challenge-marker body), and NEVER raise — a
navigation failure returns a clearly-typed failed result, not an exception.
"""

import pytest
from unittest.mock import AsyncMock

from sources import browser
from sources.browser import NAV_FAILED_STATUS, PageResult


@pytest.fixture(autouse=True)
def _no_politeness_delay(monkeypatch):
    """open_page sleeps the politeness delay first — zero it so tests are fast."""
    monkeypatch.setattr(browser, "REQUEST_DELAY_SECONDS", 0)


def _fake_browser(page: AsyncMock) -> AsyncMock:
    """A Browser whose new_page returns the given page."""
    b = AsyncMock()
    b.new_page = AsyncMock(return_value=page)
    return b


def _fake_page(
    status: int | None = 200, body: str = "<html>listings</html>"
) -> AsyncMock:
    """A Page whose goto returns a response with the given status and whose
    content() returns the given body. status=None models goto returning no
    response object."""
    page = AsyncMock()
    if status is None:
        page.goto = AsyncMock(return_value=None)
    else:
        response = AsyncMock()
        response.status = status
        page.goto = AsyncMock(return_value=response)
    page.content = AsyncMock(return_value=body)
    page.close = AsyncMock()
    return page


@pytest.mark.asyncio
async def test_clean_load_surfaces_200_not_blocked():
    page = _fake_page(status=200, body="<html>rental cards here</html>")
    result = await browser.open_page(_fake_browser(page), "https://rentals.ca/toronto")

    assert isinstance(result, PageResult)
    assert result.page is page
    assert result.status == 200
    assert result.blocked is False


@pytest.mark.asyncio
async def test_403_sets_blocked_true():
    page = _fake_page(status=403, body="<html>forbidden</html>")
    result = await browser.open_page(_fake_browser(page), "https://kijiji.ca/x")

    assert result.status == 403
    assert result.blocked is True
    assert result.page is page  # a block still returns the page, just flagged


@pytest.mark.asyncio
async def test_429_sets_blocked_true():
    page = _fake_page(status=429, body="<html>too many requests</html>")
    result = await browser.open_page(_fake_browser(page), "https://kijiji.ca/x")

    assert result.status == 429
    assert result.blocked is True


@pytest.mark.asyncio
async def test_challenge_marker_body_sets_blocked_true_on_200():
    # Cloudflare interstitial: HTTP 200, but the body is a challenge, not listings.
    page = _fake_page(
        status=200,
        body="<html><title>Just a moment...</title>Checking your browser</html>",
    )
    result = await browser.open_page(_fake_browser(page), "https://padmapper.com/x")

    assert result.status == 200
    assert result.blocked is True  # caught by body marker, not status


@pytest.mark.asyncio
async def test_recaptcha_marker_body_sets_blocked_true():
    page = _fake_page(status=200, body="<html><div class='g-recaptcha'></div></html>")
    result = await browser.open_page(_fake_browser(page), "https://x")

    assert result.blocked is True


@pytest.mark.asyncio
async def test_navigation_failure_returns_failed_result_without_raising():
    page = _fake_page(status=200)
    page.goto = AsyncMock(side_effect=RuntimeError("net::ERR_TIMED_OUT"))

    # Must not raise.
    result = await browser.open_page(_fake_browser(page), "https://x")

    assert result.page is None
    assert result.status == NAV_FAILED_STATUS  # 0 — a hard failure, not a real status
    assert result.blocked is False
    page.close.assert_awaited_once()  # the failed page is cleaned up


@pytest.mark.asyncio
async def test_goto_returns_no_response_yields_status_zero():
    # Some navigations (e.g. same-document) resolve with no Response object.
    page = _fake_page(status=None, body="<html>ok</html>")
    result = await browser.open_page(_fake_browser(page), "https://x")

    assert result.page is page
    assert result.status == NAV_FAILED_STATUS
    assert result.blocked is False


@pytest.mark.asyncio
async def test_body_read_failure_is_non_fatal_not_blocked():
    # If the body can't be read, block detection must not raise — treat as not
    # blocked (the per-page row count still flags an empty page downstream).
    page = _fake_page(status=200)
    page.content = AsyncMock(side_effect=RuntimeError("detached frame"))

    result = await browser.open_page(_fake_browser(page), "https://x")

    assert result.status == 200
    assert result.blocked is False
