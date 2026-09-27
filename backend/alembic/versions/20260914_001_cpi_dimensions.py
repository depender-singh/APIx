"""Add verified MoSPI CPI dimensions and separate values

Revision ID: 20260914_001
Revises: 20260913_005
"""
from alembic import op
import sqlalchemy as sa


revision = "20260914_001"
down_revision = "20260913_005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    columns = (
        sa.Column("base_year", sa.Integer(), nullable=True),
        sa.Column("series", sa.String(32), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("month", sa.Integer(), nullable=True),
        sa.Column("state", sa.String(128), nullable=True),
        sa.Column("sector", sa.String(64), nullable=True),
        sa.Column("division", sa.String(160), nullable=True),
        sa.Column("group", sa.String(160), nullable=True),
        sa.Column("class", sa.String(160), nullable=True),
        sa.Column("sub_class", sa.String(160), nullable=True),
        sa.Column("item", sa.String(160), nullable=True),
        sa.Column("code", sa.String(64), nullable=True),
        sa.Column("index_value", sa.Numeric(16, 6), nullable=True),
        sa.Column("inflation_value", sa.Numeric(16, 6), nullable=True),
        sa.Column("imputation", sa.String(64), nullable=True),
    )
    for column in columns:
        op.add_column("official_indicators", column)
    op.create_index("ix_official_indicators_base_year", "official_indicators", ["base_year"])
    op.create_index("ix_official_indicators_series", "official_indicators", ["series"])


def downgrade() -> None:
    op.drop_index("ix_official_indicators_series", table_name="official_indicators")
    op.drop_index("ix_official_indicators_base_year", table_name="official_indicators")
    for column in ("imputation", "inflation_value", "index_value", "code", "item", "sub_class", "class", "group", "division", "sector", "state", "month", "year", "series", "base_year"):
        op.drop_column("official_indicators", column)