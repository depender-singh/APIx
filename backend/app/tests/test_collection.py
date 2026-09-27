import asyncio
from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.models.airline import Airline
from app.models.data_source import DataSource
from app.models.observation import Observation
from app.models.raw_observation import RawObservation
from app.models.route import Route
from app.schemas.collection import CollectionJobCreate, CollectionRequest
from app.services.collection_service import CollectionService, build_normalized_observation
from app.services.fare_source import MockFareSourceAdapter, normalize_raw_record, payload_hash, sanitize_request_parameters
from app.services.quality_service import QualityService


def request() -> CollectionRequest:
    return CollectionRequest(
        origin="DEL",
        destination="BOM",
        route_code="DEL-BOM",
        travel_date=date(2026, 10, 1),
        search_date=date(2026, 9, 24),
        advance_window=7,
        source="synthetic-demo",
        source_type="synthetic",
    )


def test_collection_request_validates_canonical_window_and_route() -> None:
    assert request().advance_window == 7
    with pytest.raises(ValueError):
        CollectionRequest(**{**request().model_dump(), "advance_window": 6})
    with pytest.raises(ValueError):
        CollectionRequest(**{**request().model_dump(), "route_code": "BOM-DEL"})


def test_job_rejects_noncanonical_windows() -> None:
    with pytest.raises(ValueError):
        CollectionJobCreate(id="job-1", name="bad", source_id="src-1", route_code="DEL-BOM", advance_windows=[2])


def test_mock_adapter_is_deterministic_and_synthetic() -> None:
    adapter = MockFareSourceAdapter()
    first = asyncio.run(adapter.collect(request()))
    second = asyncio.run(adapter.collect(request()))
    assert first.records[0].raw_payload == second.records[0].raw_payload
    assert first.records[0].total_fare == second.records[0].total_fare
    assert first.records[0].retrieved_at <= second.records[0].retrieved_at
    assert first.records[0].source_type == "synthetic"
    assert first.records[0].source_name == "synthetic-demo"
    assert first.records[0].total_fare == first.records[0].base_fare + first.records[0].taxes


def test_payload_hash_is_canonical() -> None:
    assert payload_hash({"b": 2, "a": 1}) == payload_hash({"a": 1, "b": 2})


def test_sensitive_request_parameters_are_redacted() -> None:
    result = sanitize_request_parameters({"currency": "INR", "api_key": "secret", "cookie": "private"})
    assert result == {"currency": "INR", "api_key": "[REDACTED]", "cookie": "[REDACTED]"}


def test_normalization_is_explicit_and_does_not_calculate_index() -> None:
    raw = asyncio.run(MockFareSourceAdapter().collect(request())).records[0]
    normalized = normalize_raw_record(raw, "raw-1", "route-1", "airline-1")
    assert normalized["raw_observation_id"] == "raw-1"
    assert normalized["cleaning_status"] == "raw"
    assert normalized["index_eligible"] is False
    assert "index_value" not in normalized


def test_normalization_rejects_missing_or_negative_fares() -> None:
    raw = asyncio.run(MockFareSourceAdapter().collect(request())).records[0]
    with pytest.raises(ValueError):
        normalize_raw_record(raw.model_copy(update={"total_fare": None}), "raw-1", "route-1", "airline-1")
    with pytest.raises(ValueError):
        normalize_raw_record(raw.model_copy(update={"base_fare": Decimal("-1")}), "raw-1", "route-1", "airline-1")


def _raw_observation(*, decomposition: bool = True) -> SimpleNamespace:
    return SimpleNamespace(
        id="raw-flightapi-1",
        source_id="source-flightapi",
        source_name="FlightAPI",
        source_type="licensed_flight_provider",
        source_url="https://api.flightapi.io/onewaytrip",
        retrieved_at=__import__("datetime").datetime(2026, 9, 14),
        collection_timestamp=__import__("datetime").datetime(2026, 9, 14),
        request_parameters={"currency": "INR"},
        raw_payload={"provider": "fixture"},
        parser_version="flightapi-oneway-v1",
        route_code="DEL-BOM",
        origin="DEL",
        destination="BOM",
        travel_date=date(2026, 9, 14),
        search_date=date(2026, 9, 13),
        advance_window=1,
        airline="Air India",
        flight_number="809",
        fare_class="ECONOMY" if decomposition else None,
        base_fare=Decimal("90000") if decomposition else None,
        taxes=Decimal("16630") if decomposition else None,
        udf=Decimal("100") if decomposition else None,
        convenience_fee=Decimal("50") if decomposition else None,
        total_fare=Decimal("106630"),
        currency="INR",
        availability="unknown",
        raw_status="pending",
        normalized_observation_id=None,
        source_status="received",
    )


def _normalization_context() -> tuple[SimpleNamespace, SimpleNamespace, SimpleNamespace]:
    route = SimpleNamespace(id="r1", route_code="DEL-BOM")
    airline = SimpleNamespace(id="al2", airline_id="al2", airline_name="Air India")
    source = SimpleNamespace(
        id="source-flightapi",
        organization="FlightAPI",
        dataset=None,
        dataset_id=None,
        version=None,
        license=None,
        terms_url=None,
        reference_period=None,
    )
    return route, airline, source


def test_flightapi_total_only_normalization_rejects_missing_decomposition() -> None:
    route, airline, source = _normalization_context()
    values = build_normalized_observation(_raw_observation(decomposition=False), route, airline, source)
    assert values["base_fare"] is None
    assert values["taxes"] is None
    assert values["udf"] is None
    assert values["convenience_fee"] is None
    assert values["fare_completeness"] == "total_only"
    assert values["fare_class"] is None
    assert values["currency"] == "INR"
    assert values["total_fare"] == Decimal("106630")


def test_normalized_observation_preserves_provenance_and_fare_values() -> None:
    route, airline, source = _normalization_context()
    values = build_normalized_observation(_raw_observation(), route, airline, source)

    assert values["id"] == "normalized-raw-flightapi-1"
    assert values["route_id"] == "r1"
    assert values["airline_id"] == "al2"
    assert values["data_source_id"] == "source-flightapi"
    assert values["source"] == "FlightAPI"
    assert values["source_type"] == "licensed_flight_provider"
    assert values["total_fare"] == Decimal("106630")
    assert values["base_fare"] == Decimal("90000")
    assert values["taxes"] == Decimal("16630")
    assert values["udf"] == Decimal("100")
    assert values["convenience_fee"] == Decimal("50")
    assert values["fare_completeness"] == "complete"
    assert values["index_eligible"] is False
    assert "raw_observation_id" not in values


def test_normalized_observation_id_stays_within_schema_limit_for_long_raw_id() -> None:
    route, airline, source = _normalization_context()
    values = build_normalized_observation(
        SimpleNamespace(**{**vars(_raw_observation()), "id": "raw-" + "x" * 120}), route, airline, source
    )

    assert len(values["id"]) <= 64


class _NormalizationSession:
    def __init__(self, raw: SimpleNamespace, route: SimpleNamespace, airline: SimpleNamespace, source: SimpleNamespace) -> None:
        self.raw = raw
        self.route = route
        self.airline = airline
        self.source = source
        self.observation: Observation | None = None
        self.commits = 0

    async def get(self, model: object, identifier: str) -> object | None:
        if model is RawObservation:
            return self.raw
        if model is DataSource:
            return self.source
        if model is Observation:
            return self.observation if self.observation is not None and self.observation.id == identifier else None
        return None

    async def execute(self, statement: object) -> object:
        entity = statement.column_descriptions[0]["entity"]
        value = self.route if entity is Route else self.airline

        class Result:
            def scalar_one_or_none(self) -> object:
                return value

        return Result()

    async def scalar(self, statement: object) -> object | None:
        entity = statement.column_descriptions[0].get("entity")
        if entity is Route:
            return self.route
        if entity is Airline:
            return self.airline
        return None

    def add(self, observation: Observation) -> None:
        self.observation = observation

    async def commit(self) -> None:
        self.commits += 1

    async def refresh(self, _observation: object) -> None:
        return None


def test_raw_status_transition_and_repeat_processing_are_idempotent() -> None:
    raw = _raw_observation(decomposition=False)
    route, airline, source = _normalization_context()
    session = _NormalizationSession(raw, route, airline, source)
    service = CollectionService(session)

    first = asyncio.run(service.normalize_raw_observation(raw.id))
    second = asyncio.run(service.normalize_raw_observation(raw.id))

    assert first.id == "normalized-raw-flightapi-1"
    assert second is first
    assert raw.raw_status == "normalized"
    assert raw.normalized_observation_id == first.id
    assert session.commits == 3
    assert session.observation is first


def test_total_only_observation_cleaning_preserves_missing_components() -> None:
    observation = SimpleNamespace(
        id="normalized-raw-flightapi-1",
        route_code="DEL-BOM",
        airline_id="al2",
        travel_date=date(2026, 9, 14),
        search_date=date(2026, 9, 13),
        advance_window=1,
        source="FlightAPI",
        fare_class=None,
        flight="809",
        base_fare=None,
        taxes=None,
        udf=None,
        convenience_fee=None,
        total_fare=Decimal("106630"),
        availability="unknown",
        cleaning_status="raw",
        index_eligible=False,
        fare_completeness="total_only",
    )

    class QualitySession:
        async def get(self, model: object, identifier: str) -> object:
            return observation

        async def scalar(self, statement: object) -> object | None:
            if statement.column_descriptions[0].get("entity") is Observation:
                return None
            return SimpleNamespace()

        async def commit(self) -> None:
            return None

        async def refresh(self, value: object) -> None:
            return None

    cleaned = asyncio.run(QualityService(QualitySession()).clean_observation(observation.id))
    assert cleaned.cleaning_status == "clean"
    assert cleaned.index_eligible is False
    assert cleaned.fare_completeness == "total_only"
    assert cleaned.total_fare == Decimal("106630")
    assert cleaned.base_fare is None
    assert cleaned.taxes is None
