from datetime import date

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.observation import Observation


class ObservationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(
        self,
        *,
        route: str | None = None,
        airline: str | None = None,
        source: str | None = None,
        availability: str | None = None,
        cleaning_status: str | None = None,
        index_eligible: bool | None = None,
        advance_window: int | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[Observation], int]:
        stmt = select(Observation)
        filters: list[object] = []

        if route:
            filters.append(Observation.route_code == route)
        if airline:
            filters.append(Observation.airline_id == airline)
        if source:
            filters.append(Observation.source == source)
        if availability:
            filters.append(Observation.availability == availability)
        if cleaning_status:
            filters.append(Observation.cleaning_status == cleaning_status)
        if index_eligible is not None:
            filters.append(Observation.index_eligible.is_(index_eligible))
        if advance_window is not None:
            filters.append(Observation.advance_window == advance_window)
        if start_date:
            filters.append(Observation.travel_date >= start_date)
        if end_date:
            filters.append(Observation.travel_date <= end_date)

        if filters:
            stmt = stmt.where(and_(*filters))

        total_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.session.execute(total_stmt)
        total = total_result.scalar_one()

        stmt = stmt.order_by(Observation.collection_timestamp.desc(), Observation.id)
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def get_by_id(self, observation_id: str) -> Observation | None:
        result = await self.session.get(Observation, observation_id)
        return result
