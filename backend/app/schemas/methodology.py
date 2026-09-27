from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MethodologyUpdate(BaseModel):
    base_period: date
    aggregation_method: str = "weighted_average"
    observation_frequency: str = "daily"
    fare_metric: str = "total_fare"
    outlier_method: str = "iqr"
    route_weights: dict[str, Decimal] = Field(min_length=1)
    methodology_version: str = Field(min_length=1, max_length=64)

    @field_validator("aggregation_method")
    @classmethod
    def validate_aggregation_method(cls, value: str) -> str:
        if value != "weighted_average":
            raise ValueError("aggregation_method must be weighted_average")
        return value

    @field_validator("observation_frequency")
    @classmethod
    def validate_frequency(cls, value: str) -> str:
        if value not in {"daily", "monthly"}:
            raise ValueError("observation_frequency must be daily or monthly")
        return value

    @field_validator("fare_metric")
    @classmethod
    def validate_fare_metric(cls, value: str) -> str:
        if value != "total_fare":
            raise ValueError("fare_metric must be total_fare")
        return value

    @field_validator("outlier_method")
    @classmethod
    def validate_outlier_method(cls, value: str) -> str:
        if value != "iqr":
            raise ValueError("outlier_method must be iqr")
        return value

    @field_validator("route_weights")
    @classmethod
    def validate_weights(cls, value: dict[str, Decimal]) -> dict[str, Decimal]:
        if any(weight <= 0 for weight in value.values()):
            raise ValueError("route_weights must contain only positive values")
        return value


class MethodologyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = "methodology-default"
    methodology_version: str = "apix-v1.0"
    base_period: date
    aggregation_method: str
    observation_frequency: str
    fare_metric: str = "total_fare"
    outlier_method: str = "iqr"
    route_weight_version: str
    route_weights: dict[str, float]
    is_active: bool = True
