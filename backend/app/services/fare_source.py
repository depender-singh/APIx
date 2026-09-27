from __future__ import annotations

import hashlib
import json
import logging
import re
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from decimal import Decimal

import httpx

from app.core.config import settings

from app.schemas.collection import CollectionRequest, CollectionResult, RawFareRecord


logger = logging.getLogger(__name__)

_DIAGNOSTIC_MAX_RECORDS = 20
_DIAGNOSTIC_MAX_FIELDS = 40
_DIAGNOSTIC_MAX_REFERENCES = 20
_DIAGNOSTIC_REFERENCE_KEYS = {"id", "leg_id", "leg_ids", "segment_id", "segment_ids"}
_HTTP_ERROR_MAX_BYTES = 8192
_HTTP_ERROR_MAX_STRING_LENGTH = 200
_HTTP_ERROR_MAX_DEPTH = 3
_HTTP_ERROR_MAX_FIELDS = 20
_HTTP_ERROR_SENSITIVE_PARTS = (
    "api_key",
    "apikey",
    "token",
    "secret",
    "authorization",
    "password",
    "credential",
    "access_token",
    "refresh_token",
)
_HTTP_ERROR_SAFE_FIELDS = {"error", "message", "code", "status", "status_code", "error_code", "error_type", "category", "detail", "title"}
_URL_PATTERN = re.compile(r"https?://[^\s\"'<>]+", re.IGNORECASE)


def _diagnostic_type(value: object) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, (int, float, Decimal)):
        return "number"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    return type(value).__name__


def _diagnostic_key(key: object) -> str:
    text = str(key)
    if any(part in text.lower() for part in ("password", "token", "secret", "cookie", "authorization", "api_key", "apikey", "credential")):
        return "[REDACTED_KEY]"
    return text[:100]


def _diagnostic_identifier(value: object, identifiers: dict[str, str]) -> str:
    identity = str(value)
    if identity not in identifiers:
        identifiers[identity] = f"<ID_{len(identifiers) + 1}>"
    return identifiers[identity]


def _diagnostic_reference(value: object, identifiers: dict[str, str]) -> dict[str, object]:
    if isinstance(value, list):
        return {
            "type": "array",
            "count": len(value),
            "items": [
                _diagnostic_identifier(item, identifiers) if not isinstance(item, (dict, list)) else {"type": _diagnostic_type(item)}
                for item in value[:_DIAGNOSTIC_MAX_REFERENCES]
            ],
        }
    if isinstance(value, dict):
        return {
            "type": "object",
            "count": len(value),
            "keys": [_diagnostic_identifier(key, identifiers) for key in list(value)[:_DIAGNOSTIC_MAX_REFERENCES]],
        }
    return {"type": _diagnostic_type(value), "value": _diagnostic_identifier(value, identifiers)}


def _diagnostic_record(record: object, identifiers: dict[str, str]) -> dict[str, object]:
    if not isinstance(record, dict):
        return {"type": _diagnostic_type(record)}
    summary: dict[str, object] = {"type": "object", "keys": [_diagnostic_key(key) for key in list(record)[:_DIAGNOSTIC_MAX_FIELDS]]}
    references: dict[str, object] = {}
    shapes: dict[str, object] = {}
    for key, value in list(record.items())[:_DIAGNOSTIC_MAX_FIELDS]:
        safe_key = _diagnostic_key(key)
        if safe_key != "[REDACTED_KEY]" and (safe_key in _DIAGNOSTIC_REFERENCE_KEYS or safe_key.endswith("_id") or safe_key.endswith("_ids")):
            references[safe_key] = _diagnostic_reference(value, identifiers)
        elif isinstance(value, (list, dict)):
            shapes[safe_key] = {"type": _diagnostic_type(value), "count": len(value)}
    if references:
        summary["references"] = references
    if shapes:
        summary["nested_shapes"] = shapes
    return summary


def _diagnostic_collection(value: object, identifiers: dict[str, str]) -> dict[str, object]:
    if isinstance(value, list):
        return {
            "type": "array",
            "count": len(value),
            "records": [_diagnostic_record(record, identifiers) for record in value[:_DIAGNOSTIC_MAX_RECORDS]],
        }
    if isinstance(value, dict):
        return {
            "type": "object",
            "count": len(value),
            "keys": [_diagnostic_identifier(key, identifiers) for key in list(value)[:_DIAGNOSTIC_MAX_RECORDS]],
            "records": [_diagnostic_record(record, identifiers) for record in list(value.values())[:_DIAGNOSTIC_MAX_RECORDS]],
        }
    return {"type": _diagnostic_type(value)}


def describe_response_structure(payload: object) -> dict[str, object]:
    """Return a bounded, credential-free response shape for temporary Phase 9B diagnostics."""
    identifiers: dict[str, str] = {}
    if not isinstance(payload, dict):
        return {"top_level_type": _diagnostic_type(payload)}
    summary: dict[str, object] = {
        "top_level_type": "object",
        "top_level_keys": [_diagnostic_key(key) for key in list(payload)[:_DIAGNOSTIC_MAX_FIELDS]],
    }
    for collection_name in ("itineraries", "legs", "segments", "carriers", "agents"):
        if collection_name in payload:
            summary[collection_name] = _diagnostic_collection(payload[collection_name], identifiers)
    return summary


def _http_error_safe_key(key: object) -> str:
    text = str(key)
    if any(part in text.lower() for part in _HTTP_ERROR_SENSITIVE_PARTS):
        return "[REDACTED_KEY]"
    return text[:_HTTP_ERROR_MAX_STRING_LENGTH]


def _http_error_safe_string(value: str) -> str:
    redacted = _URL_PATTERN.sub("<REDACTED_URL>", value)
    return redacted[:_HTTP_ERROR_MAX_STRING_LENGTH]


def _http_error_shape(value: object, *, depth: int = 0) -> dict[str, object]:
    shape: dict[str, object] = {"type": _diagnostic_type(value)}
    if depth >= _HTTP_ERROR_MAX_DEPTH:
        shape["truncated"] = True
        return shape
    if isinstance(value, dict):
        items = list(value.items())
        shape["count"] = len(items)
        shape["keys"] = [_http_error_safe_key(key) for key, _ in items[:_HTTP_ERROR_MAX_FIELDS]]
        safe_fields: dict[str, object] = {}
        nested_shapes: dict[str, object] = {}
        for key, item in items[:_HTTP_ERROR_MAX_FIELDS]:
            safe_key = _http_error_safe_key(key)
            if safe_key == "[REDACTED_KEY]":
                continue
            if str(key).lower() in _HTTP_ERROR_SAFE_FIELDS:
                if isinstance(item, str):
                    safe_fields[safe_key] = _http_error_safe_string(item)
                elif isinstance(item, (bool, int, float)) or item is None:
                    safe_fields[safe_key] = item
                elif isinstance(item, (dict, list)):
                    nested_shapes[safe_key] = _http_error_shape(item, depth=depth + 1)
            elif isinstance(item, (dict, list)):
                nested_shapes[safe_key] = _http_error_shape(item, depth=depth + 1)
        if safe_fields:
            shape["safe_fields"] = safe_fields
        if nested_shapes:
            shape["nested_shapes"] = nested_shapes
    elif isinstance(value, list):
        shape["count"] = len(value)
        shape["item_types"] = [_diagnostic_type(item) for item in value[:_HTTP_ERROR_MAX_FIELDS]]
    return shape


def describe_http_error_response(response: httpx.Response) -> dict[str, object]:
    """Return a bounded, credential-free summary for temporary HTTP-error diagnostics."""
    body = response.content
    inspected = body[:_HTTP_ERROR_MAX_BYTES]
    summary: dict[str, object] = {
        "status_code": response.status_code,
        "content_type": _http_error_safe_string(response.headers.get("content-type", "")),
        "body_length": len(body),
        "inspected_bytes": len(inspected),
    }
    try:
        decoded = inspected.decode("utf-8")
        parsed = json.loads(decoded)
    except (UnicodeDecodeError, json.JSONDecodeError):
        summary["body_classification"] = "non_json"
        return summary
    summary["body_classification"] = "json"
    summary["body_shape"] = _http_error_shape(parsed)
    return summary


class FareSourceAdapter(ABC):
    source_name: str
    source_type: str
    parser_version: str

    @abstractmethod
    async def collect(self, request: CollectionRequest) -> CollectionResult:
        raise NotImplementedError


class MockFareSourceAdapter(FareSourceAdapter):
    source_name = "synthetic-demo"
    source_type = "synthetic"
    parser_version = "mock-v1"

    async def collect(self, request: CollectionRequest) -> CollectionResult:
        seed = f"{request.route_code}|{request.travel_date.isoformat()}|{request.search_date.isoformat()}|{request.advance_window}"
        digest = hashlib.sha256(seed.encode()).hexdigest()
        base_fare = Decimal(2500 + int(digest[:6], 16) % 5000)
        taxes = (base_fare * Decimal("0.18")).quantize(Decimal("0.01"))
        total = base_fare + taxes
        timestamp = datetime.now(timezone.utc)
        payload = {"source": self.source_name, "seed": seed, "fare": str(total), "currency": "INR"}
        record = RawFareRecord(
            source_name=self.source_name,
            source_type=self.source_type,
            retrieved_at=timestamp,
            collection_timestamp=timestamp,
            request_parameters=request.request_parameters,
            raw_payload=payload,
            parser_version=self.parser_version,
            route_code=request.route_code,
            origin=request.origin,
            destination=request.destination,
            travel_date=request.travel_date,
            search_date=request.search_date,
            advance_window=request.advance_window,
            airline="Synthetic Demo Carrier",
            flight_number=f"SD{int(digest[6:12], 16) % 9000 + 1000}",
            fare_class="economy",
            base_fare=base_fare,
            taxes=taxes,
            udf=Decimal("0.00"),
            convenience_fee=Decimal("0.00"),
            total_fare=total,
            currency="INR",
            availability="available",
        )
        return CollectionResult(records=[record])


class FlightAPIAdapter(FareSourceAdapter):
    source_name = "FlightAPI"
    source_type = "licensed_flight_provider"
    parser_version = "flightapi-oneway-v1"

    def __init__(self, *, api_key: str | None = None, base_url: str | None = None, timeout: float | None = None) -> None:
        self.api_key = api_key if api_key is not None else settings.flightapi_api_key
        self.base_url = (base_url or settings.flightapi_base_url).rstrip("/")
        self.timeout = timeout if timeout is not None else settings.flightapi_timeout_seconds

    async def collect(self, request: CollectionRequest) -> CollectionResult:
        if request.source != self.source_name or request.source_type != self.source_type:
            raise ValueError("FlightAPI adapter requires source=FlightAPI and licensed_flight_provider")
        if not self.api_key:
            raise ValueError("FLIGHTAPI_API_KEY is not configured")
        path = "/onewaytrip/{}/{}/{}/{}/{}/{}/{}/{}/{}".format(
            self.api_key,
            request.origin,
            request.destination,
            request.travel_date.isoformat(),
            request.request_parameters.get("number_of_adults", 1),
            request.request_parameters.get("number_of_children", 0),
            request.request_parameters.get("number_of_infants", 0),
            request.request_parameters.get("cabin_class", "Economy"),
            request.request_parameters.get("currency", "INR"),
        )
        url = f"{self.base_url}{path}"
        params = {"region": request.request_parameters.get("region", "IN")}
        try:
            timeout = httpx.Timeout(self.timeout, connect=10.0, read=self.timeout, write=10.0, pool=10.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                payload = response.json()
        except httpx.ConnectTimeout:
            return CollectionResult(failed_count=1, failure_category="connect_timeout", error_message="FlightAPI connection timed out")
        except httpx.ReadTimeout:
            return CollectionResult(failed_count=1, failure_category="read_timeout", error_message="FlightAPI provider response timed out")
        except httpx.WriteTimeout:
            return CollectionResult(failed_count=1, failure_category="write_timeout", error_message="FlightAPI request write timed out")
        except httpx.PoolTimeout:
            return CollectionResult(failed_count=1, failure_category="pool_timeout", error_message="FlightAPI connection pool timed out")
        except httpx.TimeoutException:
            return CollectionResult(failed_count=1, failure_category="request_timeout", error_message="FlightAPI request timed out")
        except httpx.HTTPStatusError as exc:
            category = "rate_limited" if exc.response.status_code == 429 else "http_error"
            # TEMPORARY PHASE 9B LIVE HTTP ERROR DIAGNOSTIC: log structure only, never the response body.
            logger.warning(
                "TEMPORARY PHASE 9B LIVE HTTP ERROR DIAGNOSTIC: %s",
                describe_http_error_response(exc.response),
            )
            return CollectionResult(failed_count=1, failure_category=category, error_message=f"FlightAPI returned HTTP {exc.response.status_code}")
        except httpx.RequestError:
            return CollectionResult(failed_count=1, failure_category="connection_error", error_message="FlightAPI connection failed")
        except ValueError:
            return CollectionResult(failed_count=1, failure_category="invalid_response", error_message="FlightAPI returned invalid JSON")
        try:
            records = self.parse_response(payload, request, source_url=f"{self.base_url}/onewaytrip")
        except ValueError as exc:
            # TEMPORARY PHASE 9B LIVE PAYLOAD DIAGNOSTIC: retain structure only on parse failure.
            logger.warning(
                "TEMPORARY PHASE 9B LIVE PAYLOAD DIAGNOSTIC: parse failure structure=%s error=%s",
                describe_response_structure(payload),
                str(exc),
            )
            return CollectionResult(failed_count=1, failure_category="parse_error", error_message=str(exc))
        return CollectionResult(records=records)

    @classmethod
    def parse_response(cls, payload: object, request: CollectionRequest, *, source_url: str) -> list[RawFareRecord]:
        if not isinstance(payload, dict):
            raise ValueError("FlightAPI response must be an object")
        itineraries = payload.get("itineraries")
        if itineraries is None:
            return []
        if not isinstance(itineraries, list):
            raise ValueError("FlightAPI itineraries must be an array")
        carriers = {str(item.get("id")): item.get("name") for item in payload.get("carriers", []) if isinstance(item, dict)}
        legs = {str(item.get("id")): item for item in payload.get("legs", []) if isinstance(item, dict)}
        segments = {str(item.get("id")): item for item in payload.get("segments", []) if isinstance(item, dict)}
        timestamp = datetime.now(timezone.utc)
        records: list[RawFareRecord] = []
        for itinerary in itineraries:
            if not isinstance(itinerary, dict):
                raise ValueError("FlightAPI itinerary must be an object")
            leg_ids = itinerary.get("leg_ids") or []
            if not isinstance(leg_ids, list) or not leg_ids:
                raise ValueError("FlightAPI itinerary has no usable leg reference")
            resolved_segments: list[dict[str, object]] = []
            for leg_id in leg_ids:
                leg = legs.get(str(leg_id))
                if not isinstance(leg, dict):
                    raise ValueError("FlightAPI itinerary references a missing leg")
                segment_ids = leg.get("segment_ids") or []
                if not isinstance(segment_ids, list) or not segment_ids:
                    raise ValueError("FlightAPI leg has no usable segment reference")
                for segment_id in segment_ids:
                    segment = segments.get(str(segment_id))
                    if not isinstance(segment, dict):
                        raise ValueError("FlightAPI leg references a missing segment")
                    resolved_segments.append(segment)
            first_segment = resolved_segments[0]
            airline_id = str(first_segment.get("marketing_carrier_id"))
            airline = carriers.get(airline_id)
            flight_number = first_segment.get("marketing_flight_number")
            for option in itinerary.get("pricing_options", []):
                if not isinstance(option, dict):
                    continue
                price = option.get("price")
                if not isinstance(price, dict) or price.get("amount") is None:
                    continue
                amount = Decimal(str(price["amount"]))
                if not amount.is_finite() or amount < 0:
                    raise ValueError("FlightAPI price amount is invalid")
                fare_family = None
                fares = option.get("fares")
                if isinstance(fares, list) and fares and isinstance(fares[0], dict):
                    fare_family = fares[0].get("fare_family") or fares[0].get("booking_code")
                records.append(RawFareRecord(
                    source_name=cls.source_name,
                    source_type=cls.source_type,
                    source_url=source_url,
                    retrieved_at=timestamp,
                    collection_timestamp=timestamp,
                    request_parameters={**request.request_parameters, "origin": request.origin, "destination": request.destination, "travel_date": request.travel_date.isoformat(), "currency": request.request_parameters.get("currency", "INR"), "cabin_class": request.request_parameters.get("cabin_class", "Economy"), "region": request.request_parameters.get("region", "IN")},
                    raw_payload=payload,
                    parser_version=cls.parser_version,
                    route_code=request.route_code,
                    origin=request.origin,
                    destination=request.destination,
                    travel_date=request.travel_date,
                    search_date=request.search_date,
                    advance_window=request.advance_window,
                    airline=str(airline) if airline else None,
                    flight_number=str(flight_number) if flight_number else None,
                    fare_class=str(fare_family) if fare_family else None,
                    total_fare=amount,
                    currency=str(request.request_parameters.get("currency", "INR")),
                    availability="unknown",
                ))
        return records


def payload_hash(payload: dict[str, object] | list[object]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str).encode()
    return hashlib.sha256(encoded).hexdigest()


def sanitize_request_parameters(parameters: dict[str, object]) -> dict[str, object]:
    sensitive = ("password", "token", "secret", "cookie", "authorization", "api_key", "apikey", "credential")
    return {key: "[REDACTED]" if any(part in key.lower() for part in sensitive) else value for key, value in parameters.items()}


def normalize_raw_record(record: RawFareRecord, raw_observation_id: str, route_id: str, airline_id: str) -> dict[str, object]:
    if record.total_fare is None:
        raise ValueError("raw fare is missing total_fare")
    if record.total_fare < 0 or (record.base_fare is not None and record.base_fare < 0) or (record.taxes is not None and record.taxes < 0):
        raise ValueError("fare values must not be negative")
    if record.route_code != f"{record.origin}-{record.destination}":
        raise ValueError("raw route does not match origin and destination")
    fare_completeness = (
        "complete"
        if all(value is not None for value in (record.base_fare, record.taxes, record.udf, record.convenience_fee))
        else "total_only"
        if record.base_fare is None and record.taxes is None
        else "partial"
    )
    normalized_id = f"normalized-{raw_observation_id}"
    if len(normalized_id) > 64:
        normalized_id = f"normalized-{hashlib.sha256(raw_observation_id.encode()).hexdigest()[:52]}"
    return {
        "id": normalized_id,
        "route_id": route_id,
        "airline_id": airline_id,
        "origin": record.origin,
        "destination": record.destination,
        "route_code": record.route_code,
        "flight": record.flight_number,
        "travel_date": record.travel_date,
        "search_date": record.search_date,
        "advance_window": record.advance_window,
        "fare_class": record.fare_class,
        "base_fare": record.base_fare,
        "taxes": record.taxes,
        "udf": record.udf,
        "convenience_fee": record.convenience_fee,
        "total_fare": record.total_fare,
        "fare_completeness": fare_completeness,
        "availability": record.availability or "unknown",
        "source": record.source_name,
        "source_type": record.source_type,
        "currency": record.currency,
        "collection_timestamp": record.collection_timestamp,
        "cleaning_status": "raw",
        "index_eligible": False,
        "retrieved_at": record.retrieved_at,
        "raw_observation_id": raw_observation_id,
    }