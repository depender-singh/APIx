from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.airline import Airline
from app.models.data_source import DataSource
from app.models.index import IndexValue
from app.models.methodology import MethodologyConfig
from app.models.observation import Observation
from app.models.route import Route

ROUTES = [
    ("r1", "DEL-BOM", "DEL", "BOM", "Delhi", "Mumbai", True),
    ("r2", "DEL-BLR", "DEL", "BLR", "Delhi", "Bengaluru", True),
    ("r3", "BOM-BLR", "BOM", "BLR", "Mumbai", "Bengaluru", True),
    ("r4", "DEL-CCU", "DEL", "CCU", "Delhi", "Kolkata", True),
    ("r5", "BLR-HYD", "BLR", "HYD", "Bengaluru", "Hyderabad", True),
    ("r6", "MAA-DEL", "MAA", "DEL", "Chennai", "Delhi", True),
]

AIRLINES = [
    ("al1", "al1", "IndiGo", "6E", True),
    ("al2", "al2", "Air India", "AI", True),
    ("al3", "al3", "Air India Express", "IX", True),
    ("al4", "al4", "Akasa Air", "QP", True),
    ("al5", "al5", "SpiceJet", "SG", True),
]

DATA_SOURCES = [
    (
        "source-synthetic",
        "synthetic",
        "synthetic",
        "APIx Synthetic Demo",
        "synthetic-airfare-observations",
        "synthetic-source-synthetic",
        "synthetic-v1",
        None,
        None,
        None,
        "2026-09-12",
        True,
    ),
]

DEFAULT_ROUTE_WEIGHTS = {
    "DEL-BOM": 15,
    "DEL-BLR": 12,
    "BOM-BLR": 10,
    "DEL-CCU": 8,
    "BLR-HYD": 7,
    "MAA-DEL": 6,
}

SYNTHETIC_OBSERVATIONS = [
    ("obs-seed-1", "DEL-BOM", "6E101", "2500.00", "3400.00"),
    ("obs-seed-2", "DEL-BLR", "6E102", "2000.00", "2600.00"),
    ("obs-seed-3", "BOM-BLR", "6E103", "3000.00", "3900.00"),
    ("obs-seed-4", "DEL-CCU", "6E104", "2500.00", "3150.00"),
    ("obs-seed-5", "BLR-HYD", "6E105", "2500.00", "2800.00"),
    ("obs-seed-6", "MAA-DEL", "6E106", "3000.00", "4500.00"),
]


def _create_synthetic_index_value(session: Session, data_source: DataSource) -> None:
    reference_period = data_source.reference_period or datetime.now(timezone.utc).date().isoformat()

    eligible_observations = (
        session.execute(
            select(Observation)
            .where(Observation.data_source_id == data_source.id)
            .where(Observation.availability == "available")
            .where(Observation.cleaning_status == "clean")
            .where(Observation.index_eligible.is_(True))
            .where(Observation.reference_period == reference_period)
        )
        .scalars()
        .all()
    )

    if not eligible_observations:
        return

    current_prices: dict[str, float] = {}
    base_prices: dict[str, float] = {}

    for observation in eligible_observations:
        current_prices[observation.route_code] = float(observation.total_fare)
        base_prices[observation.route_code] = float(observation.base_fare)

    weighted_sum = Decimal("0")
    weighted_base = Decimal("0")

    for route_code, weight in DEFAULT_ROUTE_WEIGHTS.items():
        current_price = current_prices.get(route_code)
        base_price = base_prices.get(route_code)

        if current_price is None or base_price is None or base_price <= 0:
            continue

        weighted_sum += Decimal(str(weight)) * Decimal(str(current_price))
        weighted_base += Decimal(str(weight)) * Decimal(str(base_price))

    if weighted_base == 0:
        index_value = Decimal("100.0000")
    else:
        index_value = (weighted_sum / weighted_base) * Decimal("100")

    synthesized_index_id = f"idx-synthetic-{reference_period}"
    existing_index = session.execute(select(IndexValue).where(IndexValue.id == synthesized_index_id)).scalar_one_or_none()

    if existing_index is not None:
        return

    session.add(
        IndexValue(
            id=synthesized_index_id,
            index_date=datetime.strptime(reference_period, "%Y-%m-%d").date(),
            index_value=float(index_value),
            base_period=reference_period,
            aggregation_method="weighted_average (synthetic demo)",
            observation_frequency="daily",
            route_weight_version="synthetic-demo-v1",
        )
    )


def seed_database() -> None:
    engine = create_engine(settings.database_url)

    with Session(engine) as session:
        existing_routes = session.execute(select(Route.route_code)).scalars().all()
        existing_airlines = session.execute(select(Airline.airline_id)).scalars().all()

        if not existing_airlines:
            for row in AIRLINES:
                session.add(
                    Airline(
                        id=row[0],
                        airline_id=row[1],
                        airline_name=row[2],
                        iata_code=row[3],
                        is_active=row[4],
                    )
                )

        if not existing_routes:
            for row in ROUTES:
                session.add(
                    Route(
                        id=row[0],
                        route_code=row[1],
                        origin=row[2],
                        destination=row[3],
                        origin_city=row[4],
                        destination_city=row[5],
                        is_active=row[6],
                    )
                )

        if session.execute(select(DataSource.id)).scalar() is None:
            for row in DATA_SOURCES:
                session.add(
                    DataSource(
                        id=row[0],
                        source=row[1],
                        source_type=row[2],
                        organization=row[3],
                        dataset=row[4],
                        dataset_id=row[5],
                        version=row[6],
                        license=row[7],
                        terms_url=row[8],
                        retrieved_at=datetime.now(timezone.utc) if row[9] is None else row[9],
                        reference_period=row[10],
                        is_active=row[11],
                    )
                )

        data_source = session.execute(select(DataSource).where(DataSource.source == "synthetic")).scalar_one()
        airline = session.execute(select(Airline).where(Airline.airline_id == "al1")).scalar_one()
        existing_observation_ids = set(session.execute(select(Observation.id)).scalars().all())
        for observation_id, route_code, flight, base_fare, total_fare in SYNTHETIC_OBSERVATIONS:
            if observation_id in existing_observation_ids:
                continue
            route = session.execute(select(Route).where(Route.route_code == route_code)).scalar_one()
            session.add(
                Observation(
                    id=observation_id,
                    route_id=route.id,
                    airline_id=airline.airline_id,
                    data_source_id=data_source.id,
                    origin=route.origin,
                    destination=route.destination,
                    route_code=route.route_code,
                    flight=flight,
                    travel_date=date(2026, 9, 19),
                    search_date=date(2026, 9, 12),
                    advance_window=7,
                    fare_class="economy",
                    base_fare=Decimal(base_fare),
                    taxes=Decimal("750.00"),
                    udf=Decimal("100.00"),
                    convenience_fee=Decimal("50.00"),
                    total_fare=Decimal(total_fare),
                    availability="available",
                    source=data_source.source,
                    source_type=data_source.source_type,
                    collection_timestamp=datetime(2026, 9, 12, tzinfo=timezone.utc),
                    cleaning_status="clean",
                    index_eligible=True,
                    organization=data_source.organization,
                    dataset=data_source.dataset,
                    dataset_id=data_source.dataset_id,
                    version=data_source.version,
                    license=data_source.license,
                    terms_url=data_source.terms_url,
                    reference_period=data_source.reference_period,
                    retrieved_at=data_source.retrieved_at,
                )
            )

        data_source = session.execute(select(DataSource).where(DataSource.source == "synthetic")).scalar_one_or_none()
        if data_source is not None:
            _create_synthetic_index_value(session, data_source)

        if session.execute(select(MethodologyConfig.id)).scalar() is None:
            session.add(
                MethodologyConfig(
                    id="methodology-default",
                    methodology_version="apix-v1.0",
                    base_period="2026-09-12",
                    aggregation_method="weighted_average",
                    observation_frequency="daily",
                    fare_metric="total_fare",
                    outlier_method="iqr",
                    route_weight_version="synthetic-demo-v1",
                    route_weights={
                        "DEL-BOM": 15,
                        "DEL-BLR": 12,
                        "BOM-BLR": 10,
                        "DEL-CCU": 8,
                        "BLR-HYD": 7,
                        "MAA-DEL": 6,
                    },
                    is_active=True,
                )
            )

        session.commit()


if __name__ == "__main__":
    seed_database()
