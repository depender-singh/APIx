from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.airline import Airline
from app.models.observation import Observation
from app.models.route import Route


class QualityService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def clean_observation(self, observation_id: str) -> Observation:
        """Apply the Phase 3 validation contract to one persisted observation."""
        observation = await self.session.get(Observation, observation_id)
        if observation is None:
            raise ValueError("Observation not found")

        hard_failure = False
        route = await self.session.scalar(select(Route).where(Route.route_code == observation.route_code))
        airline = await self.session.scalar(select(Airline).where(Airline.airline_id == observation.airline_id))
        if route is None or airline is None:
            hard_failure = True

        if observation.travel_date < observation.search_date or observation.advance_window != (observation.travel_date - observation.search_date).days:
            hard_failure = True

        fare_values = (observation.base_fare, observation.taxes, observation.udf, observation.convenience_fee)
        if observation.total_fare < 0 or any(value is not None and value < 0 for value in fare_values):
            hard_failure = True
        if all(value is not None for value in fare_values):
            calculated_total = sum((Decimal(str(value)) for value in fare_values), Decimal("0"))
            if abs(calculated_total - Decimal(str(observation.total_fare))) > Decimal("1"):
                hard_failure = True

        duplicate = await self.session.scalar(
            select(Observation.id).where(
                Observation.id != observation.id,
                Observation.source == observation.source,
                Observation.route_code == observation.route_code,
                Observation.airline_id == observation.airline_id,
                Observation.travel_date == observation.travel_date,
                Observation.search_date == observation.search_date,
                Observation.advance_window == observation.advance_window,
                Observation.fare_class == observation.fare_class,
                Observation.flight == observation.flight,
            ).limit(1)
        )
        if duplicate is not None:
            observation.cleaning_status = "duplicate"
            observation.index_eligible = False
        elif hard_failure:
            observation.cleaning_status = "invalid_fare" if observation.total_fare < 0 or any(value is not None and value < 0 for value in fare_values) else "invalid_date"
            observation.index_eligible = False
        else:
            observation.cleaning_status = "clean"
            # Unknown availability is valid source data but cannot enter an index
            # whose existing calculation explicitly requires available fares.
            observation.index_eligible = observation.availability == "available"

        await self.session.commit()
        await self.session.refresh(observation)
        return observation

    async def get_quality_metrics(self) -> dict[str, float | int | None]:
        total_stmt = select(func.count()).select_from(Observation)
        total_result = await self.session.execute(total_stmt)
        total_observations = total_result.scalar_one() or 0

        if total_observations == 0:
            return {
                "total_observations": 0,
                "valid_observations": 0,
                "invalid_observations": 0,
                "duplicate_observations": 0,
                "missing_field_observations": 0,
                "sold_out_observations": 0,
                "cancelled_observations": 0,
                "outlier_observations": 0,
                "available_observations": 0,
                "index_eligible_observations": 0,
                "completeness_rate": None,
                "validity_rate": None,
                "duplicate_rate": None,
                "availability_rate": None,
                "outlier_rate": None,
            }

        valid_stmt = select(func.count()).where(Observation.cleaning_status.in_(["clean", "valid"]))
        valid_result = await self.session.execute(valid_stmt)
        valid_observations = valid_result.scalar_one() or 0

        duplicate_stmt = select(func.count()).where(Observation.cleaning_status == "duplicate")
        duplicate_result = await self.session.execute(duplicate_stmt)
        duplicate_observations = duplicate_result.scalar_one() or 0

        missing_stmt = select(func.count()).where(Observation.cleaning_status == "missing_required_field")
        missing_result = await self.session.execute(missing_stmt)
        missing_field_observations = missing_result.scalar_one() or 0

        sold_out_stmt = select(func.count()).where(Observation.availability == "sold_out")
        sold_out_result = await self.session.execute(sold_out_stmt)
        sold_out_observations = sold_out_result.scalar_one() or 0

        cancelled_stmt = select(func.count()).where(Observation.availability == "cancelled")
        cancelled_result = await self.session.execute(cancelled_stmt)
        cancelled_observations = cancelled_result.scalar_one() or 0

        outlier_stmt = select(func.count()).where(Observation.cleaning_status == "outlier")
        outlier_result = await self.session.execute(outlier_stmt)
        outlier_observations = outlier_result.scalar_one() or 0

        available_stmt = select(func.count()).where(Observation.availability == "available")
        available_result = await self.session.execute(available_stmt)
        available_observations = available_result.scalar_one() or 0

        index_eligible_stmt = select(func.count()).where(Observation.index_eligible.is_(True))
        index_eligible_result = await self.session.execute(index_eligible_stmt)
        index_eligible_observations = index_eligible_result.scalar_one() or 0

        invalid_observations = total_observations - valid_observations

        def safe_rate(numerator: int, denominator: int) -> float | None:
            if denominator == 0:
                return None
            return round(numerator / denominator, 4)

        return {
            "total_observations": total_observations,
            "valid_observations": valid_observations,
            "invalid_observations": invalid_observations,
            "duplicate_observations": duplicate_observations,
            "missing_field_observations": missing_field_observations,
            "sold_out_observations": sold_out_observations,
            "cancelled_observations": cancelled_observations,
            "outlier_observations": outlier_observations,
            "available_observations": available_observations,
            "index_eligible_observations": index_eligible_observations,
            "completeness_rate": safe_rate(total_observations - missing_field_observations, total_observations),
            "validity_rate": safe_rate(valid_observations, total_observations),
            "duplicate_rate": safe_rate(duplicate_observations, total_observations),
            "availability_rate": safe_rate(available_observations, total_observations),
            "outlier_rate": safe_rate(outlier_observations, total_observations),
        }
