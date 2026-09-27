from datetime import datetime

import pytest

from app.schemas.backtesting import BenchmarkImportRecord
from app.services.backtesting_service import calculate_metrics, normalize
from app.services.benchmark_service import normalize_route


def test_normalize_uses_first_period_as_100() -> None:
    assert normalize([10, 20, 15]) == [100.0, 200.0, 150.0]


def test_backtest_metrics_match_known_series() -> None:
    metrics = calculate_metrics([100, 110, 120], [100, 105, 115])
    assert metrics["status"] == "valid"
    assert metrics["observation_count"] == 3
    assert metrics["mae"] == pytest.approx(3.333333, abs=0.00001)
    assert metrics["rmse"] == pytest.approx(4.082483, abs=0.00001)
    assert metrics["directional_accuracy"] == 100
    assert metrics["bias"] == pytest.approx(3.333333, abs=0.00001)


def test_backtest_metrics_return_insufficient_data() -> None:
    metrics = calculate_metrics([100, 101], [100, 102])
    assert metrics["status"] == "insufficient_data"
    assert metrics["correlation"] is None
    assert metrics["mae"] is None


def test_benchmark_record_requires_positive_value_and_provenance() -> None:
    record = BenchmarkImportRecord(
        benchmark_date="2026-01-01",
        route_code="DEL-BOM",
        benchmark_value=4500,
        source="dgca",
        source_type="dgca",
        dataset="official-fare-export",
        dataset_id="dgca-fares-2026-01",
        retrieved_at=datetime(2026, 9, 13),
        provenance={"organization": "Directorate General of Civil Aviation", "source_url": "https://example.invalid"},
    )
    assert record.source_type == "dgca"
    with pytest.raises(ValueError):
        BenchmarkImportRecord(
            benchmark_date="2026-01-01", route_code="DEL-BOM", benchmark_value=0,
            source="dgca", source_type="dgca", dataset="x", dataset_id="x",
            retrieved_at=datetime(2026, 9, 13),
        )


def test_all_representative_routes_normalize() -> None:
    assert [normalize_route(value) for value in ["Delhi -> Mumbai", "Delhi -> Bengaluru", "Mumbai -> Bengaluru", "Delhi -> Kolkata", "Bengaluru -> Hyderabad", "Chennai -> Delhi"]] == ["DEL-BOM", "DEL-BLR", "BOM-BLR", "DEL-CCU", "BLR-HYD", "MAA-DEL"]
