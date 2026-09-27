from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.airline import Airline
from app.models.index import IndexValue
from app.models.methodology import MethodologyConfig
from app.models.observation import Observation
from app.models.route import Route
from app.schemas.methodology import MethodologyUpdate


class AnalyticsService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_overview(self) -> dict[str, object]:
        latest_index = await self._get_latest_index()
        route_stats = await self.get_route_stats()
        observations = await self._get_observations()
        quality = await self._get_quality_snapshot()

        top_movers = {
            "increases": sorted(route_stats, key=lambda item: item["change_pct"], reverse=True)[:5],
            "decreases": sorted(route_stats, key=lambda item: item["change_pct"])[:5],
        }

        return {
            "latest_index": self._serialize_index(latest_index),
            "route_stats": route_stats,
            "top_movers": top_movers,
            "quality": quality,
            "available_flights": sum(1 for obs in observations if obs.availability == "available"),
            "airlines_count": await self._count_airlines(),
            "quotes_collected": len(observations),
            "index_series": [self._serialize_index(index) for index in await self._get_history()],
            "sparkline": [item["index_value"] for item in [self._serialize_index(index) for index in await self._get_history()]],
        }

    async def get_route_stats(self, route_code: str | None = None) -> list[dict[str, object]]:
        routes = await self._get_routes()
        observations = await self._get_observations(route_code=route_code)

        if route_code:
            routes = [route for route in routes if route.route_code == route_code]

        results: list[dict[str, object]] = []
        for route in routes:
            route_obs = [obs for obs in observations if obs.route_code == route.route_code]
            if not route_obs:
                continue

            results.append(
                {
                    "route_code": route.route_code,
                    "origin": route.origin,
                    "destination": route.destination,
                    "avg_fare": self._average([obs.total_fare for obs in route_obs]),
                    "change_pct": 0,
                    "observations": len(route_obs),
                    "availability_rate": round(
                        (sum(1 for obs in route_obs if obs.availability == "available") / len(route_obs)) * 100,
                        2,
                    ),
                    "airlines_count": len({obs.airline_id for obs in route_obs}),
                    "apix_contribution": 0,
                    "last_updated": route.updated_at.isoformat() if route.updated_at else None,
                }
            )

        return results

    async def get_airline_stats(self, airline_id: str | None = None) -> list[dict[str, object]]:
        airlines = await self._get_airlines()
        observations = await self._get_observations(airline_id=airline_id)

        if airline_id:
            airlines = [airline for airline in airlines if airline.airline_id == airline_id]

        results: list[dict[str, object]] = []
        for airline in airlines:
            airline_obs = [obs for obs in observations if obs.airline_id == airline.airline_id]
            if not airline_obs:
                continue

            results.append(
                {
                    "airline_id": airline.airline_id,
                    "avg_fare": self._average([obs.total_fare for obs in airline_obs]),
                    "fare_change": 0,
                    "routes_count": len({obs.route_code for obs in airline_obs}),
                    "observations": len(airline_obs),
                    "availability_rate": round(
                        (sum(1 for obs in airline_obs if obs.availability == "available") / len(airline_obs)) * 100,
                        2,
                    ),
                    "avg_taxes": self._average([obs.taxes for obs in airline_obs]),
                    "avg_convenience_fee": self._average([obs.convenience_fee for obs in airline_obs]),
                }
            )

        return results

    async def get_lead_time(
        self,
        route_code: str | None = None,
        airline_id: str | None = None,
    ) -> list[dict[str, object]]:
        observations = await self._get_observations(route_code=route_code, airline_id=airline_id)
        window_values: list[dict[str, object]] = []

        for window in [1, 7, 15, 30, 45]:
            window_obs = [obs for obs in observations if obs.advance_window == window]
            window_values.append(
                {
                    "advance_window": window,
                    "avg_fare": self._average([obs.total_fare for obs in window_obs]),
                    "observations": len(window_obs),
                }
            )

        return window_values

    async def get_fare_composition(
        self,
        route_code: str | None = None,
        airline_id: str | None = None,
    ) -> dict[str, object]:
        observations = await self._get_observations(route_code=route_code, airline_id=airline_id)
        if not observations:
            return {
                "base_fare": None,
                "taxes": None,
                "udf": None,
                "convenience_fee": None,
                "total": None,
                "decomposition_status": "insufficient_data",
                "decomposition_observations": 0,
            }

        complete = [
            observation
            for observation in observations
            if all(value is not None for value in (observation.base_fare, observation.taxes, observation.udf, observation.convenience_fee))
        ]

        return {
            "base_fare": self._average([obs.base_fare for obs in complete]),
            "taxes": self._average([obs.taxes for obs in complete]),
            "udf": self._average([obs.udf for obs in complete]),
            "convenience_fee": self._average([obs.convenience_fee for obs in complete]),
            "total": self._average([obs.total_fare for obs in observations]),
            "decomposition_status": "complete" if len(complete) == len(observations) else "partial" if complete else "insufficient_data",
            "decomposition_observations": len(complete),
        }

    async def get_availability(
        self,
        route_code: str | None = None,
        airline_id: str | None = None,
    ) -> dict[str, object]:
        observations = await self._get_observations(route_code=route_code, airline_id=airline_id)
        total = len(observations)
        if total == 0:
            return {"rate": 0, "available": 0, "limited": 0, "sold_out": 0, "cancelled": 0, "total": 0}

        available = sum(1 for obs in observations if obs.availability == "available")
        limited = sum(1 for obs in observations if obs.availability == "limited")
        sold_out = sum(1 for obs in observations if obs.availability == "sold_out")
        cancelled = sum(1 for obs in observations if obs.availability == "cancelled")

        return {
            "rate": round((available / total) * 100, 2),
            "available": available,
            "limited": limited,
            "sold_out": sold_out,
            "cancelled": cancelled,
            "total": total,
        }

    async def get_historical_index(self) -> list[dict[str, object]]:
        return [self._serialize_index(index) for index in await self._get_history()]

    async def get_methodology_config(self) -> dict[str, object]:
        config = await self._get_methodology_config()
        if config is None:
            return {
                "id": "methodology-default",
                "methodology_version": "apix-v1.0",
                "base_period": "2026-09-12",
                "aggregation_method": "weighted_average",
                "observation_frequency": "daily",
                "fare_metric": "total_fare",
                "outlier_method": "iqr",
                "is_active": True,
                "route_weight_version": "synthetic-demo-v1",
                "route_weights": {
                    "DEL-BOM": 15,
                    "DEL-BLR": 12,
                    "BOM-BLR": 10,
                    "DEL-CCU": 8,
                    "BLR-HYD": 7,
                    "MAA-DEL": 6,
                },
            }

        return {
            "id": config.id,
            "methodology_version": config.methodology_version,
            "base_period": str(config.base_period),
            "aggregation_method": config.aggregation_method,
            "observation_frequency": config.observation_frequency,
            "fare_metric": config.fare_metric,
            "outlier_method": config.outlier_method,
            "is_active": config.is_active,
            "route_weight_version": config.route_weight_version,
            "route_weights": config.route_weights,
        }

    async def update_methodology(self, payload: MethodologyUpdate) -> dict[str, object]:
        route_codes = set(
            (await self.session.execute(select(Route.route_code))).scalars().all()
        )
        unknown_routes = sorted(set(payload.route_weights) - route_codes)
        if unknown_routes:
            raise ValueError(f"Unknown route codes: {', '.join(unknown_routes)}")

        await self.session.execute(
            update(MethodologyConfig).where(MethodologyConfig.is_active.is_(True)).values(is_active=False)
        )
        config = MethodologyConfig(
            id=f"methodology-{uuid4().hex}",
            methodology_version=payload.methodology_version,
            base_period=payload.base_period.isoformat(),
            aggregation_method=payload.aggregation_method,
            observation_frequency=payload.observation_frequency,
            fare_metric=payload.fare_metric,
            outlier_method=payload.outlier_method,
            route_weight_version=payload.methodology_version,
            route_weights={code: float(weight) for code, weight in payload.route_weights.items()},
            is_active=True,
        )
        self.session.add(config)
        await self.session.commit()
        await self.session.refresh(config)
        return await self.get_methodology_config()

    async def recalculate(self, index_date: date) -> IndexValue:
        config = await self._get_methodology_config()
        if config is None:
            raise ValueError("No active methodology configuration exists")

        observations_stmt = select(Observation).where(
            Observation.cleaning_status == "clean",
            Observation.index_eligible.is_(True),
            Observation.availability == "available",
            Observation.travel_date == index_date,
        )
        observations = list((await self.session.execute(observations_stmt)).scalars().all())
        if not observations:
            raise ValueError(f"No eligible observations found for {index_date.isoformat()}")

        route_prices: dict[str, tuple[Decimal, Decimal]] = {}
        if config.fare_metric == "total_fare":
            baseline_stmt = select(Observation).where(
                Observation.cleaning_status == "clean",
                Observation.index_eligible.is_(True),
                Observation.availability == "available",
                Observation.reference_period == str(config.base_period),
            )
            baseline_observations = list((await self.session.execute(baseline_stmt)).scalars().all())
            for route_code in config.route_weights:
                current_values = [obs.total_fare for obs in observations if obs.route_code == route_code]
                baseline_values = [obs.total_fare for obs in baseline_observations if obs.route_code == route_code]
                if current_values and baseline_values:
                    current = sum((Decimal(str(value)) for value in current_values), Decimal("0")) / len(current_values)
                    base = sum((Decimal(str(value)) for value in baseline_values), Decimal("0")) / len(baseline_values)
                    if base > 0:
                        route_prices[route_code] = (current, base)
        else:
            for route_code in config.route_weights:
                route_observations = [obs for obs in observations if obs.route_code == route_code]
                decomposed = [obs for obs in route_observations if obs.base_fare is not None]
                if decomposed:
                    current = sum((Decimal(str(obs.total_fare)) for obs in decomposed), Decimal("0")) / len(decomposed)
                    base = sum((Decimal(str(obs.base_fare)) for obs in decomposed), Decimal("0")) / len(decomposed)
                    if base > 0:
                        route_prices[route_code] = (current, base)

        weighted_sum = Decimal("0")
        weighted_base = Decimal("0")
        for route_code, (current, base) in route_prices.items():
            weight = Decimal(str(config.route_weights[route_code]))
            weighted_sum += weight * current
            weighted_base += weight * base
        if weighted_base == 0:
            required_field = "total fares" if config.fare_metric == "total_fare" else "base fares"
            raise ValueError(f"Eligible observations do not contain valid {required_field} for the configured methodology")

        value = (weighted_sum / weighted_base) * Decimal("100")
        index_id = f"idx-{index_date.isoformat()}-{config.id}"
        index = await self.session.get(IndexValue, index_id)
        if index is None:
            index = IndexValue(id=index_id, index_date=index_date, index_value=float(value))
            self.session.add(index)
        index.index_value = float(value)
        index.methodology_config_id = config.id
        index.methodology_version = config.methodology_version
        index.base_period = str(config.base_period)
        index.aggregation_method = config.aggregation_method
        index.observation_frequency = config.observation_frequency
        index.fare_metric = config.fare_metric
        index.outlier_method = config.outlier_method
        index.route_weight_version = config.route_weight_version
        await self.session.commit()
        await self.session.refresh(index)
        return index

    async def _get_history(self) -> list[IndexValue]:
        stmt = select(IndexValue).order_by(IndexValue.index_date.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def _get_observations(
        self,
        route_code: str | None = None,
        airline_id: str | None = None,
    ) -> list[Observation]:
        stmt = select(Observation).where(Observation.cleaning_status == "clean")
        if route_code:
            stmt = stmt.where(Observation.route_code == route_code)
        if airline_id:
            stmt = stmt.where(Observation.airline_id == airline_id)
        stmt = stmt.order_by(Observation.travel_date.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def _get_routes(self) -> list[Route]:
        stmt = select(Route).order_by(Route.route_code.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def _get_methodology_config(self) -> MethodologyConfig | None:
        stmt = select(MethodologyConfig).where(MethodologyConfig.is_active.is_(True)).limit(1)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_airlines(self) -> list[Airline]:
        stmt = select(Airline).order_by(Airline.airline_name.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def _count_airlines(self) -> int:
        stmt = select(func.count()).select_from(Airline)
        result = await self.session.execute(stmt)
        return int(result.scalar_one() or 0)

    async def _get_quality_snapshot(self) -> dict[str, float | int | None]:
        total_stmt = select(func.count()).select_from(Observation)
        total_result = await self.session.execute(total_stmt)
        total = int(total_result.scalar_one() or 0)

        available_stmt = select(func.count()).where(Observation.availability == "available")
        available_result = await self.session.execute(available_stmt)
        available = int(available_result.scalar_one() or 0)

        clean_stmt = select(func.count()).where(Observation.cleaning_status == "clean")
        clean_result = await self.session.execute(clean_stmt)
        clean_total = int(clean_result.scalar_one() or 0)

        return {
            "total_observations": total,
            "valid_observations": clean_total,
            "invalid_observations": total - clean_total,
            "duplicate_observations": 0,
            "missing_field_observations": 0,
            "sold_out_observations": 0,
            "cancelled_observations": 0,
            "outlier_observations": 0,
            "available_observations": available,
            "index_eligible_observations": clean_total,
            "fare_complete_observations": sum(1 for observation in await self._get_observations() if observation.fare_completeness == "complete"),
            "fare_total_only_observations": sum(1 for observation in await self._get_observations() if observation.fare_completeness == "total_only"),
            "completeness_rate": round((clean_total / total) * 100, 2) if total else None,
            "validity_rate": round((clean_total / total) * 100, 2) if total else None,
            "duplicate_rate": 0.0 if total else None,
            "availability_rate": round((available / total) * 100, 2) if total else None,
            "outlier_rate": 0.0 if total else None,
        }

    async def _get_latest_index(self) -> IndexValue | None:
        stmt = select(IndexValue).order_by(IndexValue.index_date.desc(), IndexValue.created_at.desc()).limit(1)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    def _average(self, values: list[Decimal | float | None]) -> float | None:
        present = [value for value in values if value is not None]
        if not present:
            return None
        total = sum(Decimal(str(value)) for value in present)
        return float(total / Decimal(len(present)))

    def _serialize_index(self, index: IndexValue | None) -> dict[str, object] | None:
        if index is None:
            return None
        return {
            "index_date": index.index_date.isoformat(),
            "index_value": float(index.index_value),
            "methodology_config_id": index.methodology_config_id,
            "methodology_version": index.methodology_version,
            "base_period": index.base_period,
            "aggregation_method": index.aggregation_method,
            "observation_frequency": index.observation_frequency,
            "fare_metric": index.fare_metric,
            "outlier_method": index.outlier_method,
            "route_weight_version": index.route_weight_version,
        }
