from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.observation import ObservationFilter, ObservationListResponse, ObservationRead
from app.services.observation_service import ObservationService

router = APIRouter(prefix="/observations", tags=["observations"])


@router.get("", response_model=ObservationListResponse, summary="List observations", description="Return paginated observations with optional filters for route, airline, source, availability, date range, and cleaning state.")
async def list_observations(
    route: str | None = Query(default=None),
    airline: str | None = Query(default=None),
    source: str | None = Query(default=None),
    availability: str | None = Query(default=None),
    cleaning_status: str | None = Query(default=None),
    index_eligible: bool | None = Query(default=None),
    advance_window: int | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_db),
) -> ObservationListResponse:
    service = ObservationService(session)
    observations, total = await service.list_observations(
        route=route,
        airline=airline,
        source=source,
        availability=availability,
        cleaning_status=cleaning_status,
        index_eligible=index_eligible,
        advance_window=advance_window,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )
    return ObservationListResponse(
        items=[ObservationRead.model_validate(observation) for observation in observations],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{observation_id}", response_model=ObservationRead, summary="Get an observation", description="Fetch a single observation by identifier.")
async def get_observation(
    observation_id: str,
    session: AsyncSession = Depends(get_db),
) -> ObservationRead:
    service = ObservationService(session)
    observation = await service.get_observation(observation_id)
    if observation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Observation not found")
    return ObservationRead.model_validate(observation)
