from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app
from app.services.airline_service import AirlineService
from app.services.backtesting_service import BacktestingService
from app.services.benchmark_service import BenchmarkService
from app.services.analytics_service import AnalyticsService
from app.services.index_service import IndexService
from app.services.indicator_service import IndicatorService
from app.services.observation_service import ObservationService
from app.services.quality_service import QualityService
from app.services.route_service import RouteService

client = TestClient(app)


def _override_db() -> None:
    app.dependency_overrides[get_db] = lambda: None


def test_routes_endpoint(monkeypatch) -> None:
    _override_db()
    monkeypatch.setattr(
        RouteService,
        "list_routes",
        AsyncMock(return_value=([SimpleNamespace(id="r1", route_code="DEL-BOM", origin="DEL", destination="BOM", origin_city=None, destination_city=None, is_active=True, created_at="2026-09-12T00:00:00Z", updated_at="2026-09-12T00:00:00Z")], 1)),
    )

    response = client.get("/api/v1/routes")

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["route_code"] == "DEL-BOM"
    app.dependency_overrides.clear()


def test_airlines_endpoint(monkeypatch) -> None:
    _override_db()
    monkeypatch.setattr(
        AirlineService,
        "list_airlines",
        AsyncMock(return_value=([SimpleNamespace(id="al1", airline_id="al1", airline_name="IndiGo", iata_code="6E", is_active=True, created_at="2026-09-12T00:00:00Z", updated_at="2026-09-12T00:00:00Z")], 1)),
    )

    response = client.get("/api/v1/airlines")

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["airline_name"] == "IndiGo"
    app.dependency_overrides.clear()


def test_observations_endpoint(monkeypatch) -> None:
    _override_db()
    monkeypatch.setattr(
        ObservationService,
        "list_observations",
        AsyncMock(
            return_value=(
                [
                    SimpleNamespace(
                        id="obs1",
                        route_id="r1",
                        data_source_id=None,
                        route_code="DEL-BOM",
                        origin="DEL",
                        destination="BOM",
                        airline_id="al1",
                        flight="6E123",
                        travel_date="2026-09-12",
                        search_date="2026-09-11",
                        advance_window=1,
                        fare_class="economy",
                        base_fare=2500,
                        taxes=900,
                        udf=100,
                        convenience_fee=50,
                        total_fare=3550,
                        availability="available",
                        source="synthetic",
                        source_type="synthetic",
                        collection_timestamp="2026-09-12T00:00:00Z",
                        cleaning_status="clean",
                        index_eligible=True,
                        organization=None,
                        dataset=None,
                        dataset_id=None,
                        version=None,
                        license=None,
                        terms_url=None,
                        reference_period=None,
                        retrieved_at=None,
                        created_at="2026-09-12T00:00:00Z",
                        updated_at="2026-09-12T00:00:00Z",
                    )
                ],
                1,
            )
        ),
    )

    response = client.get("/api/v1/observations?route=DEL-BOM&advance_window=1")

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["route_code"] == "DEL-BOM"
    app.dependency_overrides.clear()


def test_quality_endpoint(monkeypatch) -> None:
    _override_db()
    monkeypatch.setattr(
        QualityService,
        "get_quality_metrics",
        AsyncMock(
            return_value={
                "total_observations": 10,
                "valid_observations": 8,
                "invalid_observations": 2,
                "duplicate_observations": 1,
                "missing_field_observations": 1,
                "sold_out_observations": 0,
                "cancelled_observations": 0,
                "outlier_observations": 1,
                "available_observations": 6,
                "index_eligible_observations": 7,
                "completeness_rate": 0.9,
                "validity_rate": 0.8,
                "duplicate_rate": 0.1,
                "availability_rate": 0.6,
                "outlier_rate": 0.1,
            }
        ),
    )

    response = client.get("/api/v1/data-quality")

    assert response.status_code == 200
    assert response.json()["total_observations"] == 10
    app.dependency_overrides.clear()


def test_index_latest_endpoint(monkeypatch) -> None:
    _override_db()
    monkeypatch.setattr(
        IndexService,
        "get_latest_index",
        AsyncMock(
            return_value=SimpleNamespace(
                id="idx1",
                index_date="2026-09-12",
                index_value=101.5,
                base_period="2026-01-01",
                aggregation_method="weighted_average",
                observation_frequency="daily",
                route_weight_version="v1",
                created_at="2026-09-12T00:00:00Z",
            )
        ),
    )

    response = client.get("/api/v1/airfare-index/latest")

    assert response.status_code == 200
    assert response.json()["index_value"] == 101.5
    app.dependency_overrides.clear()


def test_index_history_endpoint(monkeypatch) -> None:
    _override_db()
    monkeypatch.setattr(
        IndexService,
        "list_indexes",
        AsyncMock(
            return_value=(
                [SimpleNamespace(
                    id="idx-history-1", index_date="2026-09-12", index_value=136.0,
                    methodology_config_id="methodology-v1", methodology_version="apix-v1.0",
                    base_period="2026-09-12", aggregation_method="weighted_average",
                    observation_frequency="daily", fare_metric="total_fare", outlier_method="iqr",
                    route_weight_version="apix-v1.0", created_at="2026-09-12T00:00:00Z",
                )],
                1,
            ),
        ),
    )
    response = client.get("/api/v1/airfare-index/history?start_date=2026-09-01&end_date=2026-09-30")
    assert response.status_code == 200
    assert response.json()["items"][0]["methodology_version"] == "apix-v1.0"
    assert response.json()["items"][0]["index_value"] == 136.0
    app.dependency_overrides.clear()


def test_analytics_overview_endpoint(monkeypatch) -> None:
    _override_db()
    monkeypatch.setattr(
        AnalyticsService,
        "get_overview",
        AsyncMock(
            return_value={
                "latest_index": {"index_date": "2026-09-12", "index_value": 101.5},
                "route_stats": [],
                "top_movers": {"increases": [], "decreases": []},
                "quality": {"total_observations": 1},
                "available_flights": 1,
                "airlines_count": 1,
                "quotes_collected": 1,
                "index_series": [],
                "sparkline": [101.5],
            }
        ),
    )

    response = client.get("/api/v1/analytics/overview")

    assert response.status_code == 200
    assert response.json()["latest_index"]["index_value"] == 101.5
    app.dependency_overrides.clear()


def test_analytics_route_and_availability_endpoints(monkeypatch) -> None:
    _override_db()
    monkeypatch.setattr(
        AnalyticsService,
        "get_route_stats",
        AsyncMock(return_value=[{"route_code": "DEL-BOM", "avg_fare": 3400, "availability_rate": 100.0}]),
    )
    monkeypatch.setattr(
        AnalyticsService,
        "get_availability",
        AsyncMock(return_value={"rate": 100.0, "available": 1, "limited": 0, "sold_out": 0, "cancelled": 0, "total": 1}),
    )

    route_response = client.get("/api/v1/analytics/routes/DEL-BOM")
    availability_response = client.get("/api/v1/analytics/availability")

    assert route_response.status_code == 200
    assert route_response.json()["route_code"] == "DEL-BOM"
    assert availability_response.status_code == 200
    assert availability_response.json()["rate"] == 100.0
    app.dependency_overrides.clear()


def test_analytics_methodology_endpoint(monkeypatch) -> None:
    _override_db()
    monkeypatch.setattr(
        AnalyticsService,
        "get_methodology_config",
        AsyncMock(
            return_value={
                "base_period": "2026-09-12",
                "aggregation_method": "weighted_average",
                "observation_frequency": "daily",
                "route_weight_version": "synthetic-demo-v1",
                "route_weights": {"DEL-BOM": 15, "DEL-BLR": 12},
            }
        ),
    )

    response = client.get("/api/v1/analytics/methodology")

    assert response.status_code == 200
    assert response.json()["base_period"] == "2026-09-12"
    assert response.json()["route_weights"]["DEL-BOM"] == 15
    app.dependency_overrides.clear()


def test_update_methodology_endpoint(monkeypatch) -> None:
    _override_db()
    monkeypatch.setattr(
        AnalyticsService,
        "update_methodology",
        AsyncMock(return_value={
            "id": "methodology-v2", "methodology_version": "apix-v1.1", "base_period": "2026-09-12",
            "aggregation_method": "weighted_average", "observation_frequency": "daily", "fare_metric": "total_fare",
            "outlier_method": "iqr", "route_weight_version": "apix-v1.1", "route_weights": {"DEL-BOM": 30}, "is_active": True,
        }),
    )
    response = client.put("/api/v1/analytics/methodology", json={
        "methodology_version": "apix-v1.1", "base_period": "2026-09-12", "aggregation_method": "weighted_average",
        "observation_frequency": "daily", "fare_metric": "total_fare", "outlier_method": "iqr", "route_weights": {"DEL-BOM": 30},
    })
    assert response.status_code == 200
    assert response.json()["methodology_version"] == "apix-v1.1"
    app.dependency_overrides.clear()


def test_update_methodology_rejects_unsupported_values() -> None:
    _override_db()
    response = client.put("/api/v1/analytics/methodology", json={
        "methodology_version": "apix-v1.1", "base_period": "not-a-date", "aggregation_method": "laspeyres",
        "observation_frequency": "weekly", "fare_metric": "base_fare", "outlier_method": "zscore", "route_weights": {"DEL-BOM": 0},
    })
    assert response.status_code == 422
    app.dependency_overrides.clear()


def test_benchmark_and_backtesting_endpoints(monkeypatch) -> None:
    _override_db()
    benchmark = SimpleNamespace(
        id="benchmark-1", benchmark_date="2026-01-01", route_code="DEL-BOM", benchmark_value=4500,
        benchmark_metric="average_purchase_fare", currency="INR", period_type="monthly", source="dgca",
        source_type="dgca", dataset="official", dataset_id="official-1", dataset_version="v1",
        source_document=None, source_url="https://example.invalid", reference_period="2026-01",
        retrieved_at="2026-09-13T00:00:00Z", license=None, provenance={"organization": "DGCA"}, notes=None,
        created_at="2026-09-13T00:00:00Z",
    )
    backtest = SimpleNamespace(
        id="backtest-1", benchmark_source="dgca", benchmark_dataset="official", benchmark_version="v1",
        methodology_version="apix-v1.0", route_scope="overall", start_date="2026-01-01", end_date="2026-03-01",
        frequency="monthly", observation_count=3, correlation=0.9, mae=1.2, rmse=1.5, directional_accuracy=100,
        bias=0.2, mape=1.1, stability=0.4, status="valid", series=[], route_results=[], created_at="2026-09-13T00:00:00Z",
    )
    monkeypatch.setattr(BenchmarkService, "list_benchmarks", AsyncMock(return_value=([benchmark], 1)))
    monkeypatch.setattr(BacktestingService, "list_results", AsyncMock(return_value=([backtest], 1)))
    benchmark_response = client.get("/api/v1/benchmarks/dgca")
    backtest_response = client.get("/api/v1/backtesting")
    assert benchmark_response.status_code == 200
    assert benchmark_response.json()["items"][0]["source_type"] == "dgca"
    assert backtest_response.status_code == 200
    assert backtest_response.json()["items"][0]["methodology_version"] == "apix-v1.0"
    app.dependency_overrides.clear()


def test_empty_benchmark_status(monkeypatch) -> None:
    _override_db()
    monkeypatch.setattr(BenchmarkService, "list_benchmarks", AsyncMock(return_value=([], 0)))
    response = client.get("/api/v1/benchmarks/dgca")
    assert response.status_code == 200
    assert response.json()["status"] == "source_not_imported"
    assert response.json()["items"] == []
    app.dependency_overrides.clear()


def test_mospi_cpi_endpoint_reports_empty_source(monkeypatch) -> None:
    _override_db()
    monkeypatch.setattr(
        IndicatorService,
        "inflation_context",
        AsyncMock(return_value={"status": "source_not_imported", "source_type": "mospi", "indicator_code": "CPI", "items": [], "apix_series": [], "comparison": None}),
    )
    response = client.get("/api/v1/indicators/mospi/cpi")
    assert response.status_code == 200
    assert response.json()["status"] == "source_not_imported"
    assert response.json()["items"] == []
    app.dependency_overrides.clear()
