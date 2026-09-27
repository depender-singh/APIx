"""Preserve currency on normalized observations.

Revision ID: 20260921_001
Revises: 20260914_004
"""
from alembic import op
import sqlalchemy as sa


revision = "20260921_001"
down_revision = "20260914_004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("observations", sa.Column("currency", sa.String(length=8), nullable=True))


def downgrade() -> None:
    op.drop_column("observations", "currency")