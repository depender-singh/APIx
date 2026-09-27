from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class RawObservationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_id: str
    source_type: str
    source_name: str
    collection_job_id: str | None = None
    collection_run_id: str | None = None
    source_url: str | None = None
    retrieved_at: datetime
    collection_timestamp: datetime
    request_parameters: dict[str, object]
    raw_payload: dict[str, object] | list[object]
    payload_hash: str
    parser_version: str
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
    source_status: str
    raw_status: str
    normalized_observation_id: str | None = None
    created_at: datetime