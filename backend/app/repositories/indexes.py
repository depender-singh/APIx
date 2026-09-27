from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.index import IndexValue


class IndexRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(
        self,
        *,
        route: str | None = None,
        airline: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        page: int = 1,
        page_size: int = 50,
        chronological: bool = False,
    ) -> tuple[list[IndexValue], int]:
        stmt = select(IndexValue)
        if route:
            stmt = stmt.where(IndexValue.base_period == route)
        if start_date:
            stmt = stmt.where(IndexValue.index_date >= start_date)
        if end_date:
            stmt = stmt.where(IndexValue.index_date <= end_date)

        total_stmt = select(func.count()).select_from(IndexValue)
        total_result = await self.session.execute(total_stmt)
        total = total_result.scalar_one() or 0

        ordering = (IndexValue.index_date.asc(), IndexValue.created_at.asc()) if chronological else (IndexValue.index_date.desc(), IndexValue.created_at.desc())
        stmt = stmt.order_by(*ordering).offset((page - 1) * page_size).limit(page_size)
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def latest(self) -> IndexValue | None:
        stmt = select(IndexValue).order_by(IndexValue.index_date.desc(), IndexValue.created_at.desc()).limit(1)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
