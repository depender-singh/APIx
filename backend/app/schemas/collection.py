from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


ADVANCE_WINDOWS = {1, 7, 15, 30, 45}
SOURCE_TYPES = {"airline", "ota", "licensed_flight_provider", "synthetic"}
RUN_STATUSES = {"pending", "running", "completed", "partial", "failed", "cancelled"}
FAILURE_CATEGORIES = {"timeout", "connection_error", "http_error", "invalid_response", "parse_error", "validation_error", "rate_limited", "source_unavailable", "unsupported_request", "unknown_error"}


class CollectionRequest(BaseModel):
    origin: str = Field(min_length=3, max_length=16)
    destination: str = Field(min_length=3, max_length=16)
    route_code: str = Field(min_length=7, max_length=64)
    travel_date: date
    search_date: date
    advance_window: int
    source: str = Field(min_length=1, max_length=128)
    source_type: Literal["airline", "ota", "licensed_flight_provider", "synthetic"]
    request_parameters: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_request(self) -> "CollectionRequest":
        if self.origin.upper() == self.destination.upper():
            raise ValueError("origin and destination must differ")
        if self.route_code.upper() != f"{self.origin.upper()}-{self.destination.upper()}":
            raise ValueError("route_code must match origin and destination")
        if self.advance_window not in ADVANCE_WINDOWS:
            raise ValueError("advance_window must be one of 1, 7, 15, 30, or 45")
        if (self.travel_date - self.search_date).days != self.advance_window:
            raise ValueError("travel_date and search_date must match advance_window")
        return self


class RawFareRecord(BaseModel):
    source_name: str
    source_type: Literal["airline", "ota", "licensed_flight_provider", "synthetic"]
    source_url: str | None = None
    retrieved_at: datetime
    collection_timestamp: datetime
    request_parameters: dict[str, Any] = Field(default_factory=dict)
    raw_payload: dict[str, Any] | list[Any]
    parser_version: str = Field(min_length=1)
    route_code: str
    origin: str
    destination: str
    travel_date: date
    search_date: date
    advance_window: int
    airline: str | None = None
    flight_number: str | None = None
    fare_class: str | None = None
    base_fare: Decimal | None = None
    taxes: Decimal | None = None
    udf: Decimal | None = None
    convenience_fee: Decimal | None = None
    total_fare: Decimal | None = None
    currency: str | None = None
    availability: str | None = None


class CollectionResult(BaseModel):
    records: list[RawFareRecord] = Field(default_factory=list)
    rejected_count: int = 0
    failed_count: int = 0
    failure_category: str | None = None
    error_message: str | None = None


class CollectionJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    source_id: str
    route_code: str
    enabled: bool
    schedule: str | None = None
    advance_windows: list[int]
    configuration: dict[str, object]
    created_at: datetime
    updated_at: datetime


class CollectionJobCreate(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=128)
    source_id: str = Field(min_length=1, max_length=64)
    route_code: str = Field(min_length=7, max_length=64)
    enabled: bool = True
    schedule: str | None = None
    advance_windows: list[int] = Field(default_factory=lambda: [1, 7, 15, 30, 45])
    configuration: dict[str, object] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_windows(self) -> "CollectionJobCreate":
        if not self.advance_windows or any(window not in ADVANCE_WINDOWS for window in self.advance_windows):
            raise ValueError("advance_windows must use the canonical APIx windows")
        return self


class CollectionRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    collection_job_id: str
    source_id: str
    status: str
    failure_category: str | None = None
    requested_count: int
    fetched_count: int
    accepted_count: int
    rejected_count: int
    duplicate_count: int
    failed_count: int
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_message: str | None = None
    created_at: datetime


class CollectionSourceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    source: str
    source_type: str
    organization: str | None = None
    is_active: bool


class CollectionHealthRead(BaseModel):
    status: str
    sources: list[dict[str, object]] = Field(default_factory=list)


class CollectionPlanRequest(BaseModel):
    search_date: date
    source_id: str = Field(min_length=1, max_length=64)
    currency: str = Field(default="INR", min_length=3, max_length=8)
    cabin_class: str = Field(default="Economy", min_length=1, max_length=32)
    adults: int = Field(default=1, ge=1, le=9)
    children: int = Field(default=0, ge=0, le=9)
    infants: int = Field(default=0, ge=0, le=9)
    region: str = Field(default="IN", min_length=2, max_length=8)


class CollectionExecutionControls(BaseModel):
    max_concurrency: int = Field(default=1, ge=1, le=10)
    delay_seconds: float = Field(default=0, ge=0, le=3600)
    timeout_seconds: float = Field(default=60, gt=0, le=600)
    live_execution: bool = False


class CollectionPlanRead(BaseModel):
    job_id: str
    total_contexts: int
    contexts: list[dict[str, object]] = Field(default_factory=list)


class CollectionPlanSummary(BaseModel):
    job_id: str
    total_contexts: int
    pending: int = 0
    running: int = 0
    completed: int = 0
    partial: int = 0
    failed: int = 0
    raw_observations: int = 0
    normalized_observations: int = 0
    provider_requests_made: int = 0
    duplicate_payloads: int = 0
    rejected_records: int = 0
    failed_records: int = 0
