from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.indexes import IndexRepository


class IndexService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = IndexRepository(session)

    async def list_indexes(
        self,
        *,
        route: str | None = None,
        airline: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        page: int = 1,
        page_size: int = 50,
        chronological: bool = False,
    ):
        return await self.repository.list(
            route=route,
            airline=airline,
            start_date=start_date,
            end_date=end_date,
            page=page,
            page_size=page_size,
            chronological=chronological,
        )

    async def get_latest_index(self):
        return await self.repository.latest()
