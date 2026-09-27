"""Initial APIx schema

Revision ID: 20260912_001
Revises: 
Create Date: 2026-09-12 00:00:00.000000

"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260912_001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "airlines",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("airline_id", sa.String(length=64), nullable=False),
        sa.Column("airline_name", sa.String(length=128), nullable=False),
        sa.Column("iata_code", sa.String(length=16), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("airline_id"),
    )
    op.create_index(op.f("ix_airlines_airline_id"), "airlines", ["airline_id"], unique=False)

    op.create_table(
        "data_sources",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("organization", sa.String(length=128), nullable=True),
        sa.Column("dataset", sa.String(length=128), nullable=True),
        sa.Column("dataset_id", sa.String(length=128), nullable=True),
        sa.Column("version", sa.String(length=64), nullable=True),
        sa.Column("license", sa.String(length=128), nullable=True),
        sa.Column("terms_url", sa.String(length=255), nullable=True),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reference_period", sa.String(length=32), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source"),
    )
    op.create_index(op.f("ix_data_sources_source"), "data_sources", ["source"], unique=False)

    op.create_table(
        "routes",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("route_code", sa.String(length=64), nullable=False),
        sa.Column("origin", sa.String(length=16), nullable=False),
        sa.Column("destination", sa.String(length=16), nullable=False),
        sa.Column("origin_city", sa.String(length=128), nullable=True),
        sa.Column("destination_city", sa.String(length=128), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("route_code"),
    )
    op.create_index(op.f("ix_routes_route_code"), "routes", ["route_code"], unique=False)

    op.create_table(
        "observations",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("route_id", sa.String(length=64), nullable=False),
        sa.Column("airline_id", sa.String(length=64), nullable=False),
        sa.Column("data_source_id", sa.String(length=64), nullable=True),
        sa.Column("origin", sa.String(length=16), nullable=False),
        sa.Column("destination", sa.String(length=16), nullable=False),
        sa.Column("route_code", sa.String(length=64), nullable=False),
        sa.Column("flight", sa.String(length=64), nullable=True),
        sa.Column("travel_date", sa.Date(), nullable=False),
        sa.Column("search_date", sa.Date(), nullable=False),
        sa.Column("advance_window", sa.Integer(), nullable=False),
        sa.Column("fare_class", sa.String(length=32), nullable=False),
        sa.Column("base_fare", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("taxes", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("udf", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("convenience_fee", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("total_fare", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("availability", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=True),
        sa.Column("collection_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cleaning_status", sa.String(length=32), nullable=False, server_default="raw"),
        sa.Column("index_eligible", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("organization", sa.String(length=128), nullable=True),
        sa.Column("dataset", sa.String(length=128), nullable=True),
        sa.Column("dataset_id", sa.String(length=128), nullable=True),
        sa.Column("version", sa.String(length=64), nullable=True),
        sa.Column("license", sa.String(length=128), nullable=True),
        sa.Column("terms_url", sa.String(length=255), nullable=True),
        sa.Column("reference_period", sa.String(length=32), nullable=True),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["route_id"], ["routes.id"], ),
        sa.ForeignKeyConstraint(["airline_id"], ["airlines.airline_id"], ),
        sa.ForeignKeyConstraint(["data_source_id"], ["data_sources.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_observations_route_id"), "observations", ["route_id"], unique=False)
    op.create_index(op.f("ix_observations_airline_id"), "observations", ["airline_id"], unique=False)
    op.create_index(op.f("ix_observations_data_source_id"), "observations", ["data_source_id"], unique=False)
    op.create_index(op.f("ix_observations_origin"), "observations", ["origin"], unique=False)
    op.create_index(op.f("ix_observations_destination"), "observations", ["destination"], unique=False)
    op.create_index(op.f("ix_observations_route_code"), "observations", ["route_code"], unique=False)
    op.create_index(op.f("ix_observations_travel_date"), "observations", ["travel_date"], unique=False)
    op.create_index(op.f("ix_observations_search_date"), "observations", ["search_date"], unique=False)
    op.create_index(op.f("ix_observations_advance_window"), "observations", ["advance_window"], unique=False)
    op.create_index(op.f("ix_observations_availability"), "observations", ["availability"], unique=False)
    op.create_index(op.f("ix_observations_source"), "observations", ["source"], unique=False)
    op.create_index(op.f("ix_observations_source_type"), "observations", ["source_type"], unique=False)
    op.create_index(op.f("ix_observations_collection_timestamp"), "observations", ["collection_timestamp"], unique=False)
    op.create_index(op.f("ix_observations_cleaning_status"), "observations", ["cleaning_status"], unique=False)
    op.create_index(op.f("ix_observations_index_eligible"), "observations", ["index_eligible"], unique=False)

    op.create_table(
        "index_values",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("index_date", sa.Date(), nullable=False),
        sa.Column("index_value", sa.Numeric(precision=10, scale=4), nullable=False),
        sa.Column("base_period", sa.String(length=64), nullable=True),
        sa.Column("aggregation_method", sa.String(length=64), nullable=True),
        sa.Column("observation_frequency", sa.String(length=32), nullable=True),
        sa.Column("route_weight_version", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_index_values_index_date"), "index_values", ["index_date"], unique=False)

    op.create_table(
        "benchmarks",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("benchmark_date", sa.Date(), nullable=False),
        sa.Column("route_code", sa.String(length=64), nullable=False),
        sa.Column("airline_id", sa.String(length=64), nullable=True),
        sa.Column("benchmark_value", sa.Numeric(precision=10, scale=4), nullable=False),
        sa.Column("source", sa.String(length=128), nullable=True),
        sa.Column("source_type", sa.String(length=32), nullable=True),
        sa.Column("dataset", sa.String(length=128), nullable=True),
        sa.Column("dataset_id", sa.String(length=128), nullable=True),
        sa.Column("reference_period", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["airline_id"], ["airlines.airline_id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_benchmarks_benchmark_date"), "benchmarks", ["benchmark_date"], unique=False)
    op.create_index(op.f("ix_benchmarks_route_code"), "benchmarks", ["route_code"], unique=False)

    op.create_table(
        "data_quality_reports",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("report_date", sa.String(length=32), nullable=False),
        sa.Column("total_observations", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("valid_observations", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("invalid_observations", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("duplicate_observations", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("missing_field_observations", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("sold_out_observations", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("cancelled_observations", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("outlier_observations", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("available_observations", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("index_eligible_observations", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("completeness_rate", sa.Float(), nullable=True),
        sa.Column("validity_rate", sa.Float(), nullable=True),
        sa.Column("duplicate_rate", sa.Float(), nullable=True),
        sa.Column("availability_rate", sa.Float(), nullable=True),
        sa.Column("outlier_rate", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("data_quality_reports")
    op.drop_table("benchmarks")
    op.drop_table("index_values")
    op.drop_table("observations")
    op.drop_table("routes")
    op.drop_table("data_sources")
    op.drop_table("airlines")
