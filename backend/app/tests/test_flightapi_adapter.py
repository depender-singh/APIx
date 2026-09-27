import asyncio
from datetime import date
from decimal import Decimal

import httpx
import pytest

from app.schemas.collection import CollectionRequest
from app.services.fare_source import FlightAPIAdapter, describe_http_error_response, describe_response_structure, normalize_raw_record


def request() -> CollectionRequest:
    return CollectionRequest(
        origin="DEL",
        destination="BOM",
        route_code="DEL-BOM",
        travel_date=date(2026, 9, 15),
        search_date=date(2026, 9, 14),
        advance_window=1,
        source="FlightAPI",
        source_type="licensed_flight_provider",
        request_parameters={"currency": "INR", "cabin_class": "Economy", "region": "IN"},
    )


def payload() -> dict[str, object]:
    return {
        "carriers": [{"id": -1, "name": "Example Air"}],
        "legs": [{"id": "leg-1", "segment_ids": ["segment-1"]}],
        "segments": [{"id": "segment-1", "marketing_carrier_id": -1, "marketing_flight_number": "EX123"}],
        "itineraries": [{
            "leg_ids": ["leg-1"],
            "pricing_options": [{
                "price": {"amount": 5234.0, "update_status": "current", "last_updated": "2026-09-14T10:00:00Z"},
                "fares": [{"fare_family": "ECONOMY", "booking_code": "Y"}],
            }],
        }],
    }


def test_flightapi_parser_maps_total_only_fare() -> None:
    records = FlightAPIAdapter.parse_response(payload(), request(), source_url="https://api.flightapi.io/onewaytrip")
    assert len(records) == 1
    record = records[0]
    assert record.source_name == "FlightAPI"
    assert record.source_type == "licensed_flight_provider"
    assert record.airline == "Example Air"
    assert record.flight_number == "EX123"
    assert record.fare_class == "ECONOMY"
    assert record.total_fare == Decimal("5234.0")
    assert record.base_fare is None
    assert record.taxes is None
    assert record.currency == "INR"
    normalized = normalize_raw_record(record, "raw-1", "route-1", "airline-1")
    assert normalized["index_eligible"] is False
    assert normalized["total_fare"] == Decimal("5234.0")


def test_flightapi_parser_handles_empty_results() -> None:
    assert FlightAPIAdapter.parse_response({"itineraries": []}, request(), source_url="https://api.flightapi.io/onewaytrip") == []


def test_flightapi_parser_preserves_multiple_segments_and_legs() -> None:
    value = payload()
    value["legs"] = [
        {"id": "leg-1", "segment_ids": ["segment-1", "segment-2"]},
        {"id": "leg-2", "segment_ids": ["segment-3"]},
    ]
    value["segments"] = [
        {"id": "segment-1", "marketing_carrier_id": -1, "marketing_flight_number": "EX123"},
        {"id": "segment-2", "marketing_carrier_id": -1, "marketing_flight_number": "EX124"},
        {"id": "segment-3", "marketing_carrier_id": -1, "marketing_flight_number": "EX125"},
    ]
    value["itineraries"] = [
        value["itineraries"][0],
        {"leg_ids": ["leg-2"], "pricing_options": [{"price": {"amount": 6000}, "fares": []}]},
    ]
    records = FlightAPIAdapter.parse_response(value, request(), source_url="https://api.flightapi.io/onewaytrip")
    assert len(records) == 2
    assert [record.flight_number for record in records] == ["EX123", "EX125"]


@pytest.mark.parametrize("bad_payload", [
    None,
    {"itineraries": "invalid"},
    {"legs": [], "segments": [], "itineraries": [{"leg_ids": ["missing"], "pricing_options": []}]},
    {"legs": [{"id": "leg-1", "segment_ids": ["missing"]}], "segments": [], "itineraries": [{"leg_ids": ["leg-1"], "pricing_options": []}]},
])
def test_flightapi_parser_rejects_malformed_results(bad_payload: object) -> None:
    with pytest.raises(ValueError):
        FlightAPIAdapter.parse_response(bad_payload, request(), source_url="https://api.flightapi.io/onewaytrip")


def test_flightapi_adapter_requires_configuration() -> None:
    with pytest.raises(ValueError, match="FLIGHTAPI_API_KEY"):
        import asyncio
        asyncio.run(FlightAPIAdapter(api_key=None).collect(request()))


def test_response_structure_diagnostic_redacts_values_and_preserves_relationships() -> None:
    value = payload() | {
        "request": {"api_key": "provider-secret", "fare": "unnecessary-large-value"},
        "segments": {"segment-1": payload()["segments"][0]},
    }

    diagnostic = describe_response_structure(value)
    serialized = str(diagnostic)

    assert "provider-secret" not in serialized
    assert "unnecessary-large-value" not in serialized
    assert "api_key" not in serialized
    assert diagnostic["top_level_type"] == "object"
    assert diagnostic["itineraries"]["type"] == "array"
    assert diagnostic["itineraries"]["records"][0]["references"]["leg_ids"]["items"][0] == diagnostic["legs"]["records"][0]["references"]["id"]["value"]
    assert diagnostic["segments"]["keys"][0] == diagnostic["segments"]["records"][0]["references"]["id"]["value"]


def test_parse_failure_emits_diagnostic_only_on_parse_failure(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
    class Response:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {"itineraries": [{"leg_ids": []}], "request": {"api_key": "secret"}}

    class Client:
        async def __aenter__(self) -> "Client":
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

        async def get(self, *args: object, **kwargs: object) -> Response:
            return Response()

    monkeypatch.setattr("app.services.fare_source.httpx.AsyncClient", lambda **kwargs: Client())
    caplog.set_level("WARNING", logger="app.services.fare_source")

    result = __import__("asyncio").run(FlightAPIAdapter(api_key="secret").collect(request()))

    assert result.failure_category == "parse_error"
    assert "TEMPORARY PHASE 9B LIVE PAYLOAD DIAGNOSTIC" in caplog.text
    assert "secret" not in caplog.text


def test_successful_parse_does_not_emit_diagnostic(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
    class Response:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return payload()

    class Client:
        async def __aenter__(self) -> "Client":
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

        async def get(self, *args: object, **kwargs: object) -> Response:
            return Response()

    monkeypatch.setattr("app.services.fare_source.httpx.AsyncClient", lambda **kwargs: Client())
    caplog.set_level("WARNING", logger="app.services.fare_source")

    result = __import__("asyncio").run(FlightAPIAdapter(api_key="secret").collect(request()))

    assert result.records
    assert "TEMPORARY PHASE 9B LIVE PAYLOAD DIAGNOSTIC" not in caplog.text


def _http_error_response(body: object, *, content_type: str = "application/json") -> httpx.Response:
    return httpx.Response(
        400,
        headers={"content-type": content_type},
        json=body if content_type == "application/json" else None,
        content=body if content_type != "application/json" else None,
        request=httpx.Request("GET", "https://provider.example.test/error"),
    )


def _mock_http_client(monkeypatch: pytest.MonkeyPatch, response: httpx.Response) -> None:
    class Client:
        async def __aenter__(self) -> "Client":
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

        async def get(self, *args: object, **kwargs: object) -> httpx.Response:
            return response

    monkeypatch.setattr("app.services.fare_source.httpx.AsyncClient", lambda **kwargs: Client())


def test_http_error_json_diagnostic_is_bounded_and_preserves_result(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
    response = _http_error_response({"error": {"code": "INVALID_REQUEST", "message": "date rejected"}, "fare": "not logged"})
    _mock_http_client(monkeypatch, response)
    caplog.set_level("WARNING", logger="app.services.fare_source")

    result = asyncio.run(FlightAPIAdapter(api_key="test-key").collect(request()))

    assert result.failure_category == "http_error"
    assert result.failed_count == 1
    assert "TEMPORARY PHASE 9B LIVE HTTP ERROR DIAGNOSTIC" in caplog.text
    assert "INVALID_REQUEST" in caplog.text
    assert "date rejected" in caplog.text
    assert "not logged" not in caplog.text


def test_http_error_non_json_diagnostic_excludes_body(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
    body = b"provider diagnostic body must not be logged"
    response = _http_error_response(body, content_type="text/plain")
    _mock_http_client(monkeypatch, response)
    caplog.set_level("WARNING", logger="app.services.fare_source")

    result = asyncio.run(FlightAPIAdapter(api_key="test-key").collect(request()))

    assert result.failure_category == "http_error"
    assert "non_json" in caplog.text
    assert "provider diagnostic body must not be logged" not in caplog.text


def test_http_error_diagnostic_redacts_sensitive_fields_and_urls(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
    response = _http_error_response({
        "message": "request rejected",
        "api_key": "test-provider-key",
        "Authorization": "Bearer test-token",
        "access_token": "test-access-token",
        "detail": "https://provider.example.test/error?token=test-token",
    })
    _mock_http_client(monkeypatch, response)
    caplog.set_level("WARNING", logger="app.services.fare_source")

    asyncio.run(FlightAPIAdapter(api_key="test-provider-key").collect(request()))

    assert "test-provider-key" not in caplog.text
    assert "test-token" not in caplog.text
    assert "test-access-token" not in caplog.text
    assert "https://provider.example.test/error" not in caplog.text
    assert "[REDACTED_KEY]" in caplog.text
    assert "<REDACTED_URL>" in caplog.text


def test_http_error_diagnostic_bounds_oversized_body() -> None:
    response = _http_error_response({"message": "x" * 20_000})
    diagnostic = describe_http_error_response(response)

    assert diagnostic["body_length"] > 8192
    assert diagnostic["inspected_bytes"] == 8192
    assert "x" * 201 not in str(diagnostic)


def test_http_error_diagnostic_bounds_nested_json() -> None:
    nested: object = {"message": "safe"}
    for _ in range(10):
        nested = {"detail": nested}
    response = _http_error_response(nested)
    diagnostic = describe_http_error_response(response)

    assert diagnostic["body_classification"] == "json"
    assert "truncated" in str(diagnostic)


def test_http_error_diagnostic_has_no_credentials_or_auth_header() -> None:
    response = _http_error_response({"api_key": "test-key", "authorization": "Bearer test-token", "message": "bad request"})
    diagnostic = describe_http_error_response(response)

    serialized = str(diagnostic)
    assert "test-key" not in serialized
    assert "test-token" not in serialized
    assert "authorization" not in serialized.lower()


def test_successful_http_response_does_not_emit_http_error_diagnostic(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
    class Response:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return payload()

    class Client:
        async def __aenter__(self) -> "Client":
            return self

        async def __aexit__(self, *args: object) -> None:
            return None

        async def get(self, *args: object, **kwargs: object) -> Response:
            return Response()

    monkeypatch.setattr("app.services.fare_source.httpx.AsyncClient", lambda **kwargs: Client())
    caplog.set_level("WARNING", logger="app.services.fare_source")

    result = asyncio.run(FlightAPIAdapter(api_key="test-key").collect(request()))

    assert result.records
    assert "TEMPORARY PHASE 9B LIVE HTTP ERROR DIAGNOSTIC" not in caplog.text
    assert "TEMPORARY PHASE 9B LIVE PAYLOAD DIAGNOSTIC" not in caplog.text