from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class RouteAnalytics(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    route_code: str
    origin: str
    destination: str
    avg_fare: float
    change_pct: float
    observations: int
    availability_rate: float
    airlines_count: int
    apix_contribution: int
    last_updated: datetime | str | None = None


class AirlineAnalytics(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    airline_id: str
    avg_fare: float
    fare_change: float
    routes_count: int
    observations: int
    availability_rate: float
    avg_taxes: float | None = None
    avg_convenience_fee: float | None = None


class LeadTimePoint(BaseModel):
    advance_window: int
    avg_fare: float
    observations: int


class FareComposition(BaseModel):
    base_fare: float | None = None
    taxes: float | None = None
    udf: float | None = None
    convenience_fee: float | None = None
    total: float | None = None
    decomposition_status: str = "complete"
    decomposition_observations: int = 0


class AvailabilityStats(BaseModel):
    rate: float
    available: int
    limited: int
    sold_out: int
    cancelled: int
    total: int


class IndexSeriesPoint(BaseModel):
    index_date: date
    index_value: float


class OverviewResponse(BaseModel):
    latest_index: IndexSeriesPoint | None = None
    route_stats: list[RouteAnalytics] = Field(default_factory=list)
    top_movers: dict[str, list[RouteAnalytics]] = Field(default_factory=lambda: {"increases": [], "decreases": []})
    quality: dict[str, float | int | None] = Field(default_factory=dict)
    available_flights: int = 0
    airlines_count: int = 0
    quotes_collected: int = 0
    index_series: list[IndexSeriesPoint] = Field(default_factory=list)
    sparkline: list[float] = Field(default_factory=list)


class HistoricalResponse(BaseModel):
    items: list[IndexSeriesPoint] = Field(default_factory=list)
    total: int = 0
