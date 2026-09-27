# Phase 9C Controlled Multi-Context Collection

## Status

- Engineering/orchestration validation: **COMPLETE**.
- Controlled live 30-context collection: **PARTIALLY EXECUTED / BLOCKED BY PROVIDER QUOTA**.
- FlightAPI test-account allowance: **30 credits**.
- The available 30 credits were consumed during controlled integration and collection testing.
- No additional live requests should be attempted until provider quota is restored.

Thirty collection contexts were planned and terminally processed. The live collection did not produce additional observations because the provider rejected requests after quota exhaustion or timed out. This is not fabricated, simulated, or successful live collection data.

## Safety

- `POST /api/v1/collection/plans/dry-run` builds the exact 30-request report without creating a job or contacting a provider.
- `POST /api/v1/collection/plans` persists an idempotent plan in `CollectionJob.configuration`.
- `GET /api/v1/collection/plans/{job_id}/dry-run` displays a persisted plan.
- Execution requires `live_execution=true`; the default is false and returns a conflict response.
- Execution is bounded by maximum concurrency, inter-request delay, and per-request timeout.
- Automatic retries are disabled.
- A provider timeout is enforced inside the adapter/request boundary; the orchestrator does not wrap the shared database session in an outer cancellation timeout.

## Provenance and idempotency

Each context has a deterministic identity and carries route, search date, travel date, advance window, passenger counts, cabin, currency, region, source, and context ID in the provider request parameters. Runs retain the existing job/run relationship. Raw observations preserve the run and job links, and identical source payload hashes are counted as duplicates across runs instead of being persisted again.

Successful execution remains:

```text
CollectionContext -> CollectionRequest -> FareSourceAdapter
  -> CollectionService.execute_collection
  -> RawObservation -> CollectionService.normalize_run
  -> Observation
```

Total-only provider results remain valid and retain null fare decomposition.

## Verified engineering capabilities

1. Deterministic six-route by five-window planning.
2. Idempotent context and job identities.
3. Controlled concurrency and inter-request delay.
4. No automatic retry, including for indeterminate provider calls.
5. Raw observation persistence through `CollectionService`.
6. Normalization through the existing raw-to-observation path.
7. Total-only fare support without fabricated components.
8. Source, job, run, request-context, route, and date provenance.
9. Timeout isolation from the shared SQLAlchemy transaction/session.
10. Terminal handling for failed, timed-out, and indeterminate runs.
11. Preservation of indeterminate provider calls as historical run records.
12. Offline regression coverage for planning, execution controls, timeout isolation, persistence, normalization, and idempotency.

## Terminal live-collection result

| Metric | Verified value |
| --- | ---: |
| Planned contexts | 30 |
| Terminally processed contexts | 30 |
| Completed contexts | 0 |
| Partial contexts | 0 |
| Failed contexts | 30 |
| Pending contexts | 0 |
| Running/orphan contexts | 0 |
| Provider requests/credits consumed | 30 |
| HTTP errors | 20 |
| Request timeouts | 9 |
| Indeterminate provider calls | 1 |
| New raw observations | 0 |
| New normalized observations | 0 |
| Duplicate payloads | 0 |

The 20 HTTP errors were provider quota-exhausted responses. The 9 timeouts and 1 indeterminate call are preserved separately and must not be conflated with the quota limitation. The previously fixed orchestration defect involved outer cancellation corrupting the shared database transaction during a timeout; offline regression testing now proves that adapter-owned timeout handling leaves the session usable for the next context.

## Preserved database state

- Existing real FlightAPI observation: preserved.
- Existing normalized FlightAPI observation: preserved with total-only fare semantics.
- Existing FlightAPI raw observations: 1.
- Existing FlightAPI normalized raw rows: 1.
- Total normalized observations in the database: 7, consisting of 6 synthetic observations and 1 existing FlightAPI observation.
- Synthetic observations: 6, unchanged.
- Historical failed, timeout, and indeterminate collection runs: preserved.
- No collection job was reset, and no records were deleted.

The Phase 9C job remains a historical record of the controlled attempt. It must not be retried until FlightAPI quota is restored and a new controlled execution is explicitly authorized.
