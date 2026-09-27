from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.index import IndexListResponse, IndexRead
from app.services.index_service import IndexService

router = APIRouter(prefix="/airfare-index", tags=["airfare-index"])


@router.get("", response_model=IndexListResponse, summary="List index history", description="Return paginated index history stored in PostgreSQL.")
async def list_index(
    date: str | None = Query(default=None, alias="date"),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    route: str | None = Query(default=None),
    airline: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_db),
) -> IndexListResponse:
    service = IndexService(session)
    indexes, total = await service.list_indexes(
        route=route,
        airline=airline,
        start_date=start_date or date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )
    return IndexListResponse(
        items=[IndexRead.model_validate(index) for index in indexes],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/history", response_model=IndexListResponse, summary="Get chronological index history")
async def history_index(
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_db),
) -> IndexListResponse:
    service = IndexService(session)
    indexes, total = await service.list_indexes(
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
        chronological=True,
    )
    return IndexListResponse(
        items=[IndexRead.model_validate(index) for index in indexes],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/latest", response_model=IndexRead | None, summary="Get latest airfare index", description="Return the most recent index value when present; otherwise return an empty result shape.")
async def get_latest_index(
    session: AsyncSession = Depends(get_db),
) -> IndexRead | None:
    service = IndexService(session)
    index = await service.get_latest_index()
    if index is None:
        return None
    return IndexRead.model_validate(index)
