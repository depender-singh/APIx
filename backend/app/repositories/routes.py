from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.route import Route


class RouteRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, *, page: int = 1, page_size: int = 50) -> tuple[list[Route], int]:
        stmt = select(Route).order_by(Route.route_code.asc())
        total_stmt = select(func.count()).select_from(Route)
        total_result = await self.session.execute(total_stmt)
        total = total_result.scalar_one() or 0

        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def get_by_code(self, route_code: str) -> Route | None:
        stmt = select(Route).where(Route.route_code == route_code)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
