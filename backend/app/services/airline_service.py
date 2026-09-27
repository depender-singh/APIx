from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.airlines import AirlineRepository


class AirlineService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = AirlineRepository(session)

    async def list_airlines(self, page: int = 1, page_size: int = 50):
        return await self.repository.list(page=page, page_size=page_size)

    async def get_airline(self, airline_id: str):
        return await self.repository.get_by_airline_id(airline_id)
