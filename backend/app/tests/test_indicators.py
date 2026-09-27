import asyncio
from datetime import datetime
from types import SimpleNamespace

import pytest

from app.schemas.indicator import IndicatorImportRecord
from app.services.indicator_service import IndicatorService
from app.services.mospi_source import MoSPIIndicatorSource
from decimal import Decimal


def official_record() -> IndicatorImportRecord:
    return IndicatorImportRecord(
        source_type="mospi",
        organization="Ministry of Statistics and Programme Implementation",
        source="eSankhyiki",
        dataset_name="Consumer Price Index",
        dataset_id="CPI",
        indicator_code="CPI",
        indicator_name="Consumer Price Index",
        geography="All India",
        unit="index",
        observation_date="2026-01-01",
        value=Decimal("107.94"),
        base_period="2024=100",
        frequency="monthly",
        reference_period="2026-01",
        source_url="https://api.mospi.gov.in/api/cpi/getCPIData?base_year=2024&level=Group&page=1&limit=20&isView=table&series=Current",
        retrieved_at=datetime(2026, 9, 13),
        provenance={
            "source_type": "mospi",
            "source": "eSankhyiki",
            "organization": "Ministry of Statistics and Programme Implementation",
            "dataset_id": "CPI",
            "base_year": 2024,
            "series": "Current",
            "state": "All India",
            "sector": "Combined",
            "year": 2026,
            "month": 1,
        },
        is_official=True,
        base_year=2024,
        series="Current",
        year=2026,
        month=1,
        state="All India",
        sector="Combined",
        division="CPI (General)",
        index_value=Decimal("107.94"),
        inflation_value=Decimal("4.45"),
    )


def test_mospi_provenance_validation() -> None:
    record = official_record()
    assert MoSPIIndicatorSource.normalize_records([record])[0].source_type == "mospi"
    with pytest.raises(ValueError):
        MoSPIIndicatorSource.normalize_records([IndicatorImportRecord(**{**record.model_dump(), "source_url": None})])
    with pytest.raises(ValueError):
        IndicatorImportRecord(**{**record.model_dump(), "source": "synthetic"})


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("base_year", 2012),
        ("month", 13),
        ("index_value", "NaN"),
        ("inflation_value", "Infinity"),
    ],
)
def test_invalid_cpi_fields_are_rejected(field: str, value: object) -> None:
    with pytest.raises(ValueError):
        IndicatorImportRecord(**{**official_record().model_dump(), field: value})


def test_missing_cpi_dimensions_and_provenance_are_rejected() -> None:
    record = official_record().model_dump()
    with pytest.raises(ValueError):
        IndicatorImportRecord(**{**record, "sector": None})
    with pytest.raises(ValueError):
        IndicatorImportRecord(**{**record, "provenance": {}})


def test_index_and_inflation_are_distinct() -> None:
    record = official_record()
    assert record.index_value == Decimal("107.94")
    assert record.inflation_value == Decimal("4.45")
    assert record.value == record.index_value


def test_indicator_id_is_deterministic() -> None:
    first = IndicatorService._record_id(official_record())
    second = IndicatorService._record_id(official_record())
    assert first == second
    assert first != IndicatorService._record_id(official_record().model_copy(update={"month": 2}))


class FakeSession:
    def __init__(self) -> None:
        self.rows: dict[str, SimpleNamespace] = {}

    async def get(self, _model: object, record_id: str) -> SimpleNamespace | None:
        return self.rows.get(record_id)

    def add(self, row: SimpleNamespace) -> None:
        self.rows[row.id] = row

    async def commit(self) -> None:
        return None


def test_import_is_idempotent() -> None:
    async def run() -> None:
        session = FakeSession()
        service = IndicatorService(session)  # type: ignore[arg-type]
        first = await service.import_mospi([official_record()])
        second = await service.import_mospi([official_record()])
        assert first["status"] == "imported"
        assert first["fetched"] == 1
        assert first["accepted"] == 1
        assert first["inserted"] == 1
        assert first["skipped_duplicates"] == 0
        assert second["inserted"] == 0
        assert second["skipped_duplicates"] == 1
        assert len(session.rows) == 1

    asyncio.run(run())


def test_inflation_context_uses_verified_default_cpi_filter(monkeypatch) -> None:
    captured: dict[str, object] = {}

    async def fake_list(_service: IndicatorService, **kwargs: object) -> tuple[list[object], int]:
        captured.update(kwargs)
        return [], 0

    monkeypatch.setattr(IndicatorService, "list_indicators", fake_list)

    async def run() -> dict[str, object]:
        return await IndicatorService(object()).inflation_context()  # type: ignore[arg-type]

    result = asyncio.run(run())
    assert result["status"] == "source_not_imported"
    assert captured == {
        "source_type": "mospi",
        "indicator_code": "CPI",
        "start_date": None,
        "end_date": None,
        "geography": "All India",
        "frequency": "monthly",
        "base_year": 2024,
        "series": "Current",
        "sector": "Combined",
        "division": "CPI (General)",
        "page_size": 500,
    }


def test_indicator_schema_rejects_invalid_value_and_date() -> None:
    with pytest.raises(ValueError):
        IndicatorImportRecord(**{**official_record().model_dump(), "value": "not-a-number"})
    with pytest.raises(ValueError):
        IndicatorImportRecord(**{**official_record().model_dump(), "observation_date": "not-a-date"})
