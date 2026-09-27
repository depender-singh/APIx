from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AirlineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    airline_id: str
    airline_name: str
    iata_code: str | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class AirlineListResponse(BaseModel):
    items: list[AirlineRead]
    total: int
    page: int = 1
    page_size: int = 50
