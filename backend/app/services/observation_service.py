from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.observation import Observation
from app.repositories.observations import ObservationRepository


class ObservationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = ObservationRepository(session)

    async def list_observations(
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
        return await self.repository.list(
            route=route,
            airline=airline,
            source=source,
            availability=availability,
            cleaning_status=cleaning_status,
            index_eligible=index_eligible,
            advance_window=advance_window,
            start_date=start_date,
            end_date=end_date,
            page=page,
            page_size=page_size,
        )

    async def get_observation(self, observation_id: str) -> Observation | None:
        return await self.repository.get_by_id(observation_id)
