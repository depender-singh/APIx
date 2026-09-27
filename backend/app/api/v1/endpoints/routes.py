from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.route import RouteListResponse, RouteRead
from app.services.route_service import RouteService

router = APIRouter(prefix="/routes", tags=["routes"])


@router.get("", response_model=RouteListResponse, summary="List routes", description="Return paginated route metadata used by APIx.")
async def list_routes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_db),
) -> RouteListResponse:
    service = RouteService(session)
    routes, total = await service.list_routes(page=page, page_size=page_size)
    return RouteListResponse(items=[RouteRead.model_validate(route) for route in routes], total=total, page=page, page_size=page_size)


@router.get("/{route_code}", response_model=RouteRead, summary="Get a route", description="Fetch a single route by route code.")
async def get_route(
    route_code: str,
    session: AsyncSession = Depends(get_db),
) -> RouteRead:
    service = RouteService(session)
    route = await service.get_route(route_code)
    if route is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    return RouteRead.model_validate(route)
