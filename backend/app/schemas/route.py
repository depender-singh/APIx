from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RouteBase(BaseModel):
    route_code: str
    origin: str
    destination: str
    origin_city: str | None = None
    destination_city: str | None = None
    is_active: bool = True


class RouteRead(RouteBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class RouteListResponse(BaseModel):
    items: list[RouteRead]
    total: int
    page: int = 1
    page_size: int = 50
