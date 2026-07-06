"""Unit tests for dedupe.py — pure functions, no external dependencies."""

from dedupe import dedupe_batch, dedupe_by_source_url, filter_existing
from normalization import CleanRentalListing


def _listing(
    address: str = "5 Buttermill Ave, Vaughan",
    rent: int = 2150,
    beds: int | None = 2,
    source: str = "rentals_ca",
    url: str = "https://example.com/x",
) -> CleanRentalListing:
    return CleanRentalListing(
        source=source,
        source_url=url,
        address=address,
        postal_code="L4K5W4",
        beds=beds,
        baths=None,
        rent_monthly=rent,
        sqft=None,
        listed_at=None,
    )


class TestDedupeBySourceUrl:
    def test_same_url_collapsed_first_wins(self):
        # An over-broad selector emitting the same card twice (same URL) collapses.
        result = dedupe_by_source_url(
            [
                _listing(url="https://x/1", source="rentals_ca"),
                _listing(url="https://x/1", source="kijiji"),
            ]
        )
        assert len(result) == 1
        assert result[0].source == "rentals_ca"  # first occurrence wins

    def test_distinct_urls_same_content_both_kept(self):
        # Cross-posts (same content, different URL) are KEPT — collapsed at query time.
        result = dedupe_by_source_url(
            [_listing(url="https://x/1"), _listing(url="https://x/2")]
        )
        assert len(result) == 2

    def test_empty_batch(self):
        assert dedupe_by_source_url([]) == []


class TestDedupeBatch:
    def test_exact_duplicate_removed(self):
        result = dedupe_batch([_listing(), _listing(source="kijiji")])
        assert len(result) == 1
        assert result[0].source == "rentals_ca"  # first occurrence wins

    def test_address_match_is_case_and_space_insensitive(self):
        a = _listing(address="5 Buttermill Ave, Vaughan")
        b = _listing(address="  5  BUTTERMILL AVE,  Vaughan ")
        assert len(dedupe_batch([a, b])) == 1

    def test_different_rent_not_duplicate(self):
        assert len(dedupe_batch([_listing(rent=2150), _listing(rent=2200)])) == 2

    def test_different_beds_not_duplicate(self):
        assert len(dedupe_batch([_listing(beds=1), _listing(beds=2)])) == 2

    def test_empty_batch(self):
        assert dedupe_batch([]) == []


class TestFilterExisting:
    def test_existing_listing_dropped(self):
        # TESTING.md Test 8: second run on the same day must not double rows
        batch = [_listing()]
        existing = [("5 Buttermill Ave, Vaughan", 2150, 2)]
        assert filter_existing(batch, existing) == []

    def test_new_listing_kept(self):
        batch = [_listing(address="99 New St, Toronto M5V 1J1")]
        existing = [("5 Buttermill Ave, Vaughan", 2150, 2)]
        assert len(filter_existing(batch, existing)) == 1

    def test_existing_address_match_case_insensitive(self):
        batch = [_listing()]
        existing = [("5 BUTTERMILL AVE, VAUGHAN", 2150, 2)]
        assert filter_existing(batch, existing) == []

    def test_no_existing_keys(self):
        assert len(filter_existing([_listing()], [])) == 1
