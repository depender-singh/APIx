"""Add generic official indicator storage

Revision ID: 20260913_004
Revises: 20260913_003
"""
from alembic import op
import sqlalchemy as sa

revision = "20260913_004"
down_revision = "20260913_003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "official_indicators",
        sa.Column("id", sa.String(128), nullable=False),
        sa.Column("source_type", sa.String(32), nullable=False),
        sa.Column("organization", sa.String(160), nullable=False),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("dataset_name", sa.String(160), nullable=False),
        sa.Column("dataset_id", sa.String(128), nullable=True),
        sa.Column("dataset_version", sa.String(64), nullable=True),
        sa.Column("indicator_code", sa.String(128), nullable=False),
        sa.Column("indicator_name", sa.String(160), nullable=False),
        sa.Column("category", sa.String(64), nullable=True),
        sa.Column("geography", sa.String(128), nullable=True),
        sa.Column("unit", sa.String(64), nullable=False),
        sa.Column("observation_date", sa.Date(), nullable=False),
        sa.Column("value", sa.Numeric(16, 6), nullable=False),
        sa.Column("base_period", sa.String(64), nullable=True),
        sa.Column("frequency", sa.String(32), nullable=False),
        sa.Column("reference_period", sa.String(64), nullable=True),
        sa.Column("source_url", sa.String(512), nullable=True),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("methodology_version", sa.String(64), nullable=True),
        sa.Column("provenance", sa.JSON(), nullable=False),
        sa.Column("is_official", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_official_indicators_source_type", "official_indicators", ["source_type"])
    op.create_index("ix_official_indicators_indicator_code", "official_indicators", ["indicator_code"])
    op.create_index("ix_official_indicators_observation_date", "official_indicators", ["observation_date"])


def downgrade() -> None:
    op.drop_index("ix_official_indicators_observation_date", table_name="official_indicators")
    op.drop_index("ix_official_indicators_indicator_code", table_name="official_indicators")
    op.drop_index("ix_official_indicators_source_type", table_name="official_indicators")
    op.drop_table("official_indicators")