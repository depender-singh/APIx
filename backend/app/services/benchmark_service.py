from __future__ import annotations

import hashlib
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.benchmark import Benchmark
from app.models.route import Route
from app.schemas.backtesting import BenchmarkImportRecord

ROUTE_ALIASES = {
    "DEL-BOM": "DEL-BOM", "DEL-BLR": "DEL-BLR", "BOM-BLR": "BOM-BLR",
    "DEL-CCU": "DEL-CCU", "BLR-HYD": "BLR-HYD", "MAA-DEL": "MAA-DEL",
    "DELHI-MUMBAI": "DEL-BOM", "DELHI-BENGALURU": "DEL-BLR", "MUMBAI-BENGALURU": "BOM-BLR",
    "DELHI-KOLKATA": "DEL-CCU", "BENGALURU-HYDERABAD": "BLR-HYD", "CHENNAI-DELHI": "MAA-DEL",
}


def normalize_route(route: str) -> str | None:
    return ROUTE_ALIASES.get(route.strip().upper().replace(" -> ", "-"))


class BenchmarkService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_benchmarks(
        self,
        *,
        source_type: str | None = None,
        source: str | None = None,
        route_code: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[Benchmark], int]:
        stmt = select(Benchmark)
        count_stmt = select(func.count()).select_from(Benchmark)
        for column, value in ((Benchmark.source_type, source_type), (Benchmark.source, source), (Benchmark.route_code, route_code)):
            if value:
                stmt = stmt.where(column == value)
                count_stmt = count_stmt.where(column == value)
        total = int((await self.session.execute(count_stmt)).scalar_one() or 0)
        result = await self.session.execute(
            stmt.order_by(Benchmark.benchmark_date.asc(), Benchmark.route_code.asc())
            .offset((page - 1) * page_size).limit(page_size)
        )
        return list(result.scalars().all()), total

    async def get_benchmark(self, benchmark_id: str) -> Benchmark | None:
        return await self.session.get(Benchmark, benchmark_id)

    async def import_records(self, records: list[BenchmarkImportRecord]) -> dict[str, object]:
        route_codes = set((await self.session.execute(select(Route.route_code))).scalars().all())
        imported = 0
        rejected: list[dict[str, str]] = []
        for record in records:
            normalized_route = normalize_route(record.route_code)
            if normalized_route not in route_codes:
                rejected.append({"route_code": record.route_code, "reason": "unmapped_route"})
                continue
            if record.source_type == "dgca" and record.source != "dgca":
                rejected.append({"route_code": record.route_code, "reason": "source_mismatch"})
                continue
            record.route_code = normalized_route
            identifier = self._record_id(record)
            if await self.session.get(Benchmark, identifier) is not None:
                continue
            self.session.add(Benchmark(
                id=identifier,
                benchmark_date=record.benchmark_date,
                route_code=record.route_code,
                benchmark_value=record.benchmark_value,
                benchmark_metric=record.benchmark_metric,
                benchmark_scope=record.benchmark_scope,
                currency=record.currency,
                period_type=record.period_type,
                source=record.source,
                source_type=record.source_type,
                dataset=record.dataset,
                dataset_id=record.dataset_id,
                dataset_version=record.dataset_version,
                source_document=record.source_document,
                source_url=record.source_url,
                reference_period=record.reference_period,
                retrieved_at=record.retrieved_at,
                license=record.license,
                provenance=record.provenance,
                notes=record.notes,
            ))
            imported += 1
        await self.session.commit()
        return {"imported": imported, "rejected": rejected, "duplicates": len(records) - imported - len(rejected)}

    @staticmethod
    def _record_id(record: BenchmarkImportRecord) -> str:
        key = "|".join((record.dataset_id, record.dataset_version or "", record.route_code, record.benchmark_date.isoformat(), record.benchmark_metric))
        return f"benchmark-{hashlib.sha256(key.encode()).hexdigest()[:48]}"
