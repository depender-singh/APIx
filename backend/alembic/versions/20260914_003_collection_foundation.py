"""Add Phase 9A collection foundation

Revision ID: 20260914_003
Revises: 20260914_001
"""
from alembic import op
import sqlalchemy as sa


revision = "20260914_003"
down_revision = "20260914_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "collection_jobs",
        sa.Column("id", sa.String(64), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("source_id", sa.String(64), nullable=False),
        sa.Column("route_code", sa.String(64), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("schedule", sa.String(128), nullable=True),
        sa.Column("advance_windows", sa.JSON(), nullable=False),
        sa.Column("configuration", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["source_id"], ["data_sources.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_collection_jobs_source_id", "collection_jobs", ["source_id"])
    op.create_index("ix_collection_jobs_route_code", "collection_jobs", ["route_code"])
    op.create_index("ix_collection_jobs_enabled", "collection_jobs", ["enabled"])

    op.create_table(
        "collection_runs",
        sa.Column("id", sa.String(64), nullable=False),
        sa.Column("collection_job_id", sa.String(64), nullable=False),
        sa.Column("source_id", sa.String(64), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("failure_category", sa.String(32), nullable=True),
        sa.Column("requested_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("fetched_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("accepted_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rejected_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duplicate_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["collection_job_id"], ["collection_jobs.id"]),
        sa.ForeignKeyConstraint(["source_id"], ["data_sources.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_collection_runs_collection_job_id", "collection_runs", ["collection_job_id"])
    op.create_index("ix_collection_runs_source_id", "collection_runs", ["source_id"])
    op.create_index("ix_collection_runs_status", "collection_runs", ["status"])

    op.create_table(
        "raw_observations",
        sa.Column("id", sa.String(128), nullable=False),
        sa.Column("source_id", sa.String(64), nullable=False),
        sa.Column("source_type", sa.String(32), nullable=False),
        sa.Column("source_name", sa.String(128), nullable=False),
        sa.Column("collection_job_id", sa.String(64), nullable=True),
        sa.Column("collection_run_id", sa.String(64), nullable=True),
        sa.Column("source_url", sa.String(512), nullable=True),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("collection_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("request_parameters", sa.JSON(), nullable=False),
        sa.Column("raw_payload", sa.JSON(), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("parser_version", sa.String(64), nullable=False),
        sa.Column("route_code", sa.String(64), nullable=False),
        sa.Column("origin", sa.String(16), nullable=False),
        sa.Column("destination", sa.String(16), nullable=False),
        sa.Column("travel_date", sa.Date(), nullable=False),
        sa.Column("search_date", sa.Date(), nullable=False),
        sa.Column("advance_window", sa.Integer(), nullable=False),
        sa.Column("airline", sa.String(128), nullable=True),
        sa.Column("flight_number", sa.String(64), nullable=True),
        sa.Column("fare_class", sa.String(32), nullable=True),
        sa.Column("base_fare", sa.Numeric(12, 2), nullable=True),
        sa.Column("taxes", sa.Numeric(12, 2), nullable=True),
        sa.Column("udf", sa.Numeric(12, 2), nullable=True),
        sa.Column("convenience_fee", sa.Numeric(12, 2), nullable=True),
        sa.Column("total_fare", sa.Numeric(12, 2), nullable=True),
        sa.Column("currency", sa.String(8), nullable=True),
        sa.Column("availability", sa.String(32), nullable=True),
        sa.Column("source_status", sa.String(32), nullable=False, server_default="received"),
        sa.Column("raw_status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("normalized_observation_id", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["source_id"], ["data_sources.id"]),
        sa.ForeignKeyConstraint(["collection_job_id"], ["collection_jobs.id"]),
        sa.ForeignKeyConstraint(["collection_run_id"], ["collection_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for name, column in (
        ("source_id", "source_id"), ("source_type", "source_type"), ("collection_job_id", "collection_job_id"),
        ("collection_run_id", "collection_run_id"), ("retrieved_at", "retrieved_at"), ("payload_hash", "payload_hash"),
        ("route_code", "route_code"), ("travel_date", "travel_date"), ("search_date", "search_date"),
        ("advance_window", "advance_window"), ("normalized_observation_id", "normalized_observation_id"),
    ):
        op.create_index(f"ix_raw_observations_{name}", "raw_observations", [column])


def downgrade() -> None:
    for name in ("normalized_observation_id", "advance_window", "search_date", "travel_date", "route_code", "payload_hash", "retrieved_at", "collection_run_id", "collection_job_id", "source_type", "source_id"):
        op.drop_index(f"ix_raw_observations_{name}", table_name="raw_observations")
    op.drop_table("raw_observations")
    op.drop_index("ix_collection_runs_status", table_name="collection_runs")
    op.drop_index("ix_collection_runs_source_id", table_name="collection_runs")
    op.drop_index("ix_collection_runs_collection_job_id", table_name="collection_runs")
    op.drop_table("collection_runs")
    op.drop_index("ix_collection_jobs_enabled", table_name="collection_jobs")
    op.drop_index("ix_collection_jobs_route_code", table_name="collection_jobs")
    op.drop_index("ix_collection_jobs_source_id", table_name="collection_jobs")
    op.drop_table("collection_jobs")