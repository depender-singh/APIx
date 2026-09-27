from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, JSON, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class BacktestResult(Base):
    __tablename__ = "backtest_results"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    benchmark_source: Mapped[str] = mapped_column(String(128), nullable=False)
    benchmark_dataset: Mapped[str | None] = mapped_column(String(128), nullable=True)
    benchmark_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    methodology_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    route_scope: Mapped[str | None] = mapped_column(String(64), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    frequency: Mapped[str] = mapped_column(String(16), nullable=False)
    observation_count: Mapped[int] = mapped_column(nullable=False, default=0)
    correlation: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    mae: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    rmse: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    directional_accuracy: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    bias: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    mape: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    stability: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    series: Mapped[list[dict[str, object]]] = mapped_column(JSON, nullable=False, default=list)
    route_results: Mapped[list[dict[str, object]]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
