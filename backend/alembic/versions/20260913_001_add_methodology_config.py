"""Add methodology configuration table

Revision ID: 20260913_001
Revises: 20260912_001
Create Date: 2026-09-13 00:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260913_001"
down_revision = "20260912_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "methodology_configs",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("base_period", sa.String(length=32), nullable=False),
        sa.Column("aggregation_method", sa.String(length=32), nullable=False),
        sa.Column("observation_frequency", sa.String(length=32), nullable=False),
        sa.Column("route_weight_version", sa.String(length=64), nullable=False),
        sa.Column("route_weights", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("methodology_configs")
