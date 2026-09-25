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
INVESTOR_SECTIONS = [
    "Investment metrics",
    "Financing scenarios",
    "Rental comps",
    "Cash to close",
    "OSFI stress test",
    "Risk flags",
    "Equity build",
    "Neighbourhood",
    "SunScout",
    "STR vs LTR",
    "Due diligence",
]
REPORT_SECTIONS = {
    "investor": [*INVESTOR_SECTIONS, "Sources"],
    "tenant": [
        "Rent positioning",
        "Listing accuracy",
        "Listed vs Reality",
        "Negotiation",
        "Monthly cost",
        "What's included",
        "Location & commute",
        "Schools nearby",
        "SunScout",
        "Map of comps",
        "Unit & building details",
        "Before you sign",
    ],
    "personal": [
        "Estimated monthly cash outflow",
        "Fair market value",
        "Comparable sales",
        "Schools",
        "Neighbourhood",
        "SunScout",
        "Risks & conditions",
        "Before you bid",
    ],
    "landlord": ["Rent positioning", *INVESTOR_SECTIONS[:-1], "Landlord checklist"],
}
SECTION_SELECTOR = "[data-section-topic][data-section-n]:has(h2)"
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


def check_sections(page: Page, mode: str) -> None:
    """Require the demo's full ordered topic inventory, not rail-specific markers."""
    topics = page.locator(SECTION_SELECTOR).evaluate_all(
        "elements => elements.map(el => el.dataset.sectionTopic)"
    )
    assert topics == REPORT_SECTIONS[mode], f"{mode} sections: {topics}"


def check_report(page: Page, design: str, mode: str) -> None:
    """Use the section navigator and exercise a financing/rent slider by keyboard."""
    expect(page.locator("h1")).to_be_visible()
    check_sections(page, mode)
    if design == "hybrid":
        nav = page.get_by_role("navigation", name="Explore report sections")
        nav.locator("summary").click()
        buttons = nav.get_by_role("button")
        headings = page.locator(SECTION_SELECTOR)
        expect(buttons).to_have_count(len(REPORT_SECTIONS[mode]))
        for index, topic in enumerate(REPORT_SECTIONS[mode]):
            heading = headings.nth(index)
            number = heading.get_attribute("data-section-n")
            button = nav.get_by_role("button", name=f"{number} {topic}", exact=True)
            button.click()
            expect(heading.locator("h2")).to_be_focused()
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
        for width in (375, 390, 1280):
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
                    check_report(page, args.design, mode)
                    check_layout(page, args.design)
                    page.evaluate("window.scrollTo(0, 0)")
                    page.screenshot(path=str(output / f"{mode}-{width}-{theme}.png"))
                    page.emulate_media(media="print")
                    if args.design == "hybrid":
                        expect(page.locator(".hy-report-contents")).to_be_hidden()
                    check_sections(page, mode)
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
