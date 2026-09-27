from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.quality import DataQualityRead
from app.services.quality_service import QualityService

router = APIRouter(prefix="/data-quality", tags=["data-quality"])


@router.get("", response_model=DataQualityRead, summary="Get data quality metrics", description="Calculate APIx data quality metrics directly from observations in PostgreSQL.")
async def get_data_quality(
    session: AsyncSession = Depends(get_db),
) -> DataQualityRead:
    service = QualityService(session)
    metrics = await service.get_quality_metrics()
    return DataQualityRead.model_validate(metrics)
