from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, JSON, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.models.airline import Airline

from app.core.database import Base


class Benchmark(Base):
    __tablename__ = "benchmarks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    benchmark_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    route_code: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    airline_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("airlines.airline_id"), nullable=True)
    benchmark_value: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
    benchmark_metric: Mapped[str] = mapped_column(String(64), nullable=False, default="average_purchase_fare")
    benchmark_scope: Mapped[str] = mapped_column(String(32), nullable=False, default="route_level_airfare")
    currency: Mapped[str | None] = mapped_column(String(8), nullable=True)
    period_type: Mapped[str] = mapped_column(String(16), nullable=False, default="monthly")
    passenger_count: Mapped[int | None] = mapped_column(nullable=True)
    source: Mapped[str | None] = mapped_column(String(128), nullable=True)
    source_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    dataset: Mapped[str | None] = mapped_column(String(128), nullable=True)
    dataset_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    reference_period: Mapped[str | None] = mapped_column(String(32), nullable=True)
    source_document: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    dataset_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    retrieved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    license: Mapped[str | None] = mapped_column(String(255), nullable=True)
    provenance: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    airline: Mapped["Airline | None"] = relationship(back_populates="benchmarks")
