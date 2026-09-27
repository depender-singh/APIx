from fastapi import APIRouter

from app.api.v1.endpoints.airlines import router as airlines_router
from app.api.v1.endpoints.analytics import router as analytics_router
from app.api.v1.endpoints.backtesting import router as backtesting_router
from app.api.v1.endpoints.benchmarks import router as benchmarks_router
from app.api.v1.endpoints.index import router as index_router
from app.api.v1.endpoints.indicators import router as indicators_router
from app.api.v1.endpoints.observations import router as observations_router
from app.api.v1.endpoints.quality import router as quality_router
from app.api.v1.endpoints.collection import router as collection_router, raw_router
from app.api.v1.endpoints.routes import router as routes_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(observations_router)
api_router.include_router(routes_router)
api_router.include_router(airlines_router)
api_router.include_router(index_router)
api_router.include_router(indicators_router)
api_router.include_router(quality_router)
api_router.include_router(collection_router)
api_router.include_router(raw_router)
api_router.include_router(analytics_router)
api_router.include_router(benchmarks_router)
api_router.include_router(backtesting_router)
