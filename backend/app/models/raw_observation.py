from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, JSON, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RawObservation(Base):
    __tablename__ = "raw_observations"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    source_id: Mapped[str] = mapped_column(String(64), ForeignKey("data_sources.id"), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    source_name: Mapped[str] = mapped_column(String(128), nullable=False)
    collection_job_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("collection_jobs.id"), nullable=True, index=True)
    collection_run_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("collection_runs.id"), nullable=True, index=True)
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    collection_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    request_parameters: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    raw_payload: Mapped[object] = mapped_column(JSON, nullable=False)
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    parser_version: Mapped[str] = mapped_column(String(64), nullable=False)
    route_code: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    origin: Mapped[str] = mapped_column(String(16), nullable=False)
    destination: Mapped[str] = mapped_column(String(16), nullable=False)
    travel_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    search_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    advance_window: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    airline: Mapped[str | None] = mapped_column(String(128), nullable=True)
    flight_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    fare_class: Mapped[str | None] = mapped_column(String(32), nullable=True)
    base_fare: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    taxes: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    udf: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    convenience_fee: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    total_fare: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(8), nullable=True)
    availability: Mapped[str | None] = mapped_column(String(32), nullable=True)
    source_status: Mapped[str] = mapped_column(String(32), nullable=False, default="received")
    raw_status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    normalized_observation_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
