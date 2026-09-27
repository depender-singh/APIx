# APIx Phase 9B: FlightAPI Source Verification and Integration Readiness

## Implementation Status

The FlightAPI adapter foundation is implemented and tested offline. The initial 20-second live request timed out; a controlled 60-second retry received a provider response but exposed a parser mismatch. A post-fix controlled request also received a provider response but failed with `FlightAPI itinerary has no usable segment`. The complete response was not persisted because parsing failed before raw persistence, and no response body was captured in logs. Therefore the provider's actual collection and identifier structure cannot be established offline.

Configuration uses `FLIGHTAPI_API_KEY` and `FLIGHTAPI_BASE_URL`; the key is never stored in PostgreSQL, request parameters, raw payloads, API responses, logs, frontend code, or documentation. The `.env.example` file contains only an empty placeholder.

`FlightAPIAdapter` implements the existing `FareSourceAdapter` contract and maps the documented one-way request. It preserves total fare and leaves unavailable base/tax/fee components null. It does not calculate APIx, set index eligibility, or bypass Phase 3.

The temporary payload diagnostic is now in place for one separately authorized controlled capture. The 30-context collection remains prohibited until that capture crosses raw persistence, normalization, and Phase 3 quality checks.

Offline fixtures verify the currently assumed leg-to-segment shape, multiple legs/segments/itineraries, missing references, total-only parsing, airline/flight/fare-family mapping, currency/date handling, empty/malformed responses, missing configuration, normalization without APIx calculation, and no fabricated fare components. They are not evidence of the failed live response shape.

## Phase 9B Progression

```text
20-second provider timeout
	-> 60-second controlled retry
	-> provider response received
	-> parser mismatch discovered
	-> offline assumed-shape fix
	-> post-fix provider response received
	-> actual response body unavailable
	-> PARSER DIAGNOSIS BLOCKED
```

## Current Status

The parser diagnosis was evidence-only. No parser code or fixture was changed because the actual response structure was not captured. The controlled run remains preserved with zero raw observations. The temporary diagnostic must be removed after the provider structure is identified.

The existing Phase 9A collection architecture is unchanged. The successful controlled capture reached raw persistence but did not create a normalized observation. This is the current collection boundary by design: `CollectionService.execute_collection` records parsed provider output in `RawObservation`, while normalization and Phase 3 processing remain a separate implementation step. The capture is therefore evidence of real provider reachability and parsing, not evidence of normalized or index-eligible FlightAPI data.

## Access Verification

Official signup: <https://api.flightapi.io/register>

Official documentation: <https://www.flightapi.io/documentation/>

Official pricing/product page: <https://www.flightapi.io/flight-price-api/>

Access classification: **SELF_SERVE_WITH_PAID_PLAN**

Evidence:

- The signup page exposes self-serve account creation with username, email, and password.
- The signup page states 30 free API credits and no card required.
- The product page states a 30-day free trial with no credit card and 20 free credits.
- This is an inconsistency in the current public pages. The exact free-credit allowance must be confirmed from the account dashboard or FlightAPI support before planning a test budget.
- Paid plans shown publicly are Lite: $49/month for 30,000 credits and 5 concurrent requests; Standard: $99/month for 100,000 credits and 10 concurrent requests; Plus: $199/month for 500,000 credits and 50 concurrent requests.
- The public material does not state that human approval is required for signup or ordinary API-key generation.
- The documentation says the API key is generated from the dashboard.
- No credentials were created or requested.

Production access is therefore technically self-serve but practically requires a paid subscription for sustained use and must remain subject to the current terms, quotas, and source-provider restrictions.

## Flight Price API

### Oneway endpoint

Official documentation: <https://www.flightapi.io/documentation/oneway-trip-api/>

Documented request shape:

```text
GET https://api.flightapi.io/onewaytrip/<api-key>/<departure_airport_code>/<arrival_airport_code>/<departure_date>/<number_of_adults>/<number_of_childrens>/<number_of_infants>/<cabin_class>/<currency>
```

The documentation also lists `region` as a required parameter for local prices. The documented fields are:

- `departure_airport_code`: IATA code
- `arrival_airport_code`: IATA code
- `departure_date`: `YYYY-MM-DD`
- `number_of_adults`
- `number_of_childrens`
- `number_of_infants`
- `cabin_class`: Economy, Business, First, Premium_Economy
- `currency`: examples include USD, INR, and EUR
- `region`: ISO country code for local prices

The documentation states each successful one-way request costs 2 credits.

### Round-trip endpoint

Official documentation: <https://www.flightapi.io/documentation/round-trip-api/>

Documented request shape:

```text
GET https://api.flightapi.io/roundtrip/<api-key>/<departure_airport_code>/<arrival_airport_code>/<departure_date>/<arrival_date>/<number_of_adults>/<number_of_childrens>/<number_of_infants>/<cabin_class>/<currency>
```

Round-trip requests also document `region` for local prices and cost 2 credits.

### Multi-trip endpoint

Official documentation: <https://www.flightapi.io/documentation/multi-trip-api/>

The multi-trip API supports 3 to 5 flights with airport/date pairs, passenger counts, cabin class, and currency. Each request costs 5 credits. It is not needed for APIx’s first one-way controlled route observation.

## Response Structure and APIx Fields

The official one-way and round-trip examples expose:

- Origin: `AVAILABLE` through request and leg/place references; response place-code representation must be confirmed in an authorized response.
- Destination: `AVAILABLE` through request and leg/place references; response place-code representation must be confirmed in an authorized response.
- Airline: `AVAILABLE` through carrier IDs plus carrier objects.
- Flight number: `AVAILABLE` as `segments[].marketing_flight_number`.
- Travel date: `AVAILABLE` in the request and leg/segment departure timestamps.
- Search timestamp: `NOT_AVAILABLE` as an APIx collection timestamp; `pricing_options[].price.last_updated` is a provider quote timestamp, while APIx would separately record local retrieval time.
- Advance window: `DERIVED` as `travel_date - search_date`; FlightAPI does not document APIx’s search-date concept.
- Fare class/cabin: `AVAILABLE` through the request cabin and response `fares[].fare_family` / `booking_code` examples.
- Base fare: `UNKNOWN`; the public examples expose total price objects but do not establish a reliable base-fare field for every result.
- Taxes: `UNKNOWN` for one-way/round-trip price objects. The multi-trip example shows tax fields, but this does not prove consistent availability in all price responses.
- Fees: `CONDITIONAL`; the multi-trip example contains payment-fee/booking-fee fields, but the one-way/round-trip examples do not establish a stable decomposition.
- Total fare: `AVAILABLE` as `pricing_options[].price.amount` / `cheapest_price.amount`; multi-trip also documents total amount fields.
- Currency: `AVAILABLE` through the request and response price/search currency fields.
- Availability: `CONDITIONAL`; multi-trip examples include `remainingSeatsCount`, but availability semantics and presence across all flight-price responses are not guaranteed.
- Source/vendor: `AVAILABLE` through `agent_ids`, `agents`, and pricing options from multiple vendors.
- Itinerary/segments: `AVAILABLE` through itineraries, legs, segments, carriers, agents, departure/arrival times, stop counts, and marketing/operating carrier IDs.

FlightAPI’s own product page says the Flight Price API provides routes, airlines, fares, timings, duration, baggage, and booking links and compares prices from 700+ airlines and vendors. These are product claims, not independent verification of every APIx route or field in a live response.

## India Coverage

India coverage status: **UNKNOWN**.

The documentation accepts arbitrary IATA airport codes and the examples include Indian airports in the multi-trip sample, including JAI and DEL. However, the public documentation does not guarantee the six APIx routes or current supplier availability:

- DEL-BOM: `UNKNOWN`
- DEL-BLR: `UNKNOWN`
- BOM-BLR: `UNKNOWN`
- DEL-CCU: `UNKNOWN`
- BLR-HYD: `UNKNOWN`
- MAA-DEL: `UNKNOWN`

No account was created and no live request was made. Therefore no route result can be claimed.

## Repeated Observations and Quotas

The API supports date-specific searches and the documentation does not state that repeated searches are prohibited. The Terms grant a paid subscriber access to returned data, but no explicit research-specific frequency allowance is published.

The getting-started documentation states:

- Free plan: no overage; more than 100 requests per 30 days returns HTTP 429.
- Exceeding plan connection limits returns HTTP 429.
- One-way request cost: 2 credits.
- Round-trip request cost: 2 credits.
- Multi-trip request cost: 5 credits.

APIx’s rough one-way collection requirement:

- 6 routes x 5 advance windows = 30 searches per collection cycle.
- 30 daily searches x 30 days = 900 searches/month.
- 900 x 2 credits = 1,800 credits/month.

The public Lite plan advertises 30,000 credits/month and 5 concurrent requests, so the nominal credit budget is sufficient for 900 one-way searches/month. This excludes retries, failed requests, polling, route rechecks, and any provider-specific restrictions. A one-way request would consume 60 credits per full five-window cycle across six routes.

Current public pages do not disclose a requests-per-minute figure. The public concurrency limits are:

- Free: `UNKNOWN` beyond the documented 100-request/30-day cap.
- Lite: 5 concurrent requests.
- Standard: 10 concurrent requests.
- Plus: 50 concurrent requests.

Repeated collection is therefore **PERMITTED_WITH_LIMITATIONS**: it is technically compatible with the API and not expressly prohibited in the reviewed Terms, but it must remain within plan limits, avoid excessive concurrency, and respect third-party source restrictions.

## Terms and Data License Analysis

Official Terms: <https://www.flightapi.io/terms-and-privacy/#terms-of-service>

Terms last updated: May 15, 2024.

### Access

The Terms grant a paid subscriber a non-exclusive, worldwide license to access returned Licensed Data during an active paid subscription.

**Conclusion: CLEARLY_PERMITTED for a paid subscriber.**

### Store

The license expressly includes the right to store returned Licensed Data.

**Conclusion: CLEARLY_PERMITTED while relying on the stated license.**

### Display and analyze

The license expressly includes display and analysis.

**Conclusion: CLEARLY_PERMITTED.**

### Aggregate and derive

The Terms say the subscriber may present, transform, or combine Licensed Data in any manner, provided the subscriber does not add or alter data points in a way that misrepresents the returned information or harms third parties. The license also expressly permits redistribution commercially or otherwise.

A derived APIx index is a transformed and combined aggregate, not a verbatim raw-fare redistribution. The Terms do not use the phrase “Airfare Price Index,” but their transformation/combination language appears to cover this use.

**Conclusion: PERMITTED_WITH_LIMITATIONS.** APIx must preserve data integrity, document methodology, avoid misrepresentation, and confirm the intended derived-index publication use with FlightAPI before production launch.

### Publish aggregated results

The license expressly permits display and redistribution of Licensed Data commercially or otherwise, and permits transformation/combination. This supports publishing an aggregated derived index more strongly than the other candidates reviewed.

However, the Terms also require compliance with applicable law and prohibit use that harms third parties. The underlying data is collected from publicly accessible sources, and FlightAPI disclaims ownership of underlying information.

**Conclusion: PERMITTED_WITH_LIMITATIONS**, not an unconditional legal opinion.

### Raw response redistribution

The stated license includes redistribution of Licensed Data, but APIx should distinguish raw provider payloads from derived public index results and should avoid publishing unnecessary vendor/source payload details. Exact attribution and provider-source obligations are not specified in the reviewed Terms.

**Conclusion: PERMITTED_WITH_LIMITATIONS.**

## Retention

The Terms expressly allow storage and state that when a subscription ends, the license to receive new Licensed Data ends automatically. They also state previously retrieved data may remain, may become outdated, and that the subscriber is responsible for checking/updating it if relying on it.

**Retention finding: NO EXPLICIT RETENTION LIMIT FOUND.**

**Subscription termination:**

- New data access: ends automatically when the subscription ends.
- Previously retrieved Licensed Data: the Terms expressly contemplate that it may remain and continue to be relied upon subject to staleness responsibility.
- Historical APIx series: appears supportable under the Terms, subject to preserving provenance, data integrity, and applicable legal obligations.

## Data Provenance

FlightAPI states that Licensed Data is collected solely from publicly accessible open-internet sources and that FlightAPI does not claim proprietary rights in underlying information. It also states the data is provided in real time and may be inaccurate, incomplete, stale, or unreliable.

APIx must not label this as official airline data. Future provenance should distinguish:

- provider: FlightAPI
- source type: licensed flight-data provider
- underlying source: provider-described publicly accessible sources
- retrieval timestamp: APIx collection time
- provider quote timestamp: `last_updated` when returned
- request parameters: sanitized
- payload hash and parser version

No schema changes were made in this phase.

## APIx Statistical Use Case

Question: Does the current public license allow repeated retrieval of fare observations, retention, statistical analysis, a derived airfare index, and publication of aggregated results?

Decision: **PERMITTED_WITH_LIMITATIONS**.

Reasons:

- The paid-subscription license explicitly permits access, storage, display, analysis, and redistribution.
- The Terms permit presenting, transforming, and combining returned data.
- Previously retrieved data may remain after subscription termination.
- The provider explicitly markets aviation analytics and data-provider use.
- Limits remain around plan quotas, applicable law, non-misrepresentation, third-party source rights, data accuracy, and the absence of explicit “APIx index” wording.

This is sufficiently promising for a controlled authorization confirmation, but no implementation should begin until the exact current terms are re-confirmed at implementation time and the provider confirms India route availability.

## Requirement Comparison

| Requirement | FlightAPI | Evidence | Confidence |
|---|---|---|---|
| Self-serve access | YES | Signup page and dashboard API-key documentation | High |
| India coverage | UNKNOWN | Generic IATA/global claims and an Indian example, but no six-route guarantee | Medium |
| Domestic route search | CONDITIONAL | IATA airport-code request model | Medium |
| Fare price | YES | `price.amount`, `cheapest_price`, product documentation | High |
| Airline | YES | Carrier IDs/objects and multi-vendor product | High |
| Flight number | YES | `segments[].marketing_flight_number` | High |
| Travel date | YES | `departure_date`, legs, segments | High |
| Search timestamp | NO provider field / DERIVED APIx retrieval time | APIx can record retrieval; provider quote has `last_updated` | High |
| Cabin | YES | `cabin_class`, `search.cabin`, fare family | High |
| Currency | YES | Request currency and price currency fields | High |
| Repeated searches | CONDITIONAL | Date-specific API, paid credits, 429/concurrency controls | Medium |
| Storage | YES while paid license applies | Terms expressly say access/store | High |
| Historical retention | YES_WITH_LIMITATIONS | Prior data may remain after subscription ends; new data stops | High |
| Statistical analysis | YES | Terms expressly say analyze | High |
| Aggregation | YES | Terms expressly permit transform/combine | High |
| Derived index | YES_WITH_LIMITATIONS | Transform/combine language, no explicit index example | Medium |
| Publication of aggregate index | YES_WITH_LIMITATIONS | Display/redistribution plus transform/combine language | Medium |
| Raw fare/tax decomposition | UNKNOWN/CONDITIONAL | Multi-trip sample has tax/payment-fee fields; one-way sample does not establish universal decomposition | High |
| Availability | UNKNOWN/CONDITIONAL | `remainingSeatsCount` appears in multi-trip sample only | High |
| Rate limits | CONDITIONAL | 100 free requests/30 days, plan concurrency, 429 behavior; no RPM published | High |
| Cost feasibility | YES_WITH_LIMITATIONS | Lite 30,000 credits/month at $49; APIx estimate 1,800 credits/month | High |

## Data Quality Findings

The documented response is sufficiently granular for a future parser to represent multiple itineraries, pricing options, agents/vendors, carriers, flight segments, flight numbers, fare families, prices, dates, currencies, and quote timestamps.

The following remain insufficiently stable for automatic APIx decomposition without a live authorized sample:

- base fare versus taxes;
- all fees and booking/payment fees;
- universal seat availability semantics;
- current India supplier/airline coverage;
- whether multiple pricing options represent comparable fare products.

A future adapter must preserve unknown components as null/unknown rather than inventing fare decomposition.

## Technical Smoke Test

No live test was performed.

Reason: no credentials were supplied or requested, and this phase forbids requesting credentials. The public documentation is sufficient to verify request shape and sample response structure, but not to verify actual India coverage or current production response behavior.

## Decision

**Classification: APPROVED_WITH_LIMITATIONS**

FlightAPI is technically suitable and its paid-subscription Terms are unusually explicit about access, storage, analysis, transformation, combination, and redistribution. It is a stronger candidate than the previously reviewed providers.

It is not classified as unqualified `APPROVED` because:

1. India route coverage for all six APIx routes was not live-verified.
2. The public Terms do not explicitly name derived airfare-index publication.
3. Fare tax/fee decomposition and availability are not uniform in the public examples.
4. The Terms are dated May 15, 2024 and must be re-confirmed before implementation.
5. FlightAPI disclaims ownership and accuracy of underlying public-source data, so provider/supplier restrictions and data-quality risks remain.

## Recommended Next Step

**REQUEST WRITTEN CONFIRMATION**, then perform a credentialed one-request smoke test only after authorization and credential access are available.

Written confirmation should ask FlightAPI to confirm:

- APIx may repeatedly search the six Indian domestic routes at T+1/T+7/T+15/T+30/T+45.
- APIx may retain raw responses and normalized observations for historical statistical analysis.
- APIx may calculate and publish an aggregated derived Airfare Price Index without redistributing raw fare payloads.
- The Lite plan’s 30,000 credits and concurrency limits support the intended collection schedule.
- India coverage and current supplier availability for DEL-BOM, DEL-BLR, BOM-BLR, DEL-CCU, BLR-HYD, and MAA-DEL.
- Required attribution, stale-data handling, source restrictions, and any retention/redistribution conditions.

Only after that confirmation should Phase 9B-2 implement the adapter and controlled job.

## Official Sources

- FlightAPI getting started: <https://www.flightapi.io/documentation/getting-started/>
- FlightAPI flight-price overview: <https://www.flightapi.io/documentation/flight-price-api/>
- FlightAPI one-way API: <https://www.flightapi.io/documentation/oneway-trip-api/>
- FlightAPI round-trip API: <https://www.flightapi.io/documentation/round-trip-api/>
- FlightAPI multi-trip API: <https://www.flightapi.io/documentation/multi-trip-api/>
- FlightAPI product page: <https://www.flightapi.io/flight-price-api/>
- FlightAPI signup: <https://api.flightapi.io/register>
- FlightAPI Terms of Service: <https://www.flightapi.io/terms-and-privacy/>
- FlightAPI Privacy Policy: <https://www.flightapi.io/privacy-policy/>
- FlightAPI pricing: <https://www.flightapi.io/#pricing>
- FlightAPI SLA: <https://www.flightapi.io/sla/>

# PHASE 9B-1 STATUS:
FlightAPI classification: APPROVED_WITH_LIMITATIONS

Technical suitability: SUITABLE_WITH_LIMITATIONS
Authorization suitability: STRONG_PUBLIC_LICENSE, but confirm current terms and APIx use in writing
India coverage: UNKNOWN until authorized live test/provider confirmation
Storage permission: YES during paid subscription; prior retrieved data may remain after termination
Statistical-analysis permission: YES
Derived-index permission: YES_WITH_LIMITATIONS
Publication permission: YES_WITH_LIMITATIONS
Subscription requirement: Self-serve signup; paid subscription required for sustained production collection
Estimated APIx monthly requests: 900 one-way searches/month for one daily cycle across 6 routes x 5 windows
Estimated credit consumption: 1,800 credits/month at 2 credits per one-way request
Estimated cost: Lite plan advertised at $49/month for 30,000 credits; actual pricing/availability must be re-confirmed
Credentials required: FlightAPI API key from Dashboard; none obtained
Live test performed: NO
Database rows created: 0

Recommended next step: REQUEST WRITTEN CONFIRMATION
