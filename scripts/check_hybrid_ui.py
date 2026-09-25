"""Local-only browser checks; run against an already started web dev server.

Uses the existing scraper Playwright dependency. No login or live API calls.
Run once per VITE_APP_DESIGN build, passing --design legacy for rollback.
Screenshots are evidence for review, not automatically approved baselines.
"""

import argparse
import json
import tempfile
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import Page, Route, expect, sync_playwright


REPORTS = ["investor", "tenant", "personal", "landlord"]
PAGES = [
    "/account",
    "/auth/reset",
    "/auth/reset/confirm",
    "/auth/verified",
    "/auth/confirm",
    "/welcome-to-pro",
    "/checkout/cancelled",
    "/methodology",
    "/privacy",
    "/terms",
    "/missing-page",
    "/r/missing-fixture",
    "/analyzing",
    "/print-report",
]


def local_only(route: Route) -> None:
    """Allow app assets only; simulate an unavailable API without credentials."""
    url = urlparse(route.request.url)
    if url.hostname not in ("localhost", "127.0.0.1"):
        route.abort()
    elif url.path.startswith("/api/"):
        route.fulfill(
            status=503,
            content_type="application/json",
            body=json.dumps(
                {"error": True, "code": "UNAVAILABLE", "message": "Offline check"}
            ),
        )
    else:
        route.continue_()


def check_layout(page: Page, design: str) -> None:
    """Check document overflow, selected design, and upright hybrid typography."""
    expect(page.locator("html")).to_have_attribute("data-design", design)
    assert page.evaluate(
        "document.documentElement.scrollWidth <= window.innerWidth + 1"
    ), "Horizontal page overflow"
    if design == "hybrid":
        italic = page.evaluate(
            """() => [...document.querySelectorAll('body *')].filter(el =>
                el.getClientRects().length &&
                getComputedStyle(el).fontStyle === 'italic'
            ).map(el => el.tagName + ':' + el.textContent.slice(0, 60))"""
        )
        assert not italic, italic


def check_report(page: Page, design: str) -> None:
    """Use the section navigator and exercise a financing/rent slider by keyboard."""
    expect(page.locator("h1")).to_be_visible()
    sections = page.locator("[data-section]")
    assert sections.count() >= 10, "Report sections missing"
    if design == "hybrid":
        nav = page.get_by_role("navigation", name="Explore report sections")
        nav.locator("summary").click()
        buttons = nav.get_by_role("button")
        expected = page.locator("[data-section]:has([data-section-topic])").count()
        expect(buttons).to_have_count(expected)
        buttons.last.click()
        assert page.evaluate("document.activeElement.tagName === 'H2'")
    else:
        expect(
            page.get_by_role("navigation", name="Explore report sections")
        ).to_have_count(0)
    sliders = page.locator('input[type="range"]')
    if sliders.count():
        slider = sliders.first
        before = slider.input_value()
        slider.focus()
        direction = (
            "ArrowLeft" if before == slider.get_attribute("max") else "ArrowRight"
        )
        slider.press(direction)
        assert slider.input_value() != before


def main() -> None:
    """Run desktop/mobile and both-theme checks with screenshots in a local directory."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:5173")
    parser.add_argument("--design", choices=["hybrid", "legacy"], default="hybrid")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    assert urlparse(args.url).hostname in (
        "localhost",
        "127.0.0.1",
    ), "Local server only"
    output = args.output or Path(tempfile.mkdtemp(prefix="propscout-ui-"))
    output.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        for width in (375, 1280):
            for theme in ("light", "dark"):
                context = browser.new_context(viewport={"width": width, "height": 900})
                context.route("**/*", local_only)
                context.add_init_script(
                    f"localStorage.setItem('propscout-theme', '{theme}')"
                )
                page = context.new_page()
                page.goto(args.url)
                check_layout(page, args.design)
                if args.design == "hybrid":
                    for mode in REPORTS:
                        page.goto(args.url)
                        page.locator("#reports").scroll_into_view_if_needed()
                        assert page.evaluate("window.scrollY > 0")
                        page.locator(
                            f'.hy-report-choice[href="/{mode}-report"]'
                        ).click()
                        page.wait_for_url(f"**/{mode}-report")
                        expect(page.locator("h1")).to_be_visible()
                        assert page.evaluate(
                            "window.scrollY === 0"
                        ), "Route retained home scroll"
                for mode in REPORTS:
                    page.goto(f"{args.url}/{mode}-report")
                    check_report(page, args.design)
                    check_layout(page, args.design)
                    page.evaluate("window.scrollTo(0, 0)")
                    page.screenshot(path=str(output / f"{mode}-{width}-{theme}.png"))
                    page.emulate_media(media="print")
                    if args.design == "hybrid":
                        expect(page.locator(".hy-report-contents")).to_be_hidden()
                    assert page.locator("[data-section]").count() >= 10
                    page.emulate_media(media="screen")
                    print(f"PASS {args.design} {mode} {width} {theme}", flush=True)
                for route in PAGES:
                    page.goto(args.url + route)
                    check_layout(page, args.design)
                    print(
                        f"PASS layout {args.design} {route} {width} {theme}", flush=True
                    )
                page.goto(args.url + "/#pricing")
                expect(page.locator("#pricing")).to_be_in_viewport()
                context.close()
        browser.close()
    print(f"Screenshots: {output}")


if __name__ == "__main__":
    main()
