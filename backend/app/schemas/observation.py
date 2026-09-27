from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ObservationBase(BaseModel):
    route_code: str
    origin: str
    destination: str
    airline_id: str
    flight: str | None = None
    travel_date: date
    search_date: date
    advance_window: int
    fare_class: str | None = None
    base_fare: Decimal | None = None
    taxes: Decimal | None = None
    udf: Decimal | None = None
    convenience_fee: Decimal | None = None
    total_fare: Decimal
    fare_completeness: str = "complete"
    availability: str
    source: str
    source_type: str | None = None
    currency: str | None = None
    collection_timestamp: datetime
    cleaning_status: str = "raw"
    index_eligible: bool = False
    organization: str | None = None
    dataset: str | None = None
    dataset_id: str | None = None
    version: str | None = None
    license: str | None = None
    terms_url: str | None = None
    reference_period: str | None = None
    retrieved_at: datetime | None = None


class ObservationCreate(ObservationBase):
    id: str
    route_id: str
    data_source_id: str | None = None


class ObservationRead(ObservationBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    route_id: str
    data_source_id: str | None = None
    created_at: datetime
    updated_at: datetime


class ObservationFilter(BaseModel):
    route: str | None = None
    airline: str | None = None
    source: str | None = None
    availability: str | None = None
    cleaning_status: str | None = None
    index_eligible: bool | None = None
    advance_window: int | None = None
    start_date: date | None = None
    end_date: date | None = None


class ObservationListResponse(BaseModel):
    items: list[ObservationRead]
    total: int
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1)
