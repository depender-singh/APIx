# Phase 9B Source Feasibility Report

## Decision

**SOURCE IDENTIFIED — EXTERNAL AUTHORIZATION REQUIRED**

Phase 9B-1 separately verified FlightAPI as a stronger self-serve technical candidate with an explicit paid-subscriber data license, but India route coverage and APIx-specific derived-index use still require written confirmation. Phase 9A is preserved. No source-specific collector, live request, or airfare rows were added. See [PHASE_9B_FLIGHTAPI.md](PHASE_9B_FLIGHTAPI.md) and [PHASE_9B_SOURCE_RESEARCH.md](PHASE_9B_SOURCE_RESEARCH.md) for the detailed analysis.

## Candidate 1: Amadeus Self-Service

- Source: Amadeus for Developers Self-Service
- Type: authorized travel API, intended to expose flight offers
- Official URL: <https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search>
- Intended access method: official API with account credentials
- Technical fit: the historical Flight Offers Search product was designed for origin, destination, departure date, and flight-offer/fare data.
- Current status: **not currently usable through the verified Self-Service path**. The official developer portal states that the Self-Service portal was decommissioned on 17 July 2026 and directs users to the Enterprise API Portal/contact flow.
- Permission status: Enterprise access would require a separate request, agreement, and credentials. No such APIx authorization or credentials are present.
- Decision: `SOURCE_NOT_USABLE`

No endpoint was called and no undocumented endpoint was inferred.

## Candidate 2: Duffel Flights API

- Source: Duffel Platform / Flights API
- Type: authorized flight-offer API
- Official documentation: <https://duffel.com/docs/guides/quick-start>
- Official agreement: <https://duffel.com/services-agreement>
- Access method: registered Duffel account and dashboard-created access token; the official guide states that test access requires signing up and creating a test access token.
- Technical fit: the official guide documents offer requests with IATA origin/destination and departure date. Returned offers contain slices and segments, including airline and flight information; offer totals expose `total_currency` and `total_amount`.
- Route/date coverage: technically suitable for a controlled request such as an IATA route and future travel date, subject to supplier/content availability.
- Fare coverage: total fare is documented. A source-specific parser would still need to verify the exact availability, fare-family, fee, and component semantics before mapping them into APIx.
- Authentication: account access token required. No APIx credential is available and no credential was requested or stored.
- Permission/status limitation: the current Services Agreement requires use according to Duffel documentation, imposes fair-use/search-to-order controls, controls Supplier Data use, and restricts access or use to build a service that competes with Duffel. The agreement also restricts metasearch use. APIx is a statistical airfare-analysis and index platform, so using Supplier Data for this purpose cannot be treated as clearly permitted without written confirmation from Duffel and applicable supplier permissions.
- Rate limits: the agreement documents fair-use and Search-to-Order controls rather than giving APIx a verified public rate limit for this investigation.
- Decision: `SOURCE_NOT_PERMITTED` without explicit written authorization for APIx's statistical use.

No API call was made. No browser traffic, private endpoint, or access-control mechanism was used.

## Why No Collector Was Implemented

Phase 9B requires a legitimate permitted source before source-specific code is added. Implementing either candidate now would require assuming authorization that has not been verified. APIx must not scrape airline or OTA websites, reverse-engineer private APIs, bypass controls, or use a provider agreement outside its permitted purpose.

The existing `FareSourceAdapter`, `CollectionRequest`, raw observation layer, collection jobs/runs, provenance, and deterministic mock adapter remain ready for Phase 9B once APIx obtains written provider authorization and credentials for one selected fare API.

## Required Next Input

To continue Phase 9B, obtain one of:

1. Written provider authorization and credentials for Duffel's Flights API that explicitly permits APIx's statistical fare collection and retention; or
2. An Amadeus Enterprise agreement/API credential with written permission for the same use; or
3. Another licensed airfare feed whose contract explicitly permits this use and provides route/date/fare data.

Until then, no live collection should be attempted and no production airfare rows should be created.
