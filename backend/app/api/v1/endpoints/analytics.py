from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.analytics_service import AnalyticsService
from app.schemas.index import IndexRead
from app.schemas.methodology import MethodologyRead, MethodologyUpdate

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
async def get_overview(session: AsyncSession = Depends(get_db)) -> dict[str, object]:
    service = AnalyticsService(session)
    return await service.get_overview()


@router.get("/routes")
async def get_route_stats(
    route: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
) -> list[dict[str, object]]:
    service = AnalyticsService(session)
    return await service.get_route_stats(route_code=route)


@router.get("/routes/{route_code}")
async def get_route_stat_detail(
    route_code: str,
    session: AsyncSession = Depends(get_db),
) -> dict[str, object] | None:
    service = AnalyticsService(session)
    stats = await service.get_route_stats(route_code=route_code)
    if not stats:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    return stats[0]


@router.get("/airlines")
async def get_airline_stats(
    airline: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
) -> list[dict[str, object]]:
    service = AnalyticsService(session)
    return await service.get_airline_stats(airline_id=airline)


@router.get("/airlines/{airline_id}")
async def get_airline_stat_detail(
    airline_id: str,
    session: AsyncSession = Depends(get_db),
) -> dict[str, object] | None:
    service = AnalyticsService(session)
    stats = await service.get_airline_stats(airline_id=airline_id)
    if not stats:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Airline not found")
    return stats[0]


@router.get("/lead-time")
async def get_lead_time(
    route: str | None = Query(default=None),
    airline: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
) -> list[dict[str, object]]:
    service = AnalyticsService(session)
    return await service.get_lead_time(route_code=route, airline_id=airline)


@router.get("/fare-composition")
async def get_fare_composition(
    route: str | None = Query(default=None),
    airline: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    service = AnalyticsService(session)
    return await service.get_fare_composition(route_code=route, airline_id=airline)


@router.get("/availability")
async def get_availability(
    route: str | None = Query(default=None),
    airline: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    service = AnalyticsService(session)
    return await service.get_availability(route_code=route, airline_id=airline)


@router.get("/historical")
async def get_historical(session: AsyncSession = Depends(get_db)) -> list[dict[str, object]]:
    service = AnalyticsService(session)
    return await service.get_historical_index()


@router.get("/methodology", response_model=MethodologyRead)
async def get_methodology(
    session: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    service = AnalyticsService(session)
    return await service.get_methodology_config()


@router.put("/methodology", response_model=MethodologyRead)
async def update_methodology(
    payload: MethodologyUpdate,
    session: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    try:
        return await AnalyticsService(session).update_methodology(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/recalculate", response_model=IndexRead)
async def recalculate_index(
    payload: dict[str, date],
    session: AsyncSession = Depends(get_db),
) -> IndexRead:
    try:
        index = await AnalyticsService(session).recalculate(payload["date"])
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="date is required") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return IndexRead.model_validate(index)
