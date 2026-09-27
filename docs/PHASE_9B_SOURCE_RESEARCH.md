# APIx Phase 9B Source Research

## Current Status

Phase 9B-0 is documentation-only. No adapter, scraper, live request, credential, collection job, collection run, migration, database row, or application behavior was added.

The Phase 9A architecture remains unchanged: `FareSourceAdapter`, `CollectionRequest`, raw observations, collection jobs/runs, provenance, payload hashing, normalization boundary, and deterministic mock adapter.

## APIx Source Requirements

A usable source must provide or legally permit:

- Repeated programmatic searches for Indian domestic routes, including DEL-BOM, DEL-BLR, BOM-BLR, DEL-CCU, BLR-HYD, and MAA-DEL.
- Travel date, search timestamp, route, airline, flight/segment identity, cabin/fare family where available, total fare, currency, availability, and source provenance.
- T+1, T+7, T+15, T+30, and T+45 collection planning.
- Internal storage of auditable observations and raw response provenance where permitted.
- Statistical and historical analysis, aggregation, benchmarking, and construction of a derived Airfare Price Index.
- Eventual production use, subject to provider agreement and applicable supplier permissions.

Unknown permissions are not treated as approval.

## Candidate Sources

### 1. Skyscanner Flights Live Prices API

- Official documentation: <https://developers.skyscanner.net/docs/flights-live-prices/overview>
- Authentication: API key; official documentation says an application must be submitted to the Partnerships team for review.
- Access: partner-reviewed, not open public access.
- Technical fields: `AVAILABLE` for origin/destination query legs, date, itinerary/legs/segments, carriers, agents, bookable itinerary, and result price concepts. Exact raw fare/tax decomposition, fare family, and retained-result rights: `UNKNOWN` from public documentation.
- India coverage: `UNKNOWN`; global-looking API documentation does not independently establish all six APIx routes.
- Repeated collection: technically `AVAILABLE`; contractual search quotas and caching/storage conditions: `UNKNOWN`.
- Historical fares: `UNKNOWN` for the public API; documentation describes live prices.
- Statistical/index use: `UNKNOWN`; partner agreement required.
- Classification: `APPROVED_WITH_LIMITATIONS` as a technical candidate only, pending partner authorization.

### 2. OAG Airfare Data / Airfare Analytics

- Official data catalogue: <https://www.oag.com/flight-data>
- Official related product links: <https://www.oag.com/airfare-data>, <https://www.oag.com/airfare-analytics>
- Access: commercial data product/contact-sales path, not an open public API.
- Technical fields: OAG advertises airfare/analytics products, but public pages reviewed did not expose a complete fare-observation schema. Route, fare components, timestamps, and currency: `UNKNOWN`.
- India coverage: `UNKNOWN` without a data proposal or contract.
- Repeated collection and historical data: likely product-dependent, not publicly confirmed for APIx.
- Storage and derived-index rights: `UNKNOWN` and contract-dependent. OAG website terms state commercial use and copying of website content require a license; those website terms do not grant rights to the separate commercial data product.
- Classification: `APPROVED_WITH_LIMITATIONS` as a licensed-data lead; external commercial agreement required.

### 3. SerpApi Google Flights API

- Official API documentation: <https://serpapi.com/google-flights-api>
- Access: API key and paid/quota-based service.
- Technical fields: `AVAILABLE` in public response examples for origin/destination, dates, airline, flight number, travel class, itinerary, price, booking token, and price insights. Base fare, taxes, fees, and durable availability semantics: `UNKNOWN`.
- India coverage: query parameters accept IATA airports and country localization, but the public page does not independently guarantee the six APIx routes. Classification: `UNKNOWN` pending controlled authorized account test.
- Repeated collection: technically possible under quota; public documentation describes cache behavior and a one-hour cache expiry. Long-term storage and repeated statistical use: `UNKNOWN`.
- Source nature: the official page describes this as a Google Flights scraping API. This does not itself establish permission from Google, airlines, or agents for APIx retention/index publication.
- Statistical/index use: `UNKNOWN`; provider and underlying-source rights require contract review.
- Classification: `UNKNOWN`, not approved for implementation.

### 4. FlightAPI

- Official site/docs: <https://www.flightapi.io/>, <https://www.flightapi.io/documentation/>
- Access: API key, registration, paid plans; public site advertises a 20-call trial and paid credit/concurrency plans.
- Technical fields: `AVAILABLE` at product level for real-time one-way/round/multi-city flight prices and currency selection. Exact response fields, fare decomposition, flight identity, availability semantics, and date/search timestamp mapping: `UNKNOWN` until authorized documentation/account access.
- India coverage: site claims global airline/vendor coverage, but six APIx routes are `UNKNOWN` without an authorized test or provider confirmation.
- Repeated collection: technically plausible within credits/concurrency; exact rate limits and permitted search/storage model: `UNKNOWN`.
- Historical data: site advertises real-time and historical datasets for analytics at a high level, but the exact product and license are `UNKNOWN`.
- Statistical/index use: site markets aviation analytics/data-provider use, but this is not a contractual grant of derived-index rights.
- Classification: `APPROVED_WITH_LIMITATIONS` as a practical commercial lead; written license and field/India confirmation required.

### 5. Duffel Flights API

- Official documentation: <https://duffel.com/docs/guides/quick-start>
- Official agreement: <https://duffel.com/services-agreement>
- Access: registered account, dashboard token, verification for production.
- Technical fields: `AVAILABLE` for origin, destination, departure date, offer requests, slices, segments, airline, flight details, total amount, and total currency.
- India coverage: `UNKNOWN` until supplier/content availability is confirmed for each route.
- Repeated collection: constrained by fair-use and Search-to-Order controls.
- Storage/retention/statistical use: not clearly compatible. The agreement restricts metasearch and certain competitive uses, controls Supplier Data, and requires compliance with supplier rules. APIx’s statistical fare-index use therefore requires written authorization.
- Historical fares: `UNKNOWN`; quick-start documentation describes live offer search.
- Classification: `SOURCE_NOT_PERMITTED` for APIx without written authorization.

### 6. Amadeus Enterprise APIs

- Official current portal: <https://developers.amadeus.com/enterprise>
- Historical Self-Service page: <https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search>
- Access: Enterprise request/contact and agreement. The official developer portal states Self-Service was decommissioned on July 17, 2026.
- Technical fields: historical Flight Offers Search documentation described route/date/flight-offer fare data; current Enterprise product scope and exact fields require access.
- India coverage: `UNKNOWN` without an Enterprise proposal.
- Repeated collection, historical data, retention, and derived-index rights: `UNKNOWN` and agreement-dependent.
- Classification: `APPROVED_WITH_LIMITATIONS` as a commercial lead; Enterprise authorization required.

### 7. Sabre APIs

- Official developer portal: <https://developer.sabre.com/>
- Access: developer portal/product access and commercial travel-industry relationships; exact access terms for air shopping require onboarding.
- Technical fields: Sabre exposes air-search products at the developer-platform level, but the reviewed public pages did not provide a complete current schema usable to confirm APIx mappings.
- India coverage: `UNKNOWN`.
- Repeated collection, retention, statistical/index use, and historical fare availability: `UNKNOWN` and contract-dependent.
- Classification: `APPROVED_WITH_LIMITATIONS` as a licensed GDS lead; external agreement required.

### 8. Travelport TripServices Flights

- Official developer portal: <https://developer.travelport.com/>
- Official flights documentation entry: <https://developer.travelport.com/docs/flights>
- Access: sign-up/trial and commercial Travelport access; production use requires the provider relationship and applicable terms.
- Technical fields: official portal advertises air search, lowest fares, price confirmation, NDC/low-cost content, and 400+ airlines. Exact response fields for fare components, availability, and timestamps: `UNKNOWN` from the public landing page.
- India coverage: `UNKNOWN` without content confirmation.
- Repeated collection, retention, statistical/index rights, and historical fares: `UNKNOWN` and contract-dependent.
- Classification: `APPROVED_WITH_LIMITATIONS` as a licensed GDS lead; external agreement required.

### 9. TBO Air API

- Official site: <https://www.tbo.com/air-api>
- Official terms: <https://www.tbo.com/terms-and-conditions>
- Access: B2B/authorized travel-service relationship; the public API product page was not extractable enough to verify a complete API contract.
- Technical fields: TBO terms confirm flight-booking services, but route/date/fare/flight-number/total-fare API fields are `UNKNOWN` from public primary material reviewed.
- India coverage: commercially plausible for an India-based B2B provider, but not independently verified for the six routes.
- Repeated collection, storage, retention, and derived-index use: `UNKNOWN`; terms concern use of the service and prohibit reverse engineering, but do not grant APIx statistical rights.
- Classification: `APPROVED_WITH_LIMITATIONS` as a provider contact lead; written B2B/API agreement required.

### 10. Google Flights Search Partner Integration

- Official documentation: <https://developers.google.com/travel/flights>
- Access: airline/OTA partner onboarding, invite/selection context, and agreement. Official documentation states the partner specifications are confidential/proprietary and shared under NDA with select invite-only partners.
- Technical fields: `UNKNOWN` for APIx; documentation is a partner-integration specification rather than a public fare API.
- India coverage: `UNKNOWN` for a new non-airline/non-OTA partner.
- Repeated collection, storage, statistical/index use, and historical data: `UNKNOWN` and agreement-dependent.
- Classification: `SOURCE_NOT_USABLE` for APIx as an unapproved public API path.

### 11. IATA NDC / Direct Airline NDC

- Official IATA description: <https://www.iata.org/en/programs/airline-distribution/ndc/>
- Access: NDC is an open standard, not a single public fare API. Each airline or authorized intermediary controls access, credentials, commercial terms, and content rights.
- Technical fields: the standard is designed for rich air offers/orders; exact fields vary by airline implementation. Base/tax/fee/total and fare-family availability: `CONDITIONAL`.
- India coverage: `CONDITIONAL` and airline-specific. NDC does not itself establish access to Indian carriers.
- Repeated collection, retention, statistical/index rights, and historical data: `UNKNOWN` without a specific airline agreement.
- Classification: `APPROVED_WITH_LIMITATIONS` as an architecture path; select one airline and obtain explicit authorization.

### 12. OpenSky Network / Kaggle Public Datasets

- OpenSky official docs: <https://openskynetwork.github.io/opensky-api/>
- Kaggle official dataset docs/terms: <https://www.kaggle.com/docs/datasets>, <https://www.kaggle.com/terms>
- OpenSky technical fields: aircraft/ADS-B state vectors and flight identity, not commercial fares. Fare, taxes, total, availability: `NOT_AVAILABLE`. OpenSky documentation explicitly says it does not provide commercial flight data such as schedules/delays and offers research/non-commercial API use.
- Kaggle: a hosting/distribution platform; individual dataset licenses and provenance vary. Kaggle terms prohibit scraping/copying significant content and state that third-party content rights are the uploader’s responsibility. No unspecified airfare dataset can be treated as licensed APIx source data.
- Classification: `SOURCE_NOT_USABLE` for live airfare collection and `UNKNOWN` for any individual dataset until its original license/provenance is audited. Neither is suitable for this phase.

## Detailed Authorization Analysis

The strongest technical candidates are Skyscanner, FlightAPI, OAG, Travelport, Sabre, and a specific authorized airline NDC. None of their publicly reviewed pages grants APIx the complete combination of repeated search, raw response retention, statistical analysis, derived-index construction, and publication rights.

Skyscanner requires partnership approval. OAG and GDS/NDC providers require commercial agreements. FlightAPI advertises analytics use but its public material does not substitute for a license covering APIx retention and derived statistics. SerpApi explicitly describes a scraping intermediary, so technical access is not authorization from underlying sources. Duffel’s agreement has material restrictions for APIx’s intended use. OpenSky and Kaggle do not provide a suitable live fare source.

## India Coverage

No source’s public material independently verified all six APIx routes:

- DEL-BOM
- DEL-BLR
- BOM-BLR
- DEL-CCU
- BLR-HYD
- MAA-DEL

Route coverage must be confirmed in a provider proposal, authorized account, or contract. “Global coverage” marketing language is recorded as `UNKNOWN`, not `YES`.

## Fare Schema Comparison

Legend: `AVAILABLE` means the official public material explicitly describes it; `UNKNOWN` means it requires provider confirmation; `NOT_AVAILABLE` means the source does not provide it for this use.

| Candidate | Origin/destination | Travel date | Airline/flight | Fare class | Total/currency | Base/taxes/fees | Availability | Search timestamp | Raw retention | Derived index rights |
|---|---|---|---|---|---|---|---|---|---|---|
| Skyscanner Live Prices | AVAILABLE | AVAILABLE | AVAILABLE in itinerary/segments | UNKNOWN | AVAILABLE at result level | UNKNOWN | AVAILABLE/UNKNOWN by result semantics | API retrieval timestamp only | UNKNOWN | UNKNOWN/partner agreement |
| OAG Airfare | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Contract | Contract |
| SerpApi Google Flights | AVAILABLE | AVAILABLE | AVAILABLE | AVAILABLE travel class | AVAILABLE | UNKNOWN | UNKNOWN | API retrieval timestamp only | UNKNOWN | UNKNOWN |
| FlightAPI | AVAILABLE at product level | AVAILABLE at product level | UNKNOWN | UNKNOWN | AVAILABLE at product level | UNKNOWN | UNKNOWN | API retrieval timestamp only | UNKNOWN | UNKNOWN |
| Duffel | AVAILABLE | AVAILABLE | AVAILABLE | UNKNOWN | AVAILABLE | UNKNOWN | UNKNOWN | API retrieval timestamp only | Restricted/contract | Restricted/contract |
| Amadeus Enterprise | Historical product fit | Historical product fit | Historical product fit | UNKNOWN current | UNKNOWN current | UNKNOWN | UNKNOWN | API retrieval timestamp only | Contract | Contract |
| Sabre | UNKNOWN public schema | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Contract | Contract |
| Travelport | AVAILABLE at product level | UNKNOWN public schema | UNKNOWN | UNKNOWN | AVAILABLE at product level | UNKNOWN | UNKNOWN | API retrieval timestamp only | Contract | Contract |
| TBO Air API | UNKNOWN public schema | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Contract | Contract |
| Google Flights Search | Partner-only | Partner-only | Partner-only | Partner-only | Partner-only | Partner-only | Partner-only | Partner-only | NDA/agreement | NDA/agreement |
| IATA NDC | Conditional airline implementation | Conditional | Conditional | Conditional | Conditional | Conditional | Conditional | API retrieval timestamp only | Airline agreement | Airline agreement |
| OpenSky/Kaggle | NOT_AVAILABLE for fares | NOT_AVAILABLE | OpenSky identity only | NOT_AVAILABLE | NOT_AVAILABLE | NOT_AVAILABLE | NOT_AVAILABLE | OpenSky timestamps only | License-specific | Not suitable |

## Collection Feasibility

The six routes multiplied by five canonical advance windows require at least 30 planned searches per collection date, before retries, pagination, polling, or multiple sources. A provider must confirm quota, price/search ratio, concurrency, caching, and whether repeated searches for research/index construction are permitted.

No credentialed quota was available for measurement. Therefore request rates, price-per-search, daily quotas, and monthly cost remain `UNKNOWN` for all conditional commercial candidates. No live calls were made.

## Storage / Retention Analysis

Raw payload retention is an APIx audit requirement, but provider terms may restrict caching, redistribution, supplier data retention, or long-term storage. Public materials reviewed did not establish a safe general rule for any candidate. A future agreement must explicitly permit, or clearly not prohibit:

- retaining raw responses and provenance;
- retaining normalized observations;
- repeated historical comparisons;
- internal research and production analytics;
- publication of aggregated/derived index values.

Raw provider credentials, authorization headers, cookies, and tokens must never enter APIx payloads or request metadata.

## Statistical / Index Usage Analysis

The intended use is not ordinary flight booking or metasearch. APIx would repeatedly observe fares, retain provenance, calculate route-level statistics, construct a time-series index, and potentially publish derived statistics. This is a distinct contractual use case.

No reviewed public source clearly answered “YES” to all of those uses. Skyscanner, OAG, FlightAPI, Sabre, Travelport, TBO, Amadeus Enterprise, and airline NDC remain conditional on written authorization. Duffel is not acceptable without written permission because of explicit use restrictions. SerpApi is not approved because its technical output does not establish rights from the underlying flight-data sources.

## Legal / Contractual Risks

- Treating an API key as permission for retention or derived-index publication.
- Assuming global route coverage includes Indian domestic routes.
- Treating cached/search results as durable historical observations.
- Storing raw provider content when terms allow only transient display.
- Using supplier or airline data for benchmarking without supplier approval.
- Exceeding search-to-order, fair-use, concurrency, or rate limits.
- Publishing provider-derived values without attribution or license conditions.
- Relying on scraping APIs without authorization from the underlying source.
- Treating a user-uploaded public dataset as licensed for production use.

## Candidate Comparison Matrix

| Candidate | India domestic routes | Fare data | Repeated collection | Historical data | API access | Statistical use | Storage | Derived index | Legal confidence | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| Skyscanner | UNKNOWN | YES | CONDITIONAL | UNKNOWN | CONDITIONAL partner | UNKNOWN | UNKNOWN | UNKNOWN | MEDIUM | APPROVED_WITH_LIMITATIONS |
| OAG | UNKNOWN | CONDITIONAL | CONDITIONAL | CONDITIONAL | COMMERCIAL | UNKNOWN | CONTRACT | CONTRACT | MEDIUM | APPROVED_WITH_LIMITATIONS |
| SerpApi | UNKNOWN | YES | CONDITIONAL quota | UNKNOWN | PAID API | UNKNOWN | UNKNOWN | UNKNOWN | LOW | UNKNOWN |
| FlightAPI | UNKNOWN | YES product-level | CONDITIONAL quota | CONDITIONAL marketing claim | PAID API | UNKNOWN | UNKNOWN | UNKNOWN | LOW/MEDIUM | APPROVED_WITH_LIMITATIONS |
| Duffel | UNKNOWN | YES | CONDITIONAL | UNKNOWN | ACCOUNT/API | NO/RESTRICTED without written approval | RESTRICTED | RESTRICTED | HIGH | SOURCE_NOT_PERMITTED |
| Amadeus Enterprise | UNKNOWN | CONDITIONAL | CONDITIONAL | UNKNOWN | ENTERPRISE | CONTRACT | CONTRACT | CONTRACT | MEDIUM | APPROVED_WITH_LIMITATIONS |
| Sabre | UNKNOWN | CONDITIONAL | CONDITIONAL | UNKNOWN | COMMERCIAL | CONTRACT | CONTRACT | CONTRACT | MEDIUM | APPROVED_WITH_LIMITATIONS |
| Travelport | UNKNOWN | YES product-level | CONDITIONAL | UNKNOWN | TRIAL/COMMERCIAL | CONTRACT | CONTRACT | CONTRACT | MEDIUM | APPROVED_WITH_LIMITATIONS |
| TBO Air API | UNKNOWN | UNKNOWN public schema | UNKNOWN | UNKNOWN | B2B | CONTRACT | CONTRACT | CONTRACT | LOW/MEDIUM | APPROVED_WITH_LIMITATIONS |
| Google Flights Search | UNKNOWN | CONDITIONAL | CONDITIONAL | UNKNOWN | INVITE/NDA | UNKNOWN | NDA | NDA | HIGH | SOURCE_NOT_USABLE |
| IATA NDC | CONDITIONAL | CONDITIONAL | CONDITIONAL | UNKNOWN | AIRLINE-SPECIFIC | AIRLINE CONTRACT | AIRLINE CONTRACT | AIRLINE CONTRACT | MEDIUM | APPROVED_WITH_LIMITATIONS |
| OpenSky/Kaggle | NO fare source | NO/variable | N/A | OpenSky research only / dataset-specific | API/platform | Not suitable | License-specific | Not suitable | HIGH for exclusion | SOURCE_NOT_USABLE |

## Recommended Source

### Best technically suitable source

**Skyscanner Flights Live Prices API**, because the official documentation describes a create/poll live-price workflow, route/date search, bookable itineraries, legs, segments, carriers, agents, and result prices.

### Best legally/contractually suitable source

No source is currently verified as fully suitable. The strongest legitimate paths are a written Skyscanner partner agreement, a licensed OAG airfare product, or a specific airline NDC agreement that explicitly permits statistical retention and derived-index publication.

### Best practical source

**Skyscanner, conditionally**, if its Partnerships team confirms Indian domestic coverage and grants APIx permission for repeated research/production collection, raw retention, historical analysis, and derived index publication. **FlightAPI** is a secondary commercial lead but requires the same written confirmation and more public schema detail.

## Conditions Required Before Implementation

Obtain written confirmation covering:

1. APIx’s research and eventual production use.
2. Indian domestic route coverage for the six representative routes.
3. T+1/T+7/T+15/T+30/T+45 repeated search cadence.
4. Raw response and normalized observation retention period.
5. Internal analytics, benchmarking, and historical time-series use.
6. Publication of aggregated/derived Airfare Price Index values.
7. Attribution and display requirements.
8. Quotas, pricing, concurrency, polling, caching, and retry limits.
9. Fare currency and tax/fee semantics.
10. Provider and supplier restrictions for raw and derived data.
11. Authorized API credentials delivered through environment/configuration only.

## Sources / Official Documentation

- Skyscanner Flights Live Prices overview: <https://developers.skyscanner.net/docs/flights-live-prices/overview>
- Skyscanner authentication: <https://developers.skyscanner.net/docs/getting-started/authentication>
- OAG data catalogue: <https://www.oag.com/flight-data>
- OAG website/service terms: <https://www.oag.com/terms-of-use>
- SerpApi Google Flights API: <https://serpapi.com/google-flights-api>
- FlightAPI documentation: <https://www.flightapi.io/documentation/>
- FlightAPI terms link: <https://www.flightapi.io/terms-and-privacy/>
- Duffel Flights guide: <https://duffel.com/docs/guides/quick-start>
- Duffel Services Agreement: <https://duffel.com/services-agreement>
- Amadeus Enterprise portal: <https://developers.amadeus.com/enterprise>
- Sabre developer portal: <https://developer.sabre.com/>
- Travelport developer portal: <https://developer.travelport.com/>
- TBO terms: <https://www.tbo.com/terms-and-conditions>
- Google Flights Search partner documentation: <https://developers.google.com/travel/flights>
- IATA NDC: <https://www.iata.org/en/programs/airline-distribution/ndc/>
- OpenSky API documentation: <https://openskynetwork.github.io/opensky-api/>
- Kaggle dataset documentation and terms: <https://www.kaggle.com/docs/datasets>, <https://www.kaggle.com/terms>

## Final Decision

**PHASE 9B STATUS: SOURCE IDENTIFIED — EXTERNAL AUTHORIZATION REQUIRED**

Skyscanner is the best technical candidate, but APIx must obtain partner approval and explicit written data-use authorization before implementation. Until that authorization exists, Phase 9B must not create an adapter, make a credentialed request, create a collection run, or persist airfare observations.
