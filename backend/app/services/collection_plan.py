from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import date, timedelta


REPRESENTATIVE_ROUTES: tuple[tuple[str, str, str], ...] = (
    ("DEL-BOM", "DEL", "BOM"),
    ("DEL-BLR", "DEL", "BLR"),
    ("BOM-BLR", "BOM", "BLR"),
    ("DEL-CCU", "DEL", "CCU"),
    ("BLR-HYD", "BLR", "HYD"),
    ("MAA-DEL", "MAA", "DEL"),
)
REPRESENTATIVE_WINDOWS: tuple[int, ...] = (1, 7, 15, 30, 45)


@dataclass(frozen=True)
class CollectionContext:
    context_id: str
    route_code: str
    origin: str
    destination: str
    search_date: date
    travel_date: date
    advance_window: int
    source_id: str
    source_name: str
    source_type: str
    request_parameters: dict[str, object]

    def as_dict(self) -> dict[str, object]:
        return {
            "context_id": self.context_id,
            "route_code": self.route_code,
            "origin": self.origin,
            "destination": self.destination,
            "search_date": self.search_date.isoformat(),
            "travel_date": self.travel_date.isoformat(),
            "advance_window": self.advance_window,
            "source_id": self.source_id,
            "source_name": self.source_name,
            "source_type": self.source_type,
            "request_parameters": self.request_parameters,
        }


@dataclass(frozen=True)
class CollectionPlan:
    job_id: str
    name: str
    search_date: date
    source_id: str
    source_name: str
    source_type: str
    contexts: tuple[CollectionContext, ...]

    def as_configuration(self) -> dict[str, object]:
        return {
            "plan_type": "phase-9c-controlled-multi-context",
            "search_date": self.search_date.isoformat(),
            "source_id": self.source_id,
            "source_name": self.source_name,
            "source_type": self.source_type,
            "context_count": len(self.contexts),
            "contexts": [context.as_dict() for context in self.contexts],
        }


def _stable_id(prefix: str, value: object, length: int = 16) -> str:
    digest = hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return f"{prefix}-{digest[:length]}"


def build_collection_plan(
    *,
    search_date: date,
    source_id: str,
    source_name: str = "FlightAPI",
    source_type: str = "licensed_flight_provider",
    currency: str = "INR",
    cabin_class: str = "Economy",
    adults: int = 1,
    children: int = 0,
    infants: int = 0,
    region: str = "IN",
) -> CollectionPlan:
    request_shape = {
        "currency": currency,
        "cabin_class": cabin_class,
        "number_of_adults": adults,
        "number_of_children": children,
        "number_of_infants": infants,
        "region": region,
    }
    identity = {
        "search_date": search_date.isoformat(),
        "source_id": source_id,
        "source_name": source_name,
        "source_type": source_type,
        "request_shape": request_shape,
    }
    job_id = _stable_id("job-9c", identity, 20)
    contexts: list[CollectionContext] = []
    for route_code, origin, destination in REPRESENTATIVE_ROUTES:
        for advance_window in REPRESENTATIVE_WINDOWS:
            travel_date = search_date + timedelta(days=advance_window)
            context_identity = {**identity, "route_code": route_code, "advance_window": advance_window}
            context_id = _stable_id("ctx-9c", context_identity, 20)
            contexts.append(CollectionContext(
                context_id=context_id,
                route_code=route_code,
                origin=origin,
                destination=destination,
                search_date=search_date,
                travel_date=travel_date,
                advance_window=advance_window,
                source_id=source_id,
                source_name=source_name,
                source_type=source_type,
                request_parameters={**request_shape, "context_id": context_id},
            ))
    return CollectionPlan(
        job_id=job_id,
        name=f"Phase 9C controlled {source_name} collection {search_date.isoformat()}",
        search_date=search_date,
        source_id=source_id,
        source_name=source_name,
        source_type=source_type,
        contexts=tuple(contexts),
    )


def build_dry_run_report(plan: CollectionPlan) -> dict[str, object]:
    return {
        "job_id": plan.job_id,
        "total_contexts": len(plan.contexts),
        "provider_requests": [
            {
                "request_number": number,
                "context_id": context.context_id,
                "route_code": context.route_code,
                "search_date": context.search_date.isoformat(),
                "travel_date": context.travel_date.isoformat(),
                "advance_window": context.advance_window,
                "source": context.source_name,
                "currency": context.request_parameters["currency"],
                "cabin": context.request_parameters["cabin_class"],
                "expected_provider_call_count": 1,
            }
            for number, context in enumerate(plan.contexts, start=1)
        ],
    }