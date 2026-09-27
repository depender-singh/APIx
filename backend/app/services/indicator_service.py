from __future__ import annotations

import hashlib
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.index import IndexValue
from app.models.indicator import OfficialIndicator
from app.schemas.indicator import IndicatorImportRecord, IndicatorImportRequest
from app.services.mospi_source import MoSPIIndicatorSource


class IndicatorService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_indicators(
        self,
        *,
        source_type: str | None = None,
        indicator_code: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        geography: str | None = None,
        frequency: str | None = None,
        base_year: int | None = None,
        series: str | None = None,
        sector: str | None = None,
        division: str | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[OfficialIndicator], int]:
        stmt = select(OfficialIndicator)
        count_stmt = select(func.count()).select_from(OfficialIndicator)
        filters = (
            (OfficialIndicator.source_type, source_type),
            (OfficialIndicator.indicator_code, indicator_code),
            (OfficialIndicator.geography, geography),
            (OfficialIndicator.frequency, frequency),
            (OfficialIndicator.base_year, base_year),
            (OfficialIndicator.series, series),
            (OfficialIndicator.sector, sector),
            (OfficialIndicator.division, division),
        )
        for column, value in filters:
            if value:
                stmt = stmt.where(column == value)
                count_stmt = count_stmt.where(column == value)
        if start_date:
            stmt = stmt.where(OfficialIndicator.observation_date >= start_date)
            count_stmt = count_stmt.where(OfficialIndicator.observation_date >= start_date)
        if end_date:
            stmt = stmt.where(OfficialIndicator.observation_date <= end_date)
            count_stmt = count_stmt.where(OfficialIndicator.observation_date <= end_date)
        total = int((await self.session.execute(count_stmt)).scalar_one() or 0)
        rows = await self.session.execute(stmt.order_by(OfficialIndicator.observation_date.asc()).offset((page - 1) * page_size).limit(page_size))
        return list(rows.scalars().all()), total

    async def get_indicator(self, indicator_code: str) -> OfficialIndicator | None:
        result = await self.session.execute(select(OfficialIndicator).where(OfficialIndicator.indicator_code == indicator_code).order_by(OfficialIndicator.observation_date.desc()).limit(1))
        return result.scalar_one_or_none()

    async def import_mospi(self, records: list[IndicatorImportRecord]) -> dict[str, object]:
        normalized = MoSPIIndicatorSource.normalize_records(records)
        imported, duplicates = await self._persist_records(normalized)
        return {
            "status": "imported",
            "fetched": len(records),
            "accepted": len(normalized),
            "rejected": 0,
            "inserted": imported,
            "skipped_duplicates": duplicates,
            "imported": imported,
            "duplicates": duplicates,
        }

    async def import_controlled_cpi(self, request: IndicatorImportRequest) -> dict[str, object]:
        result = await MoSPIIndicatorSource.fetch_cpi(request)
        imported, duplicates = await self._persist_records(result.records)
        return {
            "status": "imported",
            "fetched": result.fetched,
            "accepted": len(result.records),
            "rejected": result.rejected,
            "inserted": imported,
            "skipped_duplicates": duplicates,
            "pages": result.pages,
            "imported": imported,
            "duplicates": duplicates,
        }

    async def _persist_records(self, records: list[IndicatorImportRecord]) -> tuple[int, int]:
        imported = 0
        duplicates = 0
        for record in records:
            record_id = self._record_id(record)
            if await self.session.get(OfficialIndicator, record_id):
                duplicates += 1
                continue
            self.session.add(OfficialIndicator(
                id=record_id,
                source_type=record.source_type,
                organization=record.organization,
                source=record.source,
                dataset_name=record.dataset_name,
                dataset_id=record.dataset_id,
                dataset_version=record.dataset_version,
                indicator_code=record.indicator_code,
                indicator_name=record.indicator_name,
                category=record.category,
                geography=record.geography,
                unit=record.unit,
                observation_date=record.observation_date,
                value=record.value,
                base_period=record.base_period,
                frequency=record.frequency,
                reference_period=record.reference_period,
                source_url=record.source_url,
                retrieved_at=record.retrieved_at,
                published_at=record.published_at,
                methodology_version=record.methodology_version,
                provenance=record.provenance,
                is_official=record.is_official,
                base_year=record.base_year,
                series=record.series,
                year=record.year,
                month=record.month,
                state=record.state,
                sector=record.sector,
                division=record.division,
                group=record.group,
                class_name=record.class_name,
                sub_class=record.sub_class,
                item=record.item,
                code=record.code,
                index_value=record.index_value,
                inflation_value=record.inflation_value,
                imputation=record.imputation,
            ))
            imported += 1
        await self.session.commit()
        return imported, duplicates

    async def inflation_context(self, start_date: date | None = None, end_date: date | None = None) -> dict[str, object]:
        rows, _ = await self.list_indicators(source_type="mospi", indicator_code="CPI", start_date=start_date, end_date=end_date, geography="All India", frequency="monthly", base_year=2024, series="Current", sector="Combined", division="CPI (General)", page_size=500)
        if not rows:
            return {"status": "source_not_imported", "source_type": "mospi", "indicator_code": "CPI", "items": [], "apix_series": [], "comparison": None}
        indexes_result = await self.session.execute(select(IndexValue).order_by(IndexValue.index_date.asc()))
        indexes = list(indexes_result.scalars().all())
        cpi_by_date = {row.observation_date: row for row in rows if row.index_value is not None}
        pairs = [(index.index_date, float(index.index_value), float(cpi_by_date[index.index_date].index_value), cpi_by_date[index.index_date].inflation_value) for index in indexes if index.index_date in cpi_by_date]
        if not pairs:
            return {"status": "insufficient_data", "source_type": "mospi", "indicator_code": "CPI", "items": rows, "apix_series": [], "comparison": None}
        apix_base, cpi_base = pairs[0][1], pairs[0][2]
        series = [{"date": period.isoformat(), "apix": apix / apix_base * 100, "cpi": cpi / cpi_base * 100, "cpi_inflation": float(inflation) if inflation is not None else None} for period, apix, cpi, inflation in pairs]
        return {"status": "valid" if len(series) >= 2 else "insufficient_data", "source_type": "mospi", "indicator_code": "CPI", "items": rows, "apix_series": series, "comparison": {"observation_count": len(series), "apix_change_pct": series[-1]["apix"] - 100, "cpi_change_pct": series[-1]["cpi"] - 100, "difference_percentage_points": (series[-1]["apix"] - 100) - (series[-1]["cpi"] - 100)}}

    @staticmethod
    def _record_id(record: IndicatorImportRecord) -> str:
        dimensions = (record.base_year, record.series, record.year, record.month, record.state, record.sector, record.division, record.group, record.class_name, record.sub_class, record.item, record.code)
        key = "|".join((record.source, record.dataset_id or "", *(str(value or "") for value in dimensions)))
        return f"indicator-{hashlib.sha256(key.encode()).hexdigest()[:56]}"
