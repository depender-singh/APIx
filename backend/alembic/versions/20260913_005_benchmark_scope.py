"""Add explicit DGCA benchmark scope classification

Revision ID: 20260913_005
Revises: 20260913_004
"""
from alembic import op
import sqlalchemy as sa

revision = "20260913_005"
down_revision = "20260913_004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("benchmarks", sa.Column("benchmark_scope", sa.String(32), nullable=True))
    op.execute("UPDATE benchmarks SET benchmark_scope = 'route_level_airfare' WHERE benchmark_scope IS NULL")
    op.alter_column("benchmarks", "benchmark_scope", nullable=False)


def downgrade() -> None:
    op.drop_column("benchmarks", "benchmark_scope")