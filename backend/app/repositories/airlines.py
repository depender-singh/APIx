from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.airline import Airline


class AirlineRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, *, page: int = 1, page_size: int = 50) -> tuple[list[Airline], int]:
        stmt = select(Airline).order_by(Airline.airline_name.asc())
        total_stmt = select(func.count()).select_from(Airline)
        total_result = await self.session.execute(total_stmt)
        total = total_result.scalar_one() or 0

        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def get_by_airline_id(self, airline_id: str) -> Airline | None:
        stmt = select(Airline).where(Airline.airline_id == airline_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
