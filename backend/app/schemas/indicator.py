from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class IndicatorImportRecord(BaseModel):
    source_type: str
    organization: str
    source: str
    dataset_name: str
    dataset_id: str | None = None
    dataset_version: str | None = None
    indicator_code: str
    indicator_name: str
    category: str | None = None
    geography: str | None = None
    unit: str
    observation_date: date
    value: Decimal
    base_period: str | None = None
    frequency: str
    reference_period: str | None = None
    source_url: str | None = None
    retrieved_at: datetime | None = None
    published_at: datetime | None = None
    methodology_version: str | None = None
    provenance: dict[str, object] = Field(default_factory=dict)
    is_official: bool = False
    base_year: int
    series: str
    year: int
    month: int
    state: str
    sector: str
    division: str
    group: str | None = None
    class_name: str | None = None
    sub_class: str | None = None
    item: str | None = None
    code: str | None = None
    index_value: Decimal
    inflation_value: Decimal | None
    imputation: str | None = None

    @field_validator("value")
    @classmethod
    def validate_value(cls, value: Decimal) -> Decimal:
        if not value.is_finite():
            raise ValueError("value must be finite")
        return value

    @field_validator("frequency")
    @classmethod
    def validate_frequency(cls, value: str) -> str:
        if value not in {"daily", "monthly", "quarterly", "annual"}:
            raise ValueError("frequency must be daily, monthly, quarterly, or annual")
        return value

    @field_validator("base_year")
    @classmethod
    def validate_base_year(cls, value: int) -> int:
        if value != 2024:
            raise ValueError("MoSPI CPI imports must use base_year=2024")
        return value

    @field_validator("month")
    @classmethod
    def validate_month(cls, value: int) -> int:
        if value < 1 or value > 12:
            raise ValueError("month must be between 1 and 12")
        return value

    @field_validator("index_value", "inflation_value")
    @classmethod
    def validate_cpi_values(cls, value: Decimal | None) -> Decimal | None:
        if value is None:
            return None
        if not value.is_finite():
            raise ValueError("CPI values must be finite")
        return value

    @model_validator(mode="after")
    def validate_cpi_scope(self) -> "IndicatorImportRecord":
        expected = {
            "source_type": "mospi",
            "source": "eSankhyiki",
            "dataset_id": "CPI",
            "indicator_code": "CPI",
            "frequency": "monthly",
            "series": "Current",
            "state": "All India",
            "sector": "Combined",
            "division": "CPI (General)",
        }
        for field, expected_value in expected.items():
            if getattr(self, field) != expected_value:
                raise ValueError(f"MoSPI CPI imports must use {field}={expected_value}")
        if not self.is_official:
            raise ValueError("MoSPI CPI records must be marked official")
        required_provenance = {"source_type", "source", "organization", "dataset_id", "base_year", "series", "state", "sector", "year", "month"}
        if not required_provenance.issubset(self.provenance):
            raise ValueError("MoSPI CPI provenance is incomplete")
        if not self.source_url or not self.source_url.startswith("https://"):
            raise ValueError("MoSPI CPI records require an HTTPS source_url")
        if self.retrieved_at is None:
            raise ValueError("MoSPI CPI records require retrieved_at provenance")
        if self.year < 2013:
            raise ValueError("year is outside the verified CPI coverage")
        if self.value != self.index_value:
            raise ValueError("value must equal index_value; inflation is stored separately")
        return self


class IndicatorImportRequest(BaseModel):
    records: list[IndicatorImportRecord] | None = Field(default=None, min_length=1)
    base_year: Literal[2024] = 2024
    series: Literal["Current"] = "Current"
    level: Literal["Group"] = "Group"
    state_code: Literal[1] = 1
    sector_code: Literal[3] = 3
    division_code: Literal[0] = 0
    start_period: date | None = None
    end_period: date | None = None
    page_size: int = Field(default=100, ge=1, le=100)

    @model_validator(mode="after")
    def validate_import_scope(self) -> "IndicatorImportRequest":
        if self.records is None and (self.start_period is None or self.end_period is None):
            raise ValueError("start_period and end_period are required for a live CPI import")
        if self.start_period and self.end_period:
            if self.start_period > self.end_period:
                raise ValueError("start_period must be on or before end_period")
            month_count = (self.end_period.year - self.start_period.year) * 12 + self.end_period.month - self.start_period.month + 1
            if month_count > 24:
                raise ValueError("controlled CPI imports are limited to 24 months")
        return self


class IndicatorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_type: str
    organization: str
    source: str
    dataset_name: str
    dataset_id: str | None = None
    dataset_version: str | None = None
    indicator_code: str
    indicator_name: str
    category: str | None = None
    geography: str | None = None
    unit: str
    observation_date: date
    value: Decimal
    base_period: str | None = None
    frequency: str
    reference_period: str | None = None
    source_url: str | None = None
    retrieved_at: datetime | None = None
    published_at: datetime | None = None
    methodology_version: str | None = None
    provenance: dict[str, object]
    is_official: bool
    base_year: int | None = None
    series: str | None = None
    year: int | None = None
    month: int | None = None
    state: str | None = None
    sector: str | None = None
    division: str | None = None
    group: str | None = None
    class_name: str | None = None
    sub_class: str | None = None
    item: str | None = None
    code: str | None = None
    index_value: Decimal | None = None
    inflation_value: Decimal | None = None
    imputation: str | None = None
    created_at: datetime
    updated_at: datetime


class IndicatorListResponse(BaseModel):
    items: list[IndicatorRead]
    total: int
    page: int = 1
    page_size: int = 50


class InflationContextResponse(BaseModel):
    status: str
    source_type: str
    indicator_code: str
    items: list[IndicatorRead] = Field(default_factory=list)
    apix_series: list[dict[str, object]] = Field(default_factory=list)
    comparison: dict[str, object] | None = None