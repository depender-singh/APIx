from __future__ import annotations

import hashlib
import math
from collections import defaultdict
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.backtest import BacktestResult
from app.models.benchmark import Benchmark
from app.models.index import IndexValue
from app.models.methodology import MethodologyConfig
from app.models.observation import Observation

MIN_COMPARABLE_PERIODS = 3


def normalize(values: list[float]) -> list[float]:
    if not values or values[0] == 0:
        return []
    return [value / values[0] * 100 for value in values]


def calculate_metrics(api_values: list[float], benchmark_values: list[float]) -> dict[str, float | int | None | str]:
    if len(api_values) != len(benchmark_values) or len(api_values) < MIN_COMPARABLE_PERIODS:
        return {"status": "insufficient_data", "observation_count": len(api_values), "correlation": None, "mae": None, "rmse": None, "directional_accuracy": None, "bias": None, "mape": None, "stability": None}
    api = normalize(api_values)
    benchmark = normalize(benchmark_values)
    if len(api) < MIN_COMPARABLE_PERIODS:
        return {"status": "insufficient_data", "observation_count": len(api), "correlation": None, "mae": None, "rmse": None, "directional_accuracy": None, "bias": None, "mape": None, "stability": None}
    errors = [a - b for a, b in zip(api, benchmark)]
    api_mean = sum(api) / len(api)
    benchmark_mean = sum(benchmark) / len(benchmark)
    covariance = sum((a - api_mean) * (b - benchmark_mean) for a, b in zip(api, benchmark))
    api_variance = sum((a - api_mean) ** 2 for a in api)
    benchmark_variance = sum((b - benchmark_mean) ** 2 for b in benchmark)
    correlation = covariance / math.sqrt(api_variance * benchmark_variance) if api_variance and benchmark_variance else None
    api_directions = [api[index] - api[index - 1] for index in range(1, len(api))]
    benchmark_directions = [benchmark[index] - benchmark[index - 1] for index in range(1, len(benchmark))]
    directional_accuracy = (sum((a >= 0) == (b >= 0) for a, b in zip(api_directions, benchmark_directions)) / len(api_directions)) * 100 if api_directions else None
    return {
        "status": "valid",
        "observation_count": len(api),
        "correlation": correlation,
        "mae": sum(abs(error) for error in errors) / len(errors),
        "rmse": math.sqrt(sum(error * error for error in errors) / len(errors)),
        "directional_accuracy": directional_accuracy,
        "bias": sum(errors) / len(errors),
        "mape": sum(abs(error / benchmark_value) for error, benchmark_value in zip(errors, benchmark) if benchmark_value != 0) / sum(benchmark_value != 0 for benchmark_value in benchmark) * 100,
        "stability": math.sqrt(sum((error - (sum(errors) / len(errors))) ** 2 for error in errors) / len(errors)),
    }


class BacktestingService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_results(self, page: int = 1, page_size: int = 50) -> tuple[list[BacktestResult], int]:
        result = await self.session.execute(select(BacktestResult).order_by(BacktestResult.created_at.desc()).offset((page - 1) * page_size).limit(page_size))
        rows = list(result.scalars().all())
        total = len((await self.session.execute(select(BacktestResult.id))).scalars().all())
        return rows, total

    async def get_result(self, result_id: str) -> BacktestResult | None:
        return await self.session.get(BacktestResult, result_id)

    async def latest(self) -> BacktestResult | None:
        result = await self.session.execute(select(BacktestResult).order_by(BacktestResult.created_at.desc()).limit(1))
        return result.scalar_one_or_none()

    async def run(self, *, start_date: date | None, end_date: date | None, route_code: str | None, benchmark_source: str, frequency: str, methodology_version: str | None) -> BacktestResult:
        config = await self._methodology(methodology_version)
        version = config.methodology_version if config else methodology_version
        benchmarks_stmt = select(Benchmark).where(Benchmark.source == benchmark_source)
        if start_date:
            benchmarks_stmt = benchmarks_stmt.where(Benchmark.benchmark_date >= start_date)
        if end_date:
            benchmarks_stmt = benchmarks_stmt.where(Benchmark.benchmark_date <= end_date)
        if route_code:
            benchmarks_stmt = benchmarks_stmt.where(Benchmark.route_code == route_code)
        benchmark_rows = list((await self.session.execute(benchmarks_stmt.order_by(Benchmark.benchmark_date.asc()))).scalars().all())
        index_stmt = select(IndexValue).order_by(IndexValue.index_date.asc())
        if start_date:
            index_stmt = index_stmt.where(IndexValue.index_date >= start_date)
        if end_date:
            index_stmt = index_stmt.where(IndexValue.index_date <= end_date)
        if version:
            index_stmt = index_stmt.where(IndexValue.methodology_version == version)
        index_rows = list((await self.session.execute(index_stmt)).scalars().all())
        grouped_benchmarks: dict[date, list[float]] = defaultdict(list)
        for row in benchmark_rows:
            grouped_benchmarks[row.benchmark_date].append(float(row.benchmark_value))
        if route_code:
            observations_stmt = select(Observation).where(Observation.route_code == route_code, Observation.cleaning_status == "clean", Observation.index_eligible.is_(True))
            observations = list((await self.session.execute(observations_stmt)).scalars().all())
            route_values = {observation.travel_date: (float(observation.total_fare) / float(observation.base_fare) * 100) for observation in observations if observation.base_fare and observation.base_fare > 0}
            pairs = [(period, route_values[period], sum(grouped_benchmarks[period]) / len(grouped_benchmarks[period])) for period in grouped_benchmarks if period in route_values]
        else:
            pairs = [(row.index_date, float(row.index_value), sum(grouped_benchmarks[row.index_date]) / len(grouped_benchmarks[row.index_date])) for row in index_rows if row.index_date in grouped_benchmarks]
        api_values = [pair[1] for pair in pairs]
        benchmark_values = [pair[2] for pair in pairs]
        metrics = calculate_metrics(api_values, benchmark_values)
        series = [{"date": period.isoformat(), "apix": normalized_api, "benchmark": normalized_benchmark} for period, normalized_api, normalized_benchmark in zip((pair[0] for pair in pairs), normalize(api_values), normalize(benchmark_values))]
        dataset = benchmark_rows[0].dataset if benchmark_rows else None
        benchmark_version = benchmark_rows[0].dataset_version if benchmark_rows else None
        result_id = self._result_id(benchmark_source, dataset, benchmark_version, version, route_code, start_date, end_date, frequency)
        result = await self.session.get(BacktestResult, result_id)
        if result is None:
            result = BacktestResult(id=result_id, benchmark_source=benchmark_source, frequency=frequency, observation_count=0, status="insufficient_data", series=[], route_results=[])
            self.session.add(result)
        result.benchmark_dataset = dataset
        result.benchmark_version = benchmark_version
        result.methodology_version = version
        result.route_scope = route_code or "overall"
        result.start_date = start_date
        result.end_date = end_date
        result.frequency = frequency
        result.observation_count = int(metrics["observation_count"])
        result.status = str(metrics["status"])
        result.correlation = metrics["correlation"]
        result.mae = metrics["mae"]
        result.rmse = metrics["rmse"]
        result.directional_accuracy = metrics["directional_accuracy"]
        result.bias = metrics["bias"]
        result.mape = metrics["mape"]
        result.stability = metrics["stability"]
        result.series = series
        result.route_results = [{"route": route_code, **metrics}] if route_code else []
        await self.session.commit()
        await self.session.refresh(result)
        return result

    async def _methodology(self, version: str | None) -> MethodologyConfig | None:
        stmt = select(MethodologyConfig).where(MethodologyConfig.methodology_version == version) if version else select(MethodologyConfig).where(MethodologyConfig.is_active.is_(True))
        return (await self.session.execute(stmt.limit(1))).scalar_one_or_none()

    @staticmethod
    def _result_id(source: str, dataset: str | None, dataset_version: str | None, methodology: str | None, route: str | None, start: date | None, end: date | None, frequency: str) -> str:
        key = "|".join(str(value or "") for value in (source, dataset, dataset_version, methodology, route, start, end, frequency))
        return f"backtest-{hashlib.sha256(key.encode()).hexdigest()[:48]}"
