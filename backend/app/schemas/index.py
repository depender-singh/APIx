from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class IndexRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    index_date: date
    index_value: float
    methodology_config_id: str | None = None
    methodology_version: str | None = None
    base_period: str | None = None
    aggregation_method: str | None = None
    observation_frequency: str | None = None
    fare_metric: str | None = None
    outlier_method: str | None = None
    route_weight_version: str | None = None
    created_at: datetime


class IndexListResponse(BaseModel):
    items: list[IndexRead]
    total: int
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1)
