from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.airline import Airline
from app.models.collection_job import CollectionJob
from app.models.collection_run import CollectionRun
from app.models.data_source import DataSource
from app.models.observation import Observation
from app.models.raw_observation import RawObservation
from app.models.route import Route
from app.core.config import settings
from app.schemas.collection import CollectionJobCreate, CollectionRequest, CollectionResult
from app.services.fare_source import FareSourceAdapter, normalize_raw_record, payload_hash, sanitize_request_parameters
from app.services.collection_plan import CollectionPlan, build_collection_plan
from app.services.quality_service import QualityService


def build_normalized_observation(raw: RawObservation, route: Route, airline: Airline, data_source: DataSource) -> dict[str, object]:
    """Map one persisted raw row through the existing normalizer and provenance contract."""
    from app.schemas.collection import RawFareRecord

    record = RawFareRecord(
        source_name=raw.source_name,
        source_type=raw.source_type,
        source_url=raw.source_url,
        retrieved_at=raw.retrieved_at,
        collection_timestamp=raw.collection_timestamp,
        request_parameters=raw.request_parameters,
        raw_payload=raw.raw_payload,
        parser_version=raw.parser_version,
        route_code=raw.route_code,
        origin=raw.origin,
        destination=raw.destination,
        travel_date=raw.travel_date,
        search_date=raw.search_date,
        advance_window=raw.advance_window,
        airline=raw.airline,
        flight_number=raw.flight_number,
        fare_class=raw.fare_class,
        base_fare=raw.base_fare,
        taxes=raw.taxes,
        udf=raw.udf,
        convenience_fee=raw.convenience_fee,
        total_fare=raw.total_fare,
        currency=raw.currency,
        availability=raw.availability,
    )
    normalized = normalize_raw_record(record, raw.id, route.id, airline.airline_id)
    normalized.pop("raw_observation_id")
    normalized.update(
        data_source_id=data_source.id,
        organization=data_source.organization,
        dataset=data_source.dataset,
        dataset_id=data_source.dataset_id,
        version=data_source.version,
        license=data_source.license,
        terms_url=data_source.terms_url,
        reference_period=data_source.reference_period,
    )
    return normalized


class CollectionService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_sources(self) -> list[DataSource]:
        result = await self.session.execute(select(DataSource).where(DataSource.source_type.in_(["airline", "ota", "licensed_flight_provider", "synthetic"])).order_by(DataSource.source))
        return list(result.scalars().all())

    async def list_jobs(self, enabled: bool | None = None) -> list[CollectionJob]:
        stmt = select(CollectionJob).order_by(CollectionJob.created_at.desc())
        if enabled is not None:
            stmt = stmt.where(CollectionJob.enabled.is_(enabled))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_job(self, request: CollectionJobCreate) -> CollectionJob:
        if await self.session.get(CollectionJob, request.id):
            raise ValueError("collection job already exists")
        job = CollectionJob(**request.model_dump())
        self.session.add(job)
        await self.session.commit()
        return job

    async def create_or_get_plan(self, **plan_options: object) -> CollectionPlan:
        plan = build_collection_plan(**plan_options)
        source = await self.session.get(DataSource, plan.source_id)
        if source is None:
            raise ValueError(f"Data source not found: {plan.source_id}")
        existing = await self.session.get(CollectionJob, plan.job_id)
        if existing is None:
            self.session.add(CollectionJob(
                id=plan.job_id,
                name=plan.name,
                source_id=plan.source_id,
                route_code="MULTI-CONTEXT",
                enabled=False,
                schedule=None,
                advance_windows=list(sorted({context.advance_window for context in plan.contexts})),
                configuration=plan.as_configuration(),
            ))
            await self.session.commit()
        return plan

    async def get_plan(self, job_id: str) -> CollectionPlan | None:
        job = await self.session.get(CollectionJob, job_id)
        if job is None or job.configuration.get("plan_type") != "phase-9c-controlled-multi-context":
            return None
        contexts = job.configuration.get("contexts", [])
        if not isinstance(contexts, list):
            return None
        from datetime import date
        from app.services.collection_plan import CollectionContext
        parsed = tuple(CollectionContext(
            context_id=str(item["context_id"]),
            route_code=str(item["route_code"]),
            origin=str(item["origin"]),
            destination=str(item["destination"]),
            search_date=date.fromisoformat(str(item["search_date"])),
            travel_date=date.fromisoformat(str(item["travel_date"])),
            advance_window=int(item["advance_window"]),
            source_id=str(item["source_id"]),
            source_name=str(item["source_name"]),
            source_type=str(item["source_type"]),
            request_parameters=dict(item["request_parameters"]),
        ) for item in contexts if isinstance(item, dict))
        return CollectionPlan(
            job_id=job.id,
            name=job.name,
            search_date=date.fromisoformat(str(job.configuration["search_date"])),
            source_id=job.source_id,
            source_name=str(job.configuration["source_name"]),
            source_type=str(job.configuration["source_type"]),
            contexts=parsed,
        )

    async def get_job(self, job_id: str) -> CollectionJob | None:
        return await self.session.get(CollectionJob, job_id)

    async def list_runs(self, job_id: str | None = None, page: int = 1, page_size: int = 50) -> tuple[list[CollectionRun], int]:
        stmt = select(CollectionRun)
        count_stmt = select(func.count()).select_from(CollectionRun)
        if job_id:
            stmt = stmt.where(CollectionRun.collection_job_id == job_id)
            count_stmt = count_stmt.where(CollectionRun.collection_job_id == job_id)
        total = int((await self.session.execute(count_stmt)).scalar_one() or 0)
        result = await self.session.execute(stmt.order_by(CollectionRun.created_at.desc()).offset((page - 1) * page_size).limit(page_size))
        return list(result.scalars().all()), total

    async def get_run(self, run_id: str) -> CollectionRun | None:
        return await self.session.get(CollectionRun, run_id)

    async def list_plan_runs(self, job_id: str) -> list[CollectionRun]:
        result = await self.session.execute(
            select(CollectionRun).where(CollectionRun.collection_job_id == job_id).order_by(CollectionRun.created_at.asc())
        )
        return list(result.scalars().all())

    async def rollback(self) -> None:
        await self.session.rollback()

    async def normalize_run(self, run_id: str) -> int:
        rows = (await self.session.execute(
            select(RawObservation.id).where(
                RawObservation.collection_run_id == run_id,
                RawObservation.raw_status == "pending",
            )
        )).scalars().all()
        normalized = 0
        for raw_id in rows:
            try:
                await self.normalize_raw_observation(raw_id)
                normalized += 1
            except ValueError:
                raw = await self.session.get(RawObservation, raw_id)
                if raw is not None:
                    raw.raw_status = "failed"
                    await self.session.commit()
        return normalized

    async def mark_run_failed(self, run_id: str, message: str, failure_category: str = "request_timeout") -> CollectionRun | None:
        run = await self.session.get(CollectionRun, run_id)
        if run is None:
            return None
        run.status = "failed"
        run.failure_category = failure_category
        run.failed_count = max(run.failed_count, 1)
        run.error_message = message
        run.completed_at = datetime.now(timezone.utc)
        await self.session.commit()
        return run

    async def list_raw_observations(self, source_id: str | None = None, run_id: str | None = None, page: int = 1, page_size: int = 50) -> tuple[list[RawObservation], int]:
        stmt = select(RawObservation)
        count_stmt = select(func.count()).select_from(RawObservation)
        if source_id:
            stmt = stmt.where(RawObservation.source_id == source_id)
            count_stmt = count_stmt.where(RawObservation.source_id == source_id)
        if run_id:
            stmt = stmt.where(RawObservation.collection_run_id == run_id)
            count_stmt = count_stmt.where(RawObservation.collection_run_id == run_id)
        total = int((await self.session.execute(count_stmt)).scalar_one() or 0)
        result = await self.session.execute(stmt.order_by(RawObservation.retrieved_at.desc()).offset((page - 1) * page_size).limit(page_size))
        return list(result.scalars().all()), total

    async def get_raw_observation(self, observation_id: str) -> RawObservation | None:
        return await self.session.get(RawObservation, observation_id)

    async def normalize_raw_observation(self, raw_observation_id: str) -> Observation:
        raw = await self.session.get(RawObservation, raw_observation_id)
        if raw is None:
            raise ValueError("Raw observation not found")
        if raw.normalized_observation_id:
            observation = await self.session.get(Observation, raw.normalized_observation_id)
            if observation is not None:
                fare_completeness = (
                    "complete"
                    if all(value is not None for value in (raw.base_fare, raw.taxes, raw.udf, raw.convenience_fee))
                    else "total_only"
                    if raw.base_fare is None and raw.taxes is None
                    else "partial"
                )
                updates = {
                    "fare_class": raw.fare_class,
                    "base_fare": raw.base_fare,
                    "taxes": raw.taxes,
                    "udf": raw.udf,
                    "convenience_fee": raw.convenience_fee,
                    "total_fare": raw.total_fare,
                    "currency": raw.currency,
                    "fare_completeness": fare_completeness,
                }
                changed = any(getattr(observation, key) != value for key, value in updates.items())
                for key, value in updates.items():
                    setattr(observation, key, value)
                if changed:
                    await self.session.commit()
                return await QualityService(self.session).clean_observation(observation.id)
            raise ValueError("Raw observation references a missing normalized observation")
        if raw.raw_status != "pending":
            raise ValueError(f"Raw observation is not pending: {raw.raw_status}")

        route_result = await self.session.execute(select(Route).where(Route.route_code == raw.route_code))
        route = route_result.scalar_one_or_none()
        if route is None:
            raise ValueError(f"Route not found: {raw.route_code}")
        airline_result = await self.session.execute(select(Airline).where(Airline.airline_name == raw.airline))
        airline = airline_result.scalar_one_or_none()
        if airline is None:
            raise ValueError(f"Airline not found: {raw.airline}")
        data_source = await self.session.get(DataSource, raw.source_id)
        if data_source is None:
            raise ValueError(f"Data source not found: {raw.source_id}")

        values = build_normalized_observation(raw, route, airline, data_source)
        existing = await self.session.get(Observation, values["id"])
        if existing is not None:
            raw.normalized_observation_id = existing.id
            raw.raw_status = "normalized"
            await self.session.commit()
            return await QualityService(self.session).clean_observation(existing.id)
        observation = Observation(**values)
        self.session.add(observation)
        raw.normalized_observation_id = observation.id
        raw.raw_status = "normalized"
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            existing = await self.session.get(Observation, values["id"])
            if existing is None:
                raise
            raw = await self.session.get(RawObservation, raw_observation_id)
            raw.normalized_observation_id = existing.id
            raw.raw_status = "normalized"
            await self.session.commit()
            return existing
        return await QualityService(self.session).clean_observation(observation.id)

    async def persist_raw_result(self, *, source_id: str, collection_run_id: str, collection_job_id: str | None, result: CollectionResult) -> dict[str, int]:
        inserted = 0
        duplicates = 0
        for record in result.records:
            digest = payload_hash(record.raw_payload)
            raw_id = f"raw-{collection_run_id}-{digest[:48]}"
            existing_payload = await self.session.execute(
                select(RawObservation.id).where(
                    RawObservation.source_id == source_id,
                    RawObservation.payload_hash == digest,
                ).limit(1)
            )
            if existing_payload.scalar_one_or_none() is not None:
                duplicates += 1
                continue
            self.session.add(RawObservation(
                id=raw_id,
                source_id=source_id,
                source_type=record.source_type,
                source_name=record.source_name,
                collection_job_id=collection_job_id,
                collection_run_id=collection_run_id,
                source_url=record.source_url,
                retrieved_at=record.retrieved_at,
                collection_timestamp=record.collection_timestamp,
                request_parameters=sanitize_request_parameters(record.request_parameters),
                raw_payload=record.raw_payload,
                payload_hash=digest,
                parser_version=record.parser_version,
                route_code=record.route_code,
                origin=record.origin,
                destination=record.destination,
                travel_date=record.travel_date,
                search_date=record.search_date,
                advance_window=record.advance_window,
                airline=record.airline,
                flight_number=record.flight_number,
                fare_class=record.fare_class,
                base_fare=record.base_fare,
                taxes=record.taxes,
                udf=record.udf,
                convenience_fee=record.convenience_fee,
                total_fare=record.total_fare,
                currency=record.currency,
                availability=record.availability,
                source_status="received",
                raw_status="pending",
            ))
            inserted += 1
        await self.session.commit()
        return {"inserted": inserted, "duplicates": duplicates}

    async def execute_collection(self, *, run_id: str, job_id: str, source_id: str, request: CollectionRequest, adapter: FareSourceAdapter) -> CollectionRun:
        run = CollectionRun(id=run_id, collection_job_id=job_id, source_id=source_id, status="running", started_at=datetime.now(timezone.utc))
        run.requested_count = 1
        self.session.add(run)
        await self.session.commit()
        try:
            result = await adapter.collect(request)
            persisted = await self.persist_raw_result(source_id=source_id, collection_run_id=run_id, collection_job_id=job_id, result=result)
            run.status = "failed" if result.failed_count and not result.records else ("partial" if result.failed_count or result.rejected_count else "completed")
            run.fetched_count = len(result.records)
            run.accepted_count = persisted["inserted"]
            run.rejected_count = result.rejected_count
            run.duplicate_count = persisted["duplicates"]
            run.failed_count = result.failed_count
            run.failure_category = result.failure_category
            run.error_message = result.error_message
        except TimeoutError as exc:
            run.status = "failed"
            run.failure_category = "timeout"
            run.error_message = str(exc)
        except ValueError as exc:
            run.status = "failed"
            run.failure_category = "validation_error"
            run.error_message = str(exc)
        except Exception as exc:
            run.status = "failed"
            run.failure_category = "unknown_error"
            run.error_message = str(exc)
        run.completed_at = datetime.now(timezone.utc)
        await self.session.commit()
        return run

    async def health(self) -> dict[str, object]:
        sources = await self.list_sources()
        report: list[dict[str, object]] = []
        for source in sources:
            result = await self.session.execute(select(CollectionRun).where(CollectionRun.source_id == source.id).order_by(CollectionRun.created_at.desc()).limit(1))
            latest = result.scalar_one_or_none()
            report.append({
                "source_id": source.id,
                "source": source.source,
                "source_type": source.source_type,
                "status": "not_configured" if source.source == "FlightAPI" and not settings.flightapi_api_key else "not_collected" if latest is None else latest.status,
                "last_attempted_at": latest.created_at if latest else None,
                "last_successful_at": latest.completed_at if latest and latest.status == "completed" else None,
                "last_error": latest.error_message if latest else None,
                "records_fetched": latest.fetched_count if latest else 0,
                "records_accepted": latest.accepted_count if latest else 0,
                "records_rejected": latest.rejected_count if latest else 0,
                "duplicates": latest.duplicate_count if latest else 0,
            })
        return {"status": "not_configured" if any(item["status"] == "not_configured" for item in report) else "not_collected" if not any(item["status"] != "not_collected" for item in report) else "available", "sources": report}