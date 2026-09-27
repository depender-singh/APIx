from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DataQualityReport(Base):
    __tablename__ = "data_quality_reports"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    report_date: Mapped[str] = mapped_column(String(32), nullable=False)
    total_observations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    valid_observations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    invalid_observations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duplicate_observations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    missing_field_observations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sold_out_observations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cancelled_observations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    outlier_observations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    available_observations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    index_eligible_observations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completeness_rate: Mapped[float | None] = mapped_column(nullable=True)
    validity_rate: Mapped[float | None] = mapped_column(nullable=True)
    duplicate_rate: Mapped[float | None] = mapped_column(nullable=True)
    availability_rate: Mapped[float | None] = mapped_column(nullable=True)
    outlier_rate: Mapped[float | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
