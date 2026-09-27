import asyncio
from datetime import date
from decimal import Decimal

import httpx
import pytest

from app.schemas.indicator import IndicatorImportRequest
from app.services.mospi_source import MoSPIIndicatorSource


def import_request(start: str = "2025-01-01", end: str = "2025-02-01") -> IndicatorImportRequest:
    return IndicatorImportRequest(start_period=start, end_period=end, page_size=1)


def cpi_row(month: str, index: str, inflation: str | None) -> dict[str, object]:
    return {
        "base_year": "2024",
        "series": "Current",
        "year": "2025",
        "month": month,
        "state": "All India",
        "sector": "Combined",
        "division": "CPI (General)",
        "group": None,
        "class": None,
        "sub_class": None,
        "item": None,
        "code": None,
        "index": index,
        "inflation": inflation,
        "imputation": None,
    }


def payload(rows: list[dict[str, object]], page: int, total_pages: int) -> dict[str, object]:
    return {
        "data": rows,
        "meta_data": {"page": page, "totalRecords": 2, "totalPages": total_pages, "recordPerPage": 1},
        "msg": "Data fetched successfully",
        "statusCode": True,
    }


class FakeResponse:
    def __init__(self, body: object) -> None:
        self.body = body

    def raise_for_status(self) -> None:
        return None

    def json(self) -> object:
        return self.body


class FakeClient:
    def __init__(self, responses: list[object]) -> None:
        self.responses = responses
        self.params: list[dict[str, object]] = []

    async def __aenter__(self) -> "FakeClient":
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def get(self, _url: str, params: dict[str, object]) -> FakeResponse:
        self.params.append(params)
        return FakeResponse(self.responses[len(self.params) - 1])


def test_fetch_cpi_maps_dimensions_values_and_paginates(monkeypatch) -> None:
    client = FakeClient([
        payload([cpi_row("January", "104.10", None)], 1, 2),
        payload([cpi_row("February", "104.30", "3.20")], 2, 2),
    ])
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_kwargs: client)

    result = asyncio.run(MoSPIIndicatorSource.fetch_cpi(import_request()))

    assert result.fetched == 2
    assert result.rejected == 0
    assert result.pages == 2
    assert [record.month for record in result.records] == [1, 2]
    assert result.records[0].index_value == Decimal("104.10")
    assert result.records[0].inflation_value is None
    assert result.records[1].inflation_value == Decimal("3.20")
    assert result.records[0].division == "CPI (General)"
    assert client.params[0]["state_code"] == 1
    assert client.params[0]["sector_code"] == 3
    assert client.params[0]["division_code"] == 0
    assert client.params[0]["year"] == "2025"
    assert "getCPIData" in (result.records[0].source_url or "")


def test_fetch_cpi_rejects_malformed_response(monkeypatch) -> None:
    client = FakeClient([{"data": []}])
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_kwargs: client)

    with pytest.raises(ValueError, match="invalid structure"):
        asyncio.run(MoSPIIndicatorSource.fetch_cpi(import_request()))


def test_fetch_cpi_handles_timeout(monkeypatch) -> None:
    class TimeoutClient(FakeClient):
        async def get(self, _url: str, params: dict[str, object]) -> FakeResponse:
            raise httpx.TimeoutException("timeout")

    monkeypatch.setattr(httpx, "AsyncClient", lambda **_kwargs: TimeoutClient([]))

    with pytest.raises(ValueError, match="timed out"):
        asyncio.run(MoSPIIndicatorSource.fetch_cpi(import_request()))


def test_fetch_cpi_handles_http_failure(monkeypatch) -> None:
    class ErrorClient(FakeClient):
        async def get(self, _url: str, params: dict[str, object]) -> FakeResponse:
            request = httpx.Request("GET", MoSPIIndicatorSource.cpi_endpoint)
            response = httpx.Response(503, request=request)
            raise httpx.HTTPStatusError("unavailable", request=request, response=response)

    monkeypatch.setattr(httpx, "AsyncClient", lambda **_kwargs: ErrorClient([]))

    with pytest.raises(ValueError, match="HTTP 503"):
        asyncio.run(MoSPIIndicatorSource.fetch_cpi(import_request()))


def test_import_request_is_bounded() -> None:
    with pytest.raises(ValueError, match="limited to 24 months"):
        IndicatorImportRequest(start_period=date(2024, 1, 1), end_period=date(2026, 2, 1))
