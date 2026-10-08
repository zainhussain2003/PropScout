"""Synthetic tests only. No official data or raw workbook is stored here."""

import datetime as dt
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from hpi_store import (
    import_records,
    month_key,
    normalize,
    private_path,
    query,
    workbook_records,
)
from crea_monthly import monthly_records


def observation(**changes):
    return {
        "market": "Synthetic Harbour",
        "housing_type": "Apartment",
        "month": "2030-01",
        "benchmark_price": 123456,
        "hpi_index": 100,
        "change_1m": 0,
        **changes,
    }


class HpiStoreTests(unittest.TestCase):
    def test_derived_changes_use_exact_history_and_refresh_after_revisions(self):
        import_records(
            self.database,
            [
                observation(month="2030-01", hpi_index=100),
                observation(month="2030-02", hpi_index=110),
            ],
            "synthetic",
            synthetic=True,
            derive_changes=True,
        )
        row = query(self.database, "Synthetic Harbour", "Apartment", "2030-02")[
            "benchmark"
        ]
        self.assertAlmostEqual(row["change_1m"], 10)
        self.assertIsNone(row["change_6m"])
        self.assertEqual(row["change_basis"], "derived_hpi_exact_months")
        import_records(
            self.database,
            [
                observation(month="2030-01", hpi_index=110),
                observation(month="2030-04", hpi_index=121),
            ],
            "synthetic-revision",
            synthetic=True,
            derive_changes=True,
        )
        self.assertAlmostEqual(
            query(self.database, "Synthetic Harbour", "Apartment", "2030-02")[
                "benchmark"
            ]["change_1m"],
            0,
        )
        self.assertIsNone(
            query(self.database, "Synthetic Harbour", "Apartment", "2030-04")[
                "benchmark"
            ]["change_1m"]
        )
        with self.assertRaises(ValueError):
            import_records(self.database, [observation()], "synthetic", synthetic=True)

    def test_official_adapter_preserves_absent_housing_types(self):
        class Sheet:
            title = "SYNTHETIC_HARBOUR"

            def iter_rows(self, **kwargs):
                return iter(
                    [
                        ("Date", "Composite_HPI", "Composite_Benchmark"),
                        (dt.date(2030, 1, 1), 100, 123456),
                    ]
                )

        class Workbook:
            def __iter__(self):
                return iter([Sheet()])

            def close(self):
                pass

        with patch("openpyxl.load_workbook", return_value=Workbook()):
            rows = list(monthly_records("Not Seasonally Adjusted (M).xlsx"))
            self.assertEqual(len(rows), 4)
            self.assertIsNone(rows[-1]["benchmark_price"])
            self.assertEqual(rows[0]["market"], "SYNTHETIC HARBOUR")
            with self.assertRaises(ValueError):
                list(monthly_records("Seasonally Adjusted (M).xlsx"))

    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.database = Path(self.folder.name) / "synthetic.sqlite"

    def tearDown(self):
        self.folder.cleanup()

    def test_append_revision_new_market_and_missing_values(self):
        import_records(self.database, [observation()], "synthetic-v1", synthetic=True)
        import_records(
            self.database,
            [
                observation(benchmark_price=234567),
                observation(month="2030-02", change_1m=None),
                observation(market="Synthetic New Market", hpi_index=None),
            ],
            "synthetic-v2",
            synthetic=True,
        )
        self.assertEqual(len(query(self.database)["choices"]), 3)
        row = query(self.database, "Synthetic Harbour", "Apartment", "2030-01")[
            "benchmark"
        ]
        self.assertEqual(row["benchmark_price"], 234567)
        self.assertEqual(row["change_1m"], 0)
        self.assertIsNone(row["change_5y"])
        import_records(
            self.database,
            [observation(benchmark_price=234567)],
            "synthetic-v2",
            synthetic=True,
        )
        self.assertEqual(len(query(self.database)["choices"]), 3)

    def test_duplicate_and_bad_rows_do_not_partially_import(self):
        import_records(self.database, [observation()], "synthetic", synthetic=True)
        for records in (
            [observation(), observation()],
            [observation(month="2030-02"), observation(month="bad")],
        ):
            with self.assertRaises(ValueError):
                import_records(self.database, records, "synthetic", synthetic=True)
            self.assertEqual(len(query(self.database)["choices"]), 1)

    def test_cannot_mix_official_and_synthetic(self):
        import_records(self.database, [observation()], "synthetic", synthetic=True)
        with self.assertRaises(ValueError):
            import_records(self.database, [observation()], "synthetic", synthetic=False)

    def test_month_and_missing_semantics(self):
        self.assertEqual(month_key(dt.datetime(2030, 2, 28)), "2030-02")
        self.assertIsNone(normalize(observation(hpi_index=".."))["hpi_index"])
        self.assertEqual(normalize(observation(change_1m="-2.5%"))["change_1m"], -2.5)
        for changes in (
            {"month": "2030-13"},
            {"housing_type": "unknown"},
            {"hpi_index": "NaN"},
            {"benchmark_price": -1},
        ):
            with self.assertRaises(ValueError):
                normalize(observation(**changes))

    def test_reject_git_checkout_paths_and_symlink_escape(self):
        root = Path(self.folder.name) / "checkout"
        root.mkdir()
        (root / ".git").write_text("gitdir: elsewhere")
        with self.assertRaises(ValueError):
            private_path(root / "raw.xlsx")
        self.assertEqual(private_path(self.database), self.database.resolve())

    def test_query_does_not_create_database_and_uses_exact_keys(self):
        with self.assertRaises(Exception):
            query(self.database)
        self.assertFalse(self.database.exists())
        import_records(self.database, [observation()], "synthetic", synthetic=True)
        self.assertIsNone(
            query(self.database, "' OR 1=1 --", "Apartment", "2030-01")["benchmark"]
        )

    def test_explicit_sheet_mapping_and_percentage_units(self):
        class Sheet:
            def iter_rows(self, **kwargs):
                return iter(
                    [
                        ("Area", "Type", "Month", "Change"),
                        ("Synthetic Harbour", "Composite", dt.date(2030, 1, 1), 0.025),
                    ]
                )

        class Workbook:
            def __getitem__(self, name):
                return Sheet()

            def close(self):
                pass

        layout = {
            "sheets": [
                {
                    "name": "Synthetic",
                    "columns": {
                        "market": "Area",
                        "housing_type": "Type",
                        "month": "Month",
                        "change_1m": "Change",
                    },
                    "percentage_units": "fraction",
                }
            ]
        }
        with patch("openpyxl.load_workbook", return_value=Workbook()) as load:
            row = list(workbook_records("synthetic.xlsx", layout))[0]
            self.assertEqual(row["change_1m"], 2.5)
            self.assertIsNone(row["benchmark_price"])
            load.assert_called_once_with(
                "synthetic.xlsx", read_only=True, data_only=True
            )
            layout["sheets"][0]["columns"]["month"] = "Missing header"
            with self.assertRaises(ValueError):
                list(workbook_records("synthetic.xlsx", layout))


if __name__ == "__main__":
    unittest.main()
