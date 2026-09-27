from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Integer, JSON, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class OfficialIndicator(Base):
    __tablename__ = "official_indicators"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    organization: Mapped[str] = mapped_column(String(160), nullable=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    dataset_name: Mapped[str] = mapped_column(String(160), nullable=False)
    dataset_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    dataset_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    indicator_code: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    indicator_name: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    geography: Mapped[str | None] = mapped_column(String(128), nullable=True)
    unit: Mapped[str] = mapped_column(String(64), nullable=False)
    observation_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    value: Mapped[float] = mapped_column(Numeric(16, 6), nullable=False)
    base_period: Mapped[str | None] = mapped_column(String(64), nullable=True)
    frequency: Mapped[str] = mapped_column(String(32), nullable=False)
    reference_period: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    retrieved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    methodology_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    provenance: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)
    is_official: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    base_year: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    series: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    state: Mapped[str | None] = mapped_column(String(128), nullable=True)
    sector: Mapped[str | None] = mapped_column(String(64), nullable=True)
    division: Mapped[str | None] = mapped_column(String(160), nullable=True)
    group: Mapped[str | None] = mapped_column(String(160), nullable=True)
    class_name: Mapped[str | None] = mapped_column("class", String(160), nullable=True)
    sub_class: Mapped[str | None] = mapped_column(String(160), nullable=True)
    item: Mapped[str | None] = mapped_column(String(160), nullable=True)
    code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    index_value: Mapped[float | None] = mapped_column(Numeric(16, 6), nullable=True)
    inflation_value: Mapped[float | None] = mapped_column(Numeric(16, 6), nullable=True)
    imputation: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
