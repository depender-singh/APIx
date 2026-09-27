"""Add benchmark provenance and persisted back-testing results

Revision ID: 20260913_003
Revises: 20260913_002
"""
from alembic import op
import sqlalchemy as sa

revision = "20260913_003"
down_revision = "20260913_002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("benchmarks", sa.Column("benchmark_metric", sa.String(64), nullable=True))
    op.add_column("benchmarks", sa.Column("currency", sa.String(8), nullable=True))
    op.add_column("benchmarks", sa.Column("period_type", sa.String(16), nullable=True))
    op.add_column("benchmarks", sa.Column("passenger_count", sa.Integer(), nullable=True))
    op.add_column("benchmarks", sa.Column("source_document", sa.String(255), nullable=True))
    op.add_column("benchmarks", sa.Column("source_url", sa.String(512), nullable=True))
    op.add_column("benchmarks", sa.Column("dataset_version", sa.String(64), nullable=True))
    op.add_column("benchmarks", sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("benchmarks", sa.Column("license", sa.String(255), nullable=True))
    op.add_column("benchmarks", sa.Column("provenance", sa.JSON(), nullable=True))
    op.add_column("benchmarks", sa.Column("notes", sa.String(512), nullable=True))
    op.execute("UPDATE benchmarks SET benchmark_metric = 'average_purchase_fare', period_type = 'monthly', currency = 'INR' WHERE benchmark_metric IS NULL")
    op.alter_column("benchmarks", "benchmark_metric", nullable=False)
    op.alter_column("benchmarks", "period_type", nullable=False)
    op.create_table(
        "backtest_results",
        sa.Column("id", sa.String(128), nullable=False),
        sa.Column("benchmark_source", sa.String(128), nullable=False),
        sa.Column("benchmark_dataset", sa.String(128), nullable=True),
        sa.Column("benchmark_version", sa.String(64), nullable=True),
        sa.Column("methodology_version", sa.String(64), nullable=True),
        sa.Column("route_scope", sa.String(64), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("frequency", sa.String(16), nullable=False),
        sa.Column("observation_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("correlation", sa.Numeric(12, 6), nullable=True),
        sa.Column("mae", sa.Numeric(12, 6), nullable=True),
        sa.Column("rmse", sa.Numeric(12, 6), nullable=True),
        sa.Column("directional_accuracy", sa.Numeric(12, 6), nullable=True),
        sa.Column("bias", sa.Numeric(12, 6), nullable=True),
        sa.Column("mape", sa.Numeric(12, 6), nullable=True),
        sa.Column("stability", sa.Numeric(12, 6), nullable=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("series", sa.JSON(), nullable=False),
        sa.Column("route_results", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("backtest_results")
    for column in ("notes", "provenance", "license", "retrieved_at", "dataset_version", "source_url", "source_document", "passenger_count", "period_type", "currency", "benchmark_metric"):
        op.drop_column("benchmarks", column)
