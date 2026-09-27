from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
import ssl
from urllib.parse import urlencode

import httpx

from app.schemas.indicator import IndicatorImportRecord, IndicatorImportRequest


@dataclass(frozen=True)
class CpiFetchResult:
    records: list[IndicatorImportRecord]
    fetched: int
    rejected: int
    pages: int


class MoSPIIndicatorSource:
    """Bounded client for the verified public MoSPI/eSankhyiki CPI API."""

    source_type = "mospi"
    organization = "Ministry of Statistics and Programme Implementation"
    source = "eSankhyiki"
    api_base_url = "https://api.mospi.gov.in/api"
    cpi_endpoint = f"{api_base_url}/cpi/getCPIData"
    request_timeout_seconds = 15.0
    max_pages = 100
    month_numbers = {
        "january": 1,
        "february": 2,
        "march": 3,
        "april": 4,
        "may": 5,
        "june": 6,
        "july": 7,
        "august": 8,
        "september": 9,
        "october": 10,
        "november": 11,
        "december": 12,
    }

    @classmethod
    def normalize_records(cls, records: list[IndicatorImportRecord]) -> list[IndicatorImportRecord]:
        normalized: list[IndicatorImportRecord] = []
        for record in records:
            if record.source_type != cls.source_type:
                raise ValueError("MoSPI imports must use source_type=mospi")
            if record.organization != cls.organization:
                raise ValueError("MoSPI organization metadata does not match the official organization")
            if record.source != cls.source:
                raise ValueError("MoSPI imports must use source=eSankhyiki")
            normalized.append(record)
        return normalized

    @classmethod
    async def fetch_cpi(cls, request: IndicatorImportRequest) -> CpiFetchResult:
        if request.records is not None:
            raise ValueError("fetch_cpi requires a controlled date range, not supplied records")
        assert request.start_period is not None and request.end_period is not None
        years = list(range(request.start_period.year, request.end_period.year + 1))
        params: dict[str, str | int] = {
            "base_year": request.base_year,
            "level": request.level,
            "limit": request.page_size,
            "isView": "table",
            "series": request.series,
            "state_code": request.state_code,
            "sector_code": request.sector_code,
            "division_code": request.division_code,
            "year": ",".join(str(year) for year in years),
        }
        records: list[IndicatorImportRecord] = []
        fetched = 0
        rejected = 0
        pages = 0
        async with httpx.AsyncClient(timeout=cls.request_timeout_seconds, verify=cls._ssl_context()) as client:
            for page in range(1, cls.max_pages + 1):
                page_params = {**params, "page": page}
                try:
                    response = await client.get(cls.cpi_endpoint, params=page_params)
                    response.raise_for_status()
                    payload = response.json()
                except httpx.TimeoutException as exc:
                    raise ValueError("MoSPI CPI request timed out") from exc
                except httpx.HTTPStatusError as exc:
                    raise ValueError(f"MoSPI CPI request failed with HTTP {exc.response.status_code}") from exc
                except httpx.RequestError as exc:
                    raise ValueError("MoSPI CPI request could not be completed") from exc
                except ValueError as exc:
                    raise ValueError("MoSPI CPI response was not valid JSON") from exc

                data, metadata = cls._validate_response(payload)
                pages = page
                for raw_record in data:
                    fetched += 1
                    try:
                        record = cls._to_record(raw_record, page_params)
                    except (InvalidOperation, TypeError, ValueError):
                        rejected += 1
                        continue
                    if request.start_period <= record.observation_date <= request.end_period:
                        records.append(record)

                total_pages = metadata["totalPages"]
                if page >= total_pages:
                    break
            else:
                raise ValueError("MoSPI CPI pagination exceeded the controlled page limit")
        return CpiFetchResult(records=records, fetched=fetched, rejected=rejected, pages=pages)

    @classmethod
    def _validate_response(cls, payload: object) -> tuple[list[dict[str, object]], dict[str, int]]:
        if not isinstance(payload, dict) or not isinstance(payload.get("data"), list) or not isinstance(payload.get("meta_data"), dict):
            raise ValueError("MoSPI CPI response has an invalid structure")
        metadata = payload["meta_data"]
        required_metadata = ("page", "totalRecords", "totalPages", "recordPerPage")
        if any(not isinstance(metadata.get(key), int) or metadata[key] < 0 for key in required_metadata):
            raise ValueError("MoSPI CPI response metadata is invalid")
        records = [record for record in payload["data"] if isinstance(record, dict)]
        if len(records) != len(payload["data"]):
            raise ValueError("MoSPI CPI response contains an invalid record")
        return records, {key: metadata[key] for key in required_metadata}

    @classmethod
    def _to_record(cls, raw: dict[str, object], request_params: dict[str, str | int]) -> IndicatorImportRecord:
        required = ("base_year", "series", "year", "month", "state", "sector", "division", "index")
        if any(raw.get(key) in (None, "") for key in required):
            raise ValueError("MoSPI CPI record is missing a required field")
        base_year = int(str(raw["base_year"]))
        year = int(str(raw["year"]))
        month = cls._month_number(raw["month"])
        index_value = cls._decimal(raw["index"])
        inflation_value = None if raw.get("inflation") in (None, "") else cls._decimal(raw["inflation"])
        source_url = f"{cls.cpi_endpoint}?{urlencode(request_params)}"
        retrieved_at = datetime.now(timezone.utc)
        provenance = {
            "source_type": cls.source_type,
            "source": cls.source,
            "organization": cls.organization,
            "dataset_id": "CPI",
            "api_endpoint": cls.cpi_endpoint,
            "request_params": request_params,
            "base_year": base_year,
            "series": raw["series"],
            "state": raw["state"],
            "sector": raw["sector"],
            "division": raw["division"],
            "year": year,
            "month": month,
            "source_record_code": raw.get("code"),
        }
        return IndicatorImportRecord(
            source_type=cls.source_type,
            organization=cls.organization,
            source=cls.source,
            dataset_name="Consumer Price Index",
            dataset_id="CPI",
            indicator_code="CPI",
            indicator_name="Consumer Price Index",
            geography=str(raw["state"]),
            unit="index",
            observation_date=date(year, month, 1),
            value=index_value,
            base_period="2024=100",
            frequency="monthly",
            reference_period=f"{year:04d}-{month:02d}",
            source_url=source_url,
            retrieved_at=retrieved_at,
            provenance=provenance,
            is_official=True,
            base_year=base_year,
            series=str(raw["series"]),
            year=year,
            month=month,
            state=str(raw["state"]),
            sector=str(raw["sector"]),
            division=str(raw["division"]),
            group=cls._optional_string(raw.get("group")),
            class_name=cls._optional_string(raw.get("class")),
            sub_class=cls._optional_string(raw.get("sub_class")),
            item=cls._optional_string(raw.get("item")),
            code=cls._optional_string(raw.get("code")),
            index_value=index_value,
            inflation_value=inflation_value,
            imputation=cls._optional_string(raw.get("imputation")),
        )

    @classmethod
    def _month_number(cls, value: object) -> int:
        if isinstance(value, int):
            if 1 <= value <= 12:
                return value
        if isinstance(value, str) and value.strip().lower() in cls.month_numbers:
            return cls.month_numbers[value.strip().lower()]
        raise ValueError("MoSPI CPI month is invalid")

    @staticmethod
    def _decimal(value: object) -> Decimal:
        result = Decimal(str(value))
        if not result.is_finite():
            raise ValueError("MoSPI CPI value is not finite")
        return result

    @staticmethod
    def _optional_string(value: object) -> str | None:
        return None if value is None else str(value)

    @staticmethod
    def _ssl_context() -> ssl.SSLContext:
        context = ssl.create_default_context()
        legacy_option = getattr(ssl, "OP_LEGACY_SERVER_CONNECT", None)
        if legacy_option is not None:
            context.options |= legacy_option
        return context
