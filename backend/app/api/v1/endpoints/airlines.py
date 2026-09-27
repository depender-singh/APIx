from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.airline import AirlineListResponse, AirlineRead
from app.services.airline_service import AirlineService

router = APIRouter(prefix="/airlines", tags=["airlines"])


@router.get("", response_model=AirlineListResponse, summary="List airlines", description="Return paginated airline metadata referenced by observations.")
async def list_airlines(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_db),
) -> AirlineListResponse:
    service = AirlineService(session)
    airlines, total = await service.list_airlines(page=page, page_size=page_size)
    return AirlineListResponse(items=[AirlineRead.model_validate(airline) for airline in airlines], total=total, page=page, page_size=page_size)


@router.get("/{airline_id}", response_model=AirlineRead, summary="Get an airline", description="Fetch a single airline by its canonical airline id.")
async def get_airline(
    airline_id: str,
    session: AsyncSession = Depends(get_db),
) -> AirlineRead:
    service = AirlineService(session)
    airline = await service.get_airline(airline_id)
    if airline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Airline not found")
    return AirlineRead.model_validate(airline)
