from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BenchmarkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    benchmark_date: date
    route_code: str
    benchmark_value: Decimal
    benchmark_metric: str
    benchmark_scope: str = "route_level_airfare"
    currency: str | None = None
    period_type: str
    source: str | None = None
    source_type: str | None = None
    dataset: str | None = None
    dataset_id: str | None = None
    dataset_version: str | None = None
    source_document: str | None = None
    source_url: str | None = None
    reference_period: str | None = None
    retrieved_at: datetime | None = None
    license: str | None = None
    provenance: dict[str, object] | None = None
    notes: str | None = None
    created_at: datetime


class BenchmarkListResponse(BaseModel):
    items: list[BenchmarkRead]
    total: int
    status: str = "available"
    page: int = 1
    page_size: int = 50


class BenchmarkImportRecord(BaseModel):
    benchmark_date: date
    route_code: str
    benchmark_value: Decimal = Field(gt=0)
    benchmark_metric: str = "average_purchase_fare"
    benchmark_scope: str = "route_level_airfare"
    currency: str = "INR"
    period_type: str = "monthly"
    source: str
    source_type: str
    dataset: str
    dataset_id: str
    dataset_version: str | None = None
    source_document: str | None = None
    source_url: str | None = None
    reference_period: str | None = None
    retrieved_at: datetime
    license: str | None = None
    provenance: dict[str, object] = Field(default_factory=dict)
    notes: str | None = None

    @field_validator("benchmark_scope")
    @classmethod
    def validate_scope(cls, value: str) -> str:
        if value not in {"route_level_airfare", "aggregate_airfare_reference", "traffic_reference"}:
            raise ValueError("benchmark_scope must be route_level_airfare, aggregate_airfare_reference, or traffic_reference")
        return value


class BenchmarkImportRequest(BaseModel):
    records: list[BenchmarkImportRecord] = Field(min_length=1)


class BacktestRunRequest(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    route_code: str | None = None
    benchmark_source: str = "dgca"
    frequency: str = "monthly"
    methodology_version: str | None = None


class BacktestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    benchmark_source: str
    benchmark_dataset: str | None = None
    benchmark_version: str | None = None
    methodology_version: str | None = None
    route_scope: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    frequency: str
    observation_count: int
    correlation: float | None = None
    mae: float | None = None
    rmse: float | None = None
    directional_accuracy: float | None = None
    bias: float | None = None
    mape: float | None = None
    stability: float | None = None
    status: str
    series: list[dict[str, object]] = Field(default_factory=list)
    route_results: list[dict[str, object]] = Field(default_factory=list)
    created_at: datetime


class BacktestListResponse(BaseModel):
    items: list[BacktestRead]
    total: int
    page: int = 1
    page_size: int = 50
