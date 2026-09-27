from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.backtesting import BenchmarkImportRequest, BenchmarkListResponse, BenchmarkRead
from app.services.benchmark_service import BenchmarkService

router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])


@router.get("", response_model=BenchmarkListResponse)
async def list_benchmarks(
    source_type: str | None = Query(default=None),
    source: str | None = Query(default=None),
    route_code: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_db),
) -> BenchmarkListResponse:
    rows, total = await BenchmarkService(session).list_benchmarks(source_type=source_type, source=source, route_code=route_code, page=page, page_size=page_size)
    return BenchmarkListResponse(items=[BenchmarkRead.model_validate(row) for row in rows], total=total, page=page, page_size=page_size, status="available" if total else "source_not_imported")


@router.get("/dgca", response_model=BenchmarkListResponse)
async def list_dgca_benchmarks(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_db),
) -> BenchmarkListResponse:
    rows, total = await BenchmarkService(session).list_benchmarks(source_type="dgca", source="dgca", page=page, page_size=page_size)
    return BenchmarkListResponse(items=[BenchmarkRead.model_validate(row) for row in rows], total=total, page=page, page_size=page_size, status="available" if total else "source_not_imported")


@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_benchmarks(payload: BenchmarkImportRequest, session: AsyncSession = Depends(get_db)) -> dict[str, object]:
    return await BenchmarkService(session).import_records(payload.records)


@router.get("/{benchmark_id}", response_model=BenchmarkRead)
async def get_benchmark(benchmark_id: str, session: AsyncSession = Depends(get_db)) -> BenchmarkRead:
    row = await BenchmarkService(session).get_benchmark(benchmark_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benchmark not found")
    return BenchmarkRead.model_validate(row)
