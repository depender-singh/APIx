from fastapi import APIRouter

from app.core.config import settings
from app.schemas.health import HealthResponse

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health", response_model=HealthResponse, summary="Application health", description="Return the current health state of the APIx backend and any active mode metadata.")
async def get_health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        app=settings.app_name,
        environment=settings.app_env,
        data_mode=settings.data_mode,
        service="apix-api",
        mode=settings.data_mode,
    )
