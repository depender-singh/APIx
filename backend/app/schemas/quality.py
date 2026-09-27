from pydantic import BaseModel, ConfigDict


class DataQualityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_observations: int
    valid_observations: int
    invalid_observations: int
    duplicate_observations: int
    missing_field_observations: int
    sold_out_observations: int
    cancelled_observations: int
    outlier_observations: int
    available_observations: int
    index_eligible_observations: int
    completeness_rate: float | None = None
    validity_rate: float | None = None
    duplicate_rate: float | None = None
    availability_rate: float | None = None
    outlier_rate: float | None = None
