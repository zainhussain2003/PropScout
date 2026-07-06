"""Unit tests for normalization.py — pure functions, no external dependencies."""

from normalization import (
    RawRentalListing,
    extract_postal_code,
    is_ontario_postal_code,
    normalize_listing,
    parse_baths,
    parse_beds,
    parse_rent_monthly,
    parse_sqft,
)

# ── parse_rent_monthly ────────────────────────────────────────────────────────


class TestParseRentMonthly:
    def test_plain_monthly_amount(self):
        assert parse_rent_monthly("$2,150/mo") == 2150

    def test_bare_number(self):
        assert parse_rent_monthly("2150") == 2150

    def test_weekly_converted_to_monthly(self):
        # 550 × 4.33 = 2381.5 → 2382 (TESTING.md Test 7: weekly × 4.33)
        assert parse_rent_monthly("550 / week") == 2382

    def test_weekly_with_wk_suffix(self):
        assert parse_rent_monthly("$600/wk") == 2598

    def test_daily_rate_discarded(self):
        assert parse_rent_monthly("$95 per day") is None

    def test_unlabelled_tiny_amount_discarded(self):
        assert parse_rent_monthly("$150") is None

    def test_below_sanity_floor_discarded(self):
        assert parse_rent_monthly("$300/mo") is None

    def test_above_sanity_ceiling_discarded(self):
        assert parse_rent_monthly("$22,000/mo") is None

    def test_unparseable_returns_none(self):
        assert parse_rent_monthly("Please contact") is None

    def test_boundary_values_kept(self):
        assert parse_rent_monthly("$400") == 400
        assert parse_rent_monthly("$15,000") == 15000

    def test_full_word_month_suffix(self):
        assert parse_rent_monthly("$2,150/month") == 2150

    def test_no_dollar_sign(self):
        assert parse_rent_monthly("2,150/mo") == 2150

    def test_empty_string_returns_none(self):
        assert parse_rent_monthly("") is None

    def test_mid_range_unlabelled_below_monthly_floor_discarded(self):
        # 250 > DAILY_RENT_THRESHOLD (200) so not caught by threshold guard,
        # but 250 < RENT_MONTHLY_MIN (400) so it fails the sanity bounds check.
        assert parse_rent_monthly("$250") is None


# ── parse_beds ────────────────────────────────────────────────────────────────


class TestParseBeds:
    def test_simple_count(self):
        assert parse_beds("2 Beds") == 2

    def test_studio_is_zero(self):
        assert parse_beds("Studio") == 0

    def test_bachelor_is_zero(self):
        assert parse_beds("Bachelor apartment") == 0

    def test_den_not_counted(self):
        # Dens are never counted as bedrooms (spec Section 19)
        assert parse_beds("2 + den") == 2

    def test_spelled_out_number(self):
        # Kijiji titles spell beds out — "two bedroom", not "2 bedroom"
        assert parse_beds("two bedroom") == 2
        assert parse_beds("Spacious three-bedroom unit") == 3

    def test_digit_wins_over_word_when_both_present(self):
        # "1 - 3 BED" → first digit (1), not a spelled-out fallback
        assert parse_beds("1 - 3 BED") == 1

    def test_unparseable_returns_none(self):
        assert parse_beds("call for details") is None

    def test_implausible_count_discarded(self):
        assert parse_beds("250 beds") is None

    def test_toronto_plus_den_format(self):
        # "1+1" is a common Toronto listing format — den is not counted
        assert parse_beds("1+1") == 1

    def test_empty_string_returns_none(self):
        assert parse_beds("") is None

    def test_singular_bed(self):
        assert parse_beds("1 Bed") == 1

    def test_abbreviated_bd_suffix(self):
        assert parse_beds("3 bd") == 3


# ── parse_baths / parse_sqft ──────────────────────────────────────────────────


class TestParseBathsAndSqft:
    def test_half_bath(self):
        assert parse_baths("1.5 Baths") == 1.5

    def test_baths_none_passthrough(self):
        assert parse_baths(None) is None

    def test_sqft_with_comma(self):
        assert parse_sqft("1,050 sqft") == 1050

    def test_sqft_none_passthrough(self):
        assert parse_sqft(None) is None


# ── postal codes ──────────────────────────────────────────────────────────────


class TestPostalCodes:
    def test_extract_with_space(self):
        assert extract_postal_code("5 Buttermill Ave, Vaughan, ON L4K 5W4") == "L4K5W4"

    def test_extract_without_space(self):
        assert extract_postal_code("123 Main St M5V1J1") == "M5V1J1"

    def test_extract_lowercase(self):
        assert extract_postal_code("123 Main St l4k 5w4") == "L4K5W4"

    def test_no_postal_code(self):
        assert extract_postal_code("123 Main Street, Toronto") is None

    def test_ontario_prefixes_pass(self):
        for code in ("K1A0A9", "L4K5W4", "M5V1J1", "N2L3G1", "P3E5K3"):
            assert is_ontario_postal_code(code), code

    def test_non_ontario_prefixes_blocked(self):
        for code in ("V6B1A1", "T2P1J9", "H3B1A1"):
            assert not is_ontario_postal_code(code), code

    def test_none_is_not_ontario(self):
        assert not is_ontario_postal_code(None)


# ── normalize_listing ─────────────────────────────────────────────────────────


def _raw(**overrides: object) -> RawRentalListing:
    defaults: dict[str, object] = {
        "source": "rentals_ca",
        "source_url": "https://rentals.ca/x",
        "address": "5 Buttermill Ave, Vaughan, ON L4K 5W4",
        "rent_raw": "$2,150/mo",
        "beds_raw": "2 Beds",
    }
    defaults.update(overrides)
    return RawRentalListing(**defaults)  # type: ignore[arg-type]


class TestNormalizeListing:
    def test_full_listing_normalises(self):
        clean = normalize_listing(_raw(baths_raw="1.5 Baths", sqft_raw="750 sqft"))
        assert clean is not None
        assert clean.rent_monthly == 2150
        assert clean.beds == 2
        assert clean.baths == 1.5
        assert clean.sqft == 750
        assert clean.postal_code == "L4K5W4"

    def test_blank_address_discarded(self):
        assert normalize_listing(_raw(address="   ")) is None

    def test_unparseable_rent_discarded(self):
        assert normalize_listing(_raw(rent_raw="contact us")) is None

    def test_non_ontario_discarded(self):
        assert (
            normalize_listing(_raw(address="123 Robson St, Vancouver BC V6B 1A1"))
            is None
        )

    def test_missing_postal_code_kept(self):
        clean = normalize_listing(_raw(address="123 Main Street, Toronto"))
        assert clean is not None
        assert clean.postal_code is None

    def test_weekly_rent_converted(self):
        clean = normalize_listing(_raw(rent_raw="550 weekly"))
        assert clean is not None
        assert clean.rent_monthly == 2382

    def test_coords_passed_through_when_source_provides_them(self):
        # rentals.ca GraphQL carries exact coords — they must survive normalisation
        # so the pipeline can skip a redundant geocode.
        clean = normalize_listing(_raw(lat=43.6654, lng=-79.3176))
        assert clean is not None
        assert clean.lat == 43.6654 and clean.lng == -79.3176

    def test_coords_default_none_when_source_omits_them(self):
        clean = normalize_listing(_raw())
        assert clean is not None
        assert clean.lat is None and clean.lng is None
