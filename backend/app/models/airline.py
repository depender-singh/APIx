from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.benchmark import Benchmark
    from app.models.observation import Observation


class Airline(Base):
    __tablename__ = "airlines"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    airline_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    airline_name: Mapped[str] = mapped_column(String(128), nullable=False)
    iata_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    observations: Mapped[list[Observation]] = relationship(back_populates="airline")
    benchmarks: Mapped[list[Benchmark]] = relationship(back_populates="airline")
