from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class IndexValue(Base):
    __tablename__ = "index_values"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    index_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    index_value: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
    methodology_config_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    methodology_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    base_period: Mapped[str | None] = mapped_column(String(64), nullable=True)
    aggregation_method: Mapped[str | None] = mapped_column(String(64), nullable=True)
    observation_frequency: Mapped[str | None] = mapped_column(String(32), nullable=True)
    fare_metric: Mapped[str | None] = mapped_column(String(32), nullable=True)
    outlier_method: Mapped[str | None] = mapped_column(String(32), nullable=True)
    route_weight_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
