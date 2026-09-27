# Phase 9A Collection Architecture

Phase 9A establishes the production collection foundation. It does not implement a live airline or OTA collector. Real source integration begins in Phase 9B.

```text
Source -> Adapter -> Raw Observation -> Normalization -> Observation
       -> Phase 3 cleaning -> quality/index eligibility -> Phase 6 APIx
       -> historical APIx -> Phase 7 DGCA back-testing
```

## Existing contracts reused

- `DataSource` remains the source registry.
- `Observation` remains the normalized airfare observation consumed by cleaning, quality, indexing, analytics, and back-testing.
- `cleaning_status` and `index_eligible` remain owned by the existing pipeline.
- The mock engine remains the frontend demo data source.

## Phase 9A models

- `RawObservation` preserves the original payload, request parameters, source identity, URL, retrieval time, parser version, payload hash, job/run links, and fare fields.
- `CollectionJob` describes what should be collected: source, route, enablement, schedule, canonical advance windows, and configuration.
- `CollectionRun` records an execution and its pending/running/completed/partial/failed/cancelled state, counters, timing, and failure category.

Raw records are immutable by convention. A deterministic ID combines the collection run and payload hash: identical payloads in the same run are skipped, while the same payload in a later run remains traceable as a new temporal observation.

## Adapters and safety

`FareSourceAdapter` is the boundary for future airline, OTA, and synthetic adapters. `MockFareSourceAdapter` is deterministic and explicitly `synthetic`; it does not represent an airline or OTA and never calls the network. No CAPTCHA bypass, stealth automation, proxy rotation, authentication bypass, or undocumented provider API is present.

`CollectionRequest` validates route/date consistency and allows only APIx advance windows T+1, T+7, T+15, T+30, and T+45. `normalize_raw_record` maps raw fare fields to the existing normalized Observation shape, starts with `cleaning_status=raw` and `index_eligible=false`, and performs no APIx calculation.

Failures are explicit and use categories such as timeout, connection_error, http_error, invalid_response, parse_error, validation_error, rate_limited, source_unavailable, unsupported_request, and unknown_error. A real-source failure must never become synthetic success.

Operational read APIs expose collection sources, jobs, runs, raw observations, and collection health. Health reports `not_collected` when no run exists; it does not invent success metrics. Request metadata is an application-owned dictionary and must be sanitized by any Phase 9B source adapter before persistence; credentials, cookies, tokens, and authorization headers must never be stored.

Phase 9B added the compliant FlightAPI source through this adapter boundary and connected its normalized records to the existing cleaning pipeline. Phase 9C completed engineering validation of controlled multi-context orchestration, but its 30-context live attempt was blocked by the provider's exhausted 30-credit allowance.

## Phase 9B live-source normalization status

`CollectionService.execute_collection` currently persists successfully parsed adapter records only to `RawObservation`. Its `accepted_count` is the number of raw rows inserted, not the number of normalized `Observation` rows. The service does not call `normalize_raw_record`, create `Observation` rows, update `RawObservation.raw_status`, or set `normalized_observation_id`; normalization is intentionally deferred at this boundary.

The first successful FlightAPI capture confirms this behavior: one raw row was persisted with `raw_status=pending` and no normalized observation. The parsed provider record contains a total fare, airline, flight number, currency, and availability, while base fare, taxes, UDF, convenience fee, and fare class are unavailable. The existing normalizer permits nullable base/tax values, defaults only UDF and convenience fee to zero, preserves total-fare-only input, and starts normalized records as `cleaning_status=raw` and `index_eligible=false`; it does not fabricate fare decomposition or calculate APIx.

The normalization worker/service is now implemented in `CollectionService.normalize_raw_observation` and `normalize_run`. It reads pending raw rows, resolves route and airline foreign keys, calls `normalize_raw_record`, creates an `Observation`, and updates the raw row status and normalized ID transactionally. Total-only observations remain valid and unavailable fare components remain null.

## Phase 9C closure

The Phase 9C plan deterministically represents six routes by five advance windows, persists its idempotent job configuration, and uses the existing `CollectionJob`, `CollectionRun`, `RawObservation`, and `Observation` contracts. Execution supports bounded concurrency, provider-owned request timeouts, inter-request delay, explicit live execution, no automatic retry, payload deduplication, normalization, and terminal run handling.

Engineering/orchestration validation is complete. The first controlled live collection consumed the available 30 FlightAPI credits and terminally processed all 30 contexts, but produced no new raw or normalized observations: 20 requests received quota-exhausted HTTP errors, 9 timed out, and 1 provider call remained indeterminate. No running or orphan contexts remain. The existing real FlightAPI observation, its normalized observation, all six synthetic observations, and all historical failed/timeout/indeterminate runs remain preserved.

The provider quota limitation is distinct from the previously fixed timeout/session-isolation defect. Offline regression coverage proves that adapter-owned timeout handling preserves the shared database session and allows a subsequent context to execute successfully. No further live requests should be attempted until provider quota is restored and a new controlled run is authorized.
