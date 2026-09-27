from __future__ import annotations

import asyncio
from dataclasses import dataclass
from time import monotonic
from uuid import uuid4

from app.schemas.collection import CollectionRequest
from app.services.collection_plan import CollectionContext, CollectionPlan


class LiveExecutionRequired(ValueError):
    pass


@dataclass(frozen=True)
class ExecutionControls:
    max_concurrency: int = 1
    delay_seconds: float = 0
    timeout_seconds: float = 60
    live_execution: bool = False

    def __post_init__(self) -> None:
        if self.max_concurrency < 1:
            raise ValueError("max_concurrency must be at least 1")
        if self.delay_seconds < 0:
            raise ValueError("delay_seconds must not be negative")
        if self.timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be positive")


def context_request(context: CollectionContext) -> CollectionRequest:
    return CollectionRequest(
        origin=context.origin,
        destination=context.destination,
        route_code=context.route_code,
        travel_date=context.travel_date,
        search_date=context.search_date,
        advance_window=context.advance_window,
        source=context.source_name,
        source_type=context.source_type,  # type: ignore[arg-type]
        request_parameters=context.request_parameters,
    )


class CollectionOrchestrator:
    def __init__(self, collection_service: object):
        self.collection_service = collection_service

    async def execute(
        self,
        plan: CollectionPlan,
        *,
        adapter_factory: object,
        controls: ExecutionControls,
    ) -> list[object]:
        if not controls.live_execution:
            raise LiveExecutionRequired("live_execution must be explicitly enabled")
        try:
            adapter = adapter_factory(timeout=controls.timeout_seconds)
        except TypeError:
            adapter = adapter_factory()
        semaphore = asyncio.Semaphore(controls.max_concurrency)
        last_request_at = 0.0
        rate_lock = asyncio.Lock()
        existing_runs = {}
        for run in await self.collection_service.list_plan_runs(plan.job_id):
            if run.id.startswith("run-"):
                context_id = run.id[4:].rsplit("-", 1)[0]
                existing_runs[context_id] = run

        async def execute_context(context: CollectionContext) -> object:
            nonlocal last_request_at
            if context.context_id in existing_runs:
                return existing_runs[context.context_id]
            async with semaphore:
                async with rate_lock:
                    elapsed = monotonic() - last_request_at if last_request_at else controls.delay_seconds
                    wait_for = max(0.0, controls.delay_seconds - elapsed)
                    if wait_for:
                        await asyncio.sleep(wait_for)
                    last_request_at = monotonic()
                run_id = f"run-{context.context_id}-{uuid4().hex[:12]}"
                request = context_request(context)
                # The adapter owns the network timeout, avoiding cancellation of the shared
                # database session while preserving a per-request timeout control.
                run = await self.collection_service.execute_collection(
                    run_id=run_id,
                    job_id=plan.job_id,
                    source_id=context.source_id,
                    request=request,
                    adapter=adapter,
                )
                if run is not None:
                    run.normalized_count = await self.collection_service.normalize_run(run.id)
                return run

        results = await asyncio.gather(*(execute_context(context) for context in plan.contexts), return_exceptions=True)
        output: list[object] = []
        for context, result in zip(plan.contexts, results):
            if isinstance(result, BaseException):
                await self.collection_service.rollback()
                run = await self.collection_service.mark_run_failed(
                    f"run-{context.context_id}-orchestrator",
                    str(result),
                    "unknown_error",
                )
                if run is not None:
                    output.append(run)
            else:
                output.append(result)
        return output


def execution_summary(plan: CollectionPlan, runs: list[object]) -> dict[str, object]:
    summary = {
        "job_id": plan.job_id,
        "total_contexts": len(plan.contexts),
        "pending": 0,
        "running": 0,
        "completed": 0,
        "partial": 0,
        "failed": 0,
        "raw_observations": sum(int(getattr(run, "accepted_count", 0)) for run in runs),
        "normalized_observations": 0,
        "provider_requests_made": sum(int(getattr(run, "requested_count", 0)) for run in runs),
        "duplicate_payloads": sum(int(getattr(run, "duplicate_count", 0)) for run in runs),
        "rejected_records": sum(int(getattr(run, "rejected_count", 0)) for run in runs),
        "failed_records": sum(int(getattr(run, "failed_count", 0)) for run in runs),
    }
    for run in runs:
        status = str(getattr(run, "status", "pending"))
        if status in summary:
            summary[status] = int(summary[status]) + 1
    summary["normalized_observations"] = sum(int(getattr(run, "normalized_count", 0)) for run in runs)
    return summary