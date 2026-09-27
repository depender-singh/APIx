from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.data_source import DataSource


class Observation(Base):
    __tablename__ = "observations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    route_id: Mapped[str] = mapped_column(String(64), ForeignKey("routes.id"), nullable=False, index=True)
    airline_id: Mapped[str] = mapped_column(String(64), ForeignKey("airlines.airline_id"), nullable=False, index=True)
    data_source_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("data_sources.id"), nullable=True, index=True)

    origin: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    destination: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    route_code: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    flight: Mapped[str | None] = mapped_column(String(64), nullable=True)
    travel_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    search_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    advance_window: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    fare_class: Mapped[str | None] = mapped_column(String(32), nullable=True)

    base_fare: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    taxes: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    udf: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    convenience_fee: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    total_fare: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    fare_completeness: Mapped[str] = mapped_column(String(32), nullable=False, default="complete")

    availability: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    source_type: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    currency: Mapped[str | None] = mapped_column(String(8), nullable=True)

    collection_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    cleaning_status: Mapped[str] = mapped_column(String(32), nullable=False, default="raw", index=True)
    index_eligible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)

    organization: Mapped[str | None] = mapped_column(String(128), nullable=True)
    dataset: Mapped[str | None] = mapped_column(String(128), nullable=True)
    dataset_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    license: Mapped[str | None] = mapped_column(String(128), nullable=True)
    terms_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reference_period: Mapped[str | None] = mapped_column(String(32), nullable=True)
    retrieved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    route: Mapped["Route"] = relationship(back_populates="observations")
    airline: Mapped["Airline"] = relationship(back_populates="observations")
    data_source: Mapped["DataSource | None"] = relationship(back_populates="observations")
