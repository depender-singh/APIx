from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.backtesting import BacktestListResponse, BacktestRead, BacktestRunRequest
from app.services.backtesting_service import BacktestingService

router = APIRouter(prefix="/backtesting", tags=["backtesting"])


@router.get("", response_model=BacktestListResponse)
async def list_backtests(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_db),
) -> BacktestListResponse:
    rows, total = await BacktestingService(session).list_results(page=page, page_size=page_size)
    return BacktestListResponse(items=[BacktestRead.model_validate(row) for row in rows], total=total, page=page, page_size=page_size)


@router.get("/latest", response_model=BacktestRead | None)
async def latest_backtest(session: AsyncSession = Depends(get_db)) -> BacktestRead | None:
    row = await BacktestingService(session).latest()
    return BacktestRead.model_validate(row) if row else None


@router.post("/run", response_model=BacktestRead)
async def run_backtest(payload: BacktestRunRequest, session: AsyncSession = Depends(get_db)) -> BacktestRead:
    if payload.frequency not in {"daily", "monthly"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="frequency must be daily or monthly")
    if payload.start_date and payload.end_date and payload.start_date > payload.end_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="start_date must not be after end_date")
    row = await BacktestingService(session).run(
        start_date=payload.start_date,
        end_date=payload.end_date,
        route_code=payload.route_code,
        benchmark_source=payload.benchmark_source,
        frequency=payload.frequency,
        methodology_version=payload.methodology_version,
    )
    return BacktestRead.model_validate(row)


@router.get("/{result_id}", response_model=BacktestRead)
async def get_backtest(result_id: str, session: AsyncSession = Depends(get_db)) -> BacktestRead:
    row = await BacktestingService(session).get_result(result_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Back-test result not found")
    return BacktestRead.model_validate(row)
