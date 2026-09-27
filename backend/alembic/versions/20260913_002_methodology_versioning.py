"""Add methodology versioning and index provenance

Revision ID: 20260913_002
Revises: 20260913_001
"""
from alembic import op
import sqlalchemy as sa

revision = "20260913_002"
down_revision = "20260913_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("methodology_configs", sa.Column("methodology_version", sa.String(64), nullable=True))
    op.add_column("methodology_configs", sa.Column("fare_metric", sa.String(32), nullable=True))
    op.add_column("methodology_configs", sa.Column("outlier_method", sa.String(32), nullable=True))
    op.add_column("methodology_configs", sa.Column("is_active", sa.Boolean(), nullable=True))
    op.execute("UPDATE methodology_configs SET methodology_version = 'apix-v1.0', fare_metric = 'total_fare', outlier_method = 'iqr', is_active = TRUE WHERE methodology_version IS NULL")
    op.alter_column("methodology_configs", "methodology_version", nullable=False)
    op.alter_column("methodology_configs", "fare_metric", nullable=False)
    op.alter_column("methodology_configs", "outlier_method", nullable=False)
    op.alter_column("methodology_configs", "is_active", nullable=False)
    op.add_column("index_values", sa.Column("methodology_config_id", sa.String(64), nullable=True))
    op.add_column("index_values", sa.Column("methodology_version", sa.String(64), nullable=True))
    op.add_column("index_values", sa.Column("fare_metric", sa.String(32), nullable=True))
    op.add_column("index_values", sa.Column("outlier_method", sa.String(32), nullable=True))


def downgrade() -> None:
    op.drop_column("index_values", "outlier_method")
    op.drop_column("index_values", "fare_metric")
    op.drop_column("index_values", "methodology_version")
    op.drop_column("index_values", "methodology_config_id")
    op.drop_column("methodology_configs", "is_active")
    op.drop_column("methodology_configs", "outlier_method")
    op.drop_column("methodology_configs", "fare_metric")
    op.drop_column("methodology_configs", "methodology_version")