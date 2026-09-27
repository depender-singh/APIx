from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MethodologyConfig(Base):
    __tablename__ = "methodology_configs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    methodology_version: Mapped[str] = mapped_column(String(64), nullable=False)
    base_period: Mapped[str] = mapped_column(String(32), nullable=False)
    aggregation_method: Mapped[str] = mapped_column(String(32), nullable=False)
    observation_frequency: Mapped[str] = mapped_column(String(32), nullable=False)
    fare_metric: Mapped[str] = mapped_column(String(32), nullable=False, default="total_fare")
    outlier_method: Mapped[str] = mapped_column(String(32), nullable=False, default="iqr")
    route_weight_version: Mapped[str] = mapped_column(String(64), nullable=False)
    route_weights: Mapped[dict[str, float]] = mapped_column(JSON, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
