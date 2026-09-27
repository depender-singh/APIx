"""Allow legitimate total-only fare observations.

Revision ID: 20260914_004
Revises: 20260914_003
"""
from alembic import op
import sqlalchemy as sa


revision = "20260914_004"
down_revision = "20260914_003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("observations", "fare_class", existing_type=sa.String(length=32), nullable=True)
    op.alter_column("observations", "base_fare", existing_type=sa.Numeric(precision=12, scale=2), nullable=True)
    op.alter_column("observations", "taxes", existing_type=sa.Numeric(precision=12, scale=2), nullable=True)
    op.alter_column("observations", "udf", existing_type=sa.Numeric(precision=12, scale=2), nullable=True)
    op.alter_column("observations", "convenience_fee", existing_type=sa.Numeric(precision=12, scale=2), nullable=True)
    op.add_column("observations", sa.Column("fare_completeness", sa.String(length=32), nullable=True, server_default="complete"))
    op.execute("UPDATE observations SET fare_completeness = 'complete' WHERE fare_completeness IS NULL")
    op.alter_column("observations", "fare_completeness", nullable=False, server_default=None)


def downgrade() -> None:
    op.drop_column("observations", "fare_completeness")
    op.alter_column("observations", "convenience_fee", existing_type=sa.Numeric(precision=12, scale=2), nullable=False)
    op.alter_column("observations", "udf", existing_type=sa.Numeric(precision=12, scale=2), nullable=False)
    op.alter_column("observations", "taxes", existing_type=sa.Numeric(precision=12, scale=2), nullable=False)
    op.alter_column("observations", "base_fare", existing_type=sa.Numeric(precision=12, scale=2), nullable=False)
    op.alter_column("observations", "fare_class", existing_type=sa.String(length=32), nullable=False)