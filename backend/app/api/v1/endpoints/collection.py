from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.data_source import DataSource
from app.schemas.collection import CollectionExecutionControls, CollectionHealthRead, CollectionJobCreate, CollectionJobRead, CollectionPlanRead, CollectionPlanRequest, CollectionPlanSummary, CollectionRunRead, CollectionSourceRead
from app.schemas.raw_observation import RawObservationRead
from app.services.collection_orchestrator import CollectionOrchestrator, ExecutionControls, LiveExecutionRequired, execution_summary
from app.services.collection_plan import build_dry_run_report
from app.services.collection_service import CollectionService
from app.services.fare_source import FlightAPIAdapter, MockFareSourceAdapter

router = APIRouter(prefix="/collection", tags=["collection"])


@router.get("/sources", response_model=list[CollectionSourceRead])
async def list_sources(session: AsyncSession = Depends(get_db)) -> list[CollectionSourceRead]:
    return [CollectionSourceRead.model_validate(row) for row in await CollectionService(session).list_sources()]


@router.get("/jobs", response_model=list[CollectionJobRead])
async def list_jobs(enabled: bool | None = Query(default=None), session: AsyncSession = Depends(get_db)) -> list[CollectionJobRead]:
    return [CollectionJobRead.model_validate(row) for row in await CollectionService(session).list_jobs(enabled)]


@router.post("/jobs", response_model=CollectionJobRead, status_code=201)
async def create_job(payload: CollectionJobCreate, session: AsyncSession = Depends(get_db)) -> CollectionJobRead:
    try:
        return CollectionJobRead.model_validate(await CollectionService(session).create_job(payload))
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/jobs/{job_id}", response_model=CollectionJobRead)
async def get_job(job_id: str, session: AsyncSession = Depends(get_db)) -> CollectionJobRead:
    row = await CollectionService(session).get_job(job_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Collection job not found")
    return CollectionJobRead.model_validate(row)


@router.post("/plans", response_model=CollectionPlanRead)
async def create_plan(payload: CollectionPlanRequest, session: AsyncSession = Depends(get_db)) -> CollectionPlanRead:
    source = await session.get(DataSource, payload.source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Collection source not found")
    plan = await CollectionService(session).create_or_get_plan(
        search_date=payload.search_date,
        source_id=payload.source_id,
        source_name=source.source,
        source_type=source.source_type,
        currency=payload.currency,
        cabin_class=payload.cabin_class,
        adults=payload.adults,
        children=payload.children,
        infants=payload.infants,
        region=payload.region,
    )
    return CollectionPlanRead(job_id=plan.job_id, total_contexts=len(plan.contexts), contexts=[context.as_dict() for context in plan.contexts])


@router.post("/plans/dry-run", response_model=dict[str, object])
async def dry_run_plan(payload: CollectionPlanRequest, session: AsyncSession = Depends(get_db)) -> dict[str, object]:
    source = await session.get(DataSource, payload.source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Collection source not found")
    from app.services.collection_plan import build_collection_plan
    plan = build_collection_plan(
        search_date=payload.search_date,
        source_id=payload.source_id,
        source_name=source.source,
        source_type=source.source_type,
        currency=payload.currency,
        cabin_class=payload.cabin_class,
        adults=payload.adults,
        children=payload.children,
        infants=payload.infants,
        region=payload.region,
    )
    return build_dry_run_report(plan)


@router.get("/plans/{job_id}/dry-run", response_model=dict[str, object])
async def dry_run_existing_plan(job_id: str, session: AsyncSession = Depends(get_db)) -> dict[str, object]:
    plan = await CollectionService(session).get_plan(job_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Collection plan not found")
    return build_dry_run_report(plan)


@router.post("/plans/{job_id}/execute", response_model=dict[str, object])
async def execute_plan(job_id: str, controls: CollectionExecutionControls, session: AsyncSession = Depends(get_db)) -> dict[str, object]:
    if not controls.live_execution:
        raise HTTPException(status_code=409, detail="Explicit live_execution=true is required")
    plan = await CollectionService(session).get_plan(job_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Collection plan not found")
    if plan.source_name == "FlightAPI":
        adapter_factory = FlightAPIAdapter
    elif plan.source_type == "synthetic":
        adapter_factory = MockFareSourceAdapter
    else:
        raise HTTPException(status_code=422, detail=f"No adapter is registered for {plan.source_name}")
    try:
        runs = await CollectionOrchestrator(CollectionService(session)).execute(
            plan,
            adapter_factory=adapter_factory,
            controls=ExecutionControls(**controls.model_dump()),
        )
    except LiveExecutionRequired as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return execution_summary(plan, runs)


@router.get("/runs", response_model=dict[str, object])
async def list_runs(job_id: str | None = None, page: int = Query(default=1, ge=1), page_size: int = Query(default=50, ge=1, le=500), session: AsyncSession = Depends(get_db)) -> dict[str, object]:
    rows, total = await CollectionService(session).list_runs(job_id, page, page_size)
    return {"items": [CollectionRunRead.model_validate(row) for row in rows], "total": total, "page": page, "page_size": page_size}


@router.get("/runs/{run_id}", response_model=CollectionRunRead)
async def get_run(run_id: str, session: AsyncSession = Depends(get_db)) -> CollectionRunRead:
    row = await CollectionService(session).get_run(run_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Collection run not found")
    return CollectionRunRead.model_validate(row)


@router.get("/health", response_model=CollectionHealthRead)
async def collection_health(session: AsyncSession = Depends(get_db)) -> dict[str, object]:
    return await CollectionService(session).health()


raw_router = APIRouter(prefix="/raw-observations", tags=["raw-observations"])


@raw_router.get("", response_model=dict[str, object])
async def list_raw_observations(source_id: str | None = None, run_id: str | None = None, page: int = Query(default=1, ge=1), page_size: int = Query(default=50, ge=1, le=500), session: AsyncSession = Depends(get_db)) -> dict[str, object]:
    rows, total = await CollectionService(session).list_raw_observations(source_id, run_id, page, page_size)
    return {"items": [RawObservationRead.model_validate(row) for row in rows], "total": total, "page": page, "page_size": page_size}


@raw_router.get("/{observation_id}", response_model=RawObservationRead)
async def get_raw_observation(observation_id: str, session: AsyncSession = Depends(get_db)) -> RawObservationRead:
    row = await CollectionService(session).get_raw_observation(observation_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Raw observation not found")
    return RawObservationRead.model_validate(row)