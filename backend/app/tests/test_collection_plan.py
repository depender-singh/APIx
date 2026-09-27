import asyncio
from datetime import date, datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from time import monotonic

import pytest
import httpx

from app.services.collection_orchestrator import CollectionOrchestrator, ExecutionControls, LiveExecutionRequired
from app.services.collection_plan import REPRESENTATIVE_ROUTES, REPRESENTATIVE_WINDOWS, build_collection_plan, build_dry_run_report
from app.models.collection_job import CollectionJob
from app.models.data_source import DataSource
from app.schemas.collection import CollectionResult, RawFareRecord
from app.services.collection_service import CollectionService


class FakeCollectionService:
    def __init__(self, *, failed_context: str | None = None, duration: float = 0.01) -> None:
        self.failed_context = failed_context
        self.duration = duration
        self.active = 0
        self.max_active = 0
        self.calls: list[str] = []

    async def list_plan_runs(self, job_id: str) -> list[object]:
        return []

    async def execute_collection(self, *, run_id: str, **kwargs: object) -> SimpleNamespace:
        context_id = str(kwargs["request"].request_parameters["context_id"])
        self.calls.append(context_id)
        self.active += 1
        self.max_active = max(self.max_active, self.active)
        await asyncio.sleep(self.duration)
        self.active -= 1
        status = "failed" if context_id == self.failed_context else "completed"
        return SimpleNamespace(
            id=run_id,
            status=status,
            accepted_count=0 if status == "failed" else 1,
            requested_count=1,
            duplicate_count=0,
            rejected_count=0,
            failed_count=1 if status == "failed" else 0,
            normalized_count=0,
        )

    async def normalize_run(self, run_id: str) -> int:
        return 0

    async def mark_run_failed(self, run_id: str, message: str) -> SimpleNamespace:
        return SimpleNamespace(id=run_id, status="failed", accepted_count=0, requested_count=1, duplicate_count=0, rejected_count=0, failed_count=1, normalized_count=0)


class TransactionalFakeService(FakeCollectionService):
    def __init__(self, *, failure: BaseException | None = None) -> None:
        super().__init__(duration=0)
        self.failure = failure
        self.persisted_runs: list[SimpleNamespace] = []
        self.raw_observations: list[str] = []
        self.normalized_observations: list[str] = []
        self.pending_rollback = False

    async def execute_collection(self, *, run_id: str, **kwargs: object) -> SimpleNamespace:
        if self.pending_rollback:
            raise AssertionError("shared transaction is still in pending rollback")
        request = kwargs["request"]
        if self.failure is not None:
            failure = self.failure
            self.failure = None
            run = SimpleNamespace(id=run_id, status="running", requested_count=1, accepted_count=0, duplicate_count=0, rejected_count=0, failed_count=0, normalized_count=0)
            self.persisted_runs.append(run)
            if isinstance(failure, asyncio.TimeoutError):
                run.status = "failed"
                run.failure_category = "request_timeout"
                run.failed_count = 1
                return run
            if isinstance(failure, httpx.ReadTimeout):
                run.status = "failed"
                run.failure_category = "read_timeout"
                run.failed_count = 1
                return run
            self.pending_rollback = True
            raise failure
        run = SimpleNamespace(id=run_id, status="completed", requested_count=1, accepted_count=1, duplicate_count=0, rejected_count=0, failed_count=0, normalized_count=0)
        self.persisted_runs.append(run)
        self.raw_observations.append(request.request_parameters["context_id"])
        return run

    async def normalize_run(self, run_id: str) -> int:
        run = next(item for item in self.persisted_runs if item.id == run_id)
        if run.status == "completed":
            self.normalized_observations.append(run_id)
            return 1
        return 0

    async def rollback(self) -> None:
        self.pending_rollback = False

    async def mark_run_failed(self, run_id: str, message: str, failure_category: str = "request_timeout") -> SimpleNamespace:
        self.pending_rollback = False
        run = SimpleNamespace(id=run_id, status="failed", requested_count=1, accepted_count=0, duplicate_count=0, rejected_count=0, failed_count=1, normalized_count=0, failure_category=failure_category)
        self.persisted_runs.append(run)
        return run


def plan():
    return build_collection_plan(search_date=date(2026, 9, 21), source_id="source-flightapi")


def test_plan_contains_exactly_six_routes_and_five_windows() -> None:
    value = plan()
    assert len(value.contexts) == 30
    assert {(context.route_code, context.origin, context.destination) for context in value.contexts} == set(REPRESENTATIVE_ROUTES)
    assert {context.advance_window for context in value.contexts} == set(REPRESENTATIVE_WINDOWS)


def test_plan_ids_and_contexts_are_deterministic_and_unique() -> None:
    first = plan()
    second = plan()
    assert first.job_id == second.job_id
    assert [context.context_id for context in first.contexts] == [context.context_id for context in second.contexts]
    assert len({context.context_id for context in first.contexts}) == 30


def test_plan_derives_travel_dates_and_preserves_request_context() -> None:
    value = plan()
    for context in value.contexts:
        assert (context.travel_date - context.search_date).days == context.advance_window
        assert context.request_parameters["currency"] == "INR"
        assert context.request_parameters["cabin_class"] == "Economy"
        assert context.request_parameters["number_of_adults"] == 1
        assert context.request_parameters["context_id"] == context.context_id


def test_dry_run_reports_exactly_thirty_provider_requests() -> None:
    report = build_dry_run_report(plan())
    assert report["total_contexts"] == 30
    requests = report["provider_requests"]
    assert len(requests) == 30
    assert [item["request_number"] for item in requests] == list(range(1, 31))
    assert all(item["expected_provider_call_count"] == 1 for item in requests)


def test_live_execution_requires_explicit_flag_and_does_not_construct_adapter() -> None:
    constructed = False

    def factory() -> object:
        nonlocal constructed
        constructed = True
        return object()

    with pytest.raises(LiveExecutionRequired):
        asyncio.run(CollectionOrchestrator(FakeCollectionService()).execute(plan(), adapter_factory=factory, controls=ExecutionControls()))
    assert constructed is False


def test_execution_respects_concurrency_and_isolates_failed_context() -> None:
    value = plan()
    service = FakeCollectionService(failed_context=value.contexts[3].context_id)
    runs = asyncio.run(CollectionOrchestrator(service).execute(
        value,
        adapter_factory=lambda: object(),
        controls=ExecutionControls(max_concurrency=3, live_execution=True),
    ))
    assert len(runs) == 30
    assert service.max_active <= 3
    assert sum(run.status == "failed" for run in runs) == 1
    assert sum(run.status == "completed" for run in runs) == 29


def test_execution_delay_is_bounded_between_request_starts() -> None:
    value = build_collection_plan(search_date=date(2026, 9, 21), source_id="source-flightapi")
    service = FakeCollectionService(duration=0)
    started = monotonic()
    asyncio.run(CollectionOrchestrator(service).execute(
        value,
        adapter_factory=lambda: object(),
        controls=ExecutionControls(max_concurrency=1, delay_seconds=0.001, live_execution=True),
    ))
    assert monotonic() - started >= 0.02


@pytest.mark.parametrize("failure, expected_category", [
    (asyncio.TimeoutError(), "request_timeout"),
    (httpx.ReadTimeout("provider timeout"), "read_timeout"),
])
def test_timeout_context_isolated_from_next_context(failure: BaseException, expected_category: str) -> None:
    value = plan()
    service = TransactionalFakeService(failure=failure)
    two_context_plan = value.__class__(
        job_id=value.job_id,
        name=value.name,
        search_date=value.search_date,
        source_id=value.source_id,
        source_name=value.source_name,
        source_type=value.source_type,
        contexts=value.contexts[:2],
    )
    runs = asyncio.run(CollectionOrchestrator(service).execute(
        two_context_plan,
        adapter_factory=lambda: object(),
        controls=ExecutionControls(max_concurrency=1, live_execution=True),
    ))
    assert runs[0].status == "failed"
    assert runs[0].failure_category == expected_category
    assert runs[1].status == "completed"
    assert service.pending_rollback is False
    assert len(service.raw_observations) == 1
    assert len(service.normalized_observations) == 1


def test_orchestrator_has_no_outer_wait_for_cancellation() -> None:
    source = __import__("pathlib").Path(__file__).parents[1] / "services" / "collection_orchestrator.py"
    assert "asyncio.wait_for" not in source.read_text(encoding="utf-8")


class FakePlanSession:
    def __init__(self) -> None:
        self.source = SimpleNamespace(id="source-flightapi", source="FlightAPI", source_type="licensed_flight_provider")
        self.job = None
        self.added = 0
        self.commits = 0

    async def get(self, model: object, identifier: str) -> object | None:
        if model is DataSource:
            return self.source
        if model is CollectionJob:
            return self.job
        return None

    def add(self, value: object) -> None:
        self.job = value
        self.added += 1

    async def commit(self) -> None:
        self.commits += 1


def test_planning_twice_creates_one_logical_job() -> None:
    session = FakePlanSession()
    service = CollectionService(session)
    first = asyncio.run(service.create_or_get_plan(search_date=date(2026, 9, 21), source_id="source-flightapi"))
    second = asyncio.run(service.create_or_get_plan(search_date=date(2026, 9, 21), source_id="source-flightapi"))
    assert first.job_id == second.job_id
    assert session.added == 1
    assert session.commits == 1


class FakePersistSession:
    def __init__(self) -> None:
        self.known_hash = None
        self.added = []
        self.commits = 0

    async def execute(self, statement: object) -> object:
        known_hash = self.known_hash

        class Result:
            def scalar_one_or_none(self) -> str | None:
                return known_hash

        return Result()

    def add(self, value: object) -> None:
        self.added.append(value)

    async def commit(self) -> None:
        self.commits += 1
        self.known_hash = "existing-raw"


def test_identical_payload_across_runs_is_deduplicated() -> None:
    timestamp = datetime(2026, 9, 21, tzinfo=timezone.utc)
    record = RawFareRecord(
        source_name="FlightAPI",
        source_type="licensed_flight_provider",
        retrieved_at=timestamp,
        collection_timestamp=timestamp,
        request_parameters={"context_id": "ctx-1", "currency": "INR"},
        raw_payload={"same": "payload"},
        parser_version="fixture-v1",
        route_code="DEL-BOM",
        origin="DEL",
        destination="BOM",
        travel_date=date(2026, 9, 22),
        search_date=date(2026, 9, 21),
        advance_window=1,
        total_fare=Decimal("1000"),
        currency="INR",
    )
    session = FakePersistSession()
    service = CollectionService(session)
    result = CollectionResult(records=[record])
    first = asyncio.run(service.persist_raw_result(source_id="source-flightapi", collection_run_id="run-1", collection_job_id="job-1", result=result))
    second = asyncio.run(service.persist_raw_result(source_id="source-flightapi", collection_run_id="run-2", collection_job_id="job-1", result=result))
    assert first == {"inserted": 1, "duplicates": 0}
    assert second == {"inserted": 0, "duplicates": 1}
    assert len(session.added) == 1
