from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.indicator import IndicatorImportRequest, IndicatorListResponse, IndicatorRead, InflationContextResponse
from app.services.indicator_service import IndicatorService

router = APIRouter(prefix="/indicators", tags=["indicators"])


@router.get("", response_model=IndicatorListResponse)
async def list_indicators(
    source_type: str | None = Query(default=None),
    indicator_code: str | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    geography: str | None = Query(default=None),
    frequency: str | None = Query(default=None),
    base_year: int | None = Query(default=None),
    series: str | None = Query(default=None),
    sector: str | None = Query(default=None),
    division: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    session: AsyncSession = Depends(get_db),
) -> IndicatorListResponse:
    rows, total = await IndicatorService(session).list_indicators(source_type=source_type, indicator_code=indicator_code, start_date=start_date, end_date=end_date, geography=geography, frequency=frequency, base_year=base_year, series=series, sector=sector, division=division, page=page, page_size=page_size)
    return IndicatorListResponse(items=[IndicatorRead.model_validate(row) for row in rows], total=total, page=page, page_size=page_size)


@router.get("/mospi", response_model=IndicatorListResponse)
async def list_mospi_indicators(
    indicator_code: str | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    geography: str | None = Query(default=None),
    frequency: str | None = Query(default=None),
    base_year: int | None = Query(default=None),
    series: str | None = Query(default=None),
    sector: str | None = Query(default=None),
    division: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    session: AsyncSession = Depends(get_db),
) -> IndicatorListResponse:
    rows, total = await IndicatorService(session).list_indicators(source_type="mospi", indicator_code=indicator_code, start_date=start_date, end_date=end_date, geography=geography, frequency=frequency, base_year=base_year, series=series, sector=sector, division=division, page=page, page_size=page_size)
    return IndicatorListResponse(items=[IndicatorRead.model_validate(row) for row in rows], total=total, page=page, page_size=page_size)


@router.get("/mospi/cpi", response_model=InflationContextResponse)
async def get_cpi_context(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    return await IndicatorService(session).inflation_context(start_date=start_date, end_date=end_date)


@router.get("/mospi/inflation", response_model=InflationContextResponse)
async def get_mospi_inflation(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    return await IndicatorService(session).inflation_context(start_date=start_date, end_date=end_date)


@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_indicators(payload: IndicatorImportRequest, session: AsyncSession = Depends(get_db)) -> dict[str, object]:
    try:
        service = IndicatorService(session)
        if payload.records is not None:
            return await service.import_mospi(payload.records)
        return await service.import_controlled_cpi(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/{indicator_code}", response_model=IndicatorRead)
async def get_indicator(indicator_code: str, session: AsyncSession = Depends(get_db)) -> IndicatorRead:
    row = await IndicatorService(session).get_indicator(indicator_code)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Indicator not found")
    return IndicatorRead.model_validate(row)
