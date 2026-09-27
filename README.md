# APIx — Automated Airfare Price Index

> **A data-driven platform for measuring, analyzing, and benchmarking Indian domestic airfare movements.**

APIx is a full-stack airfare analytics platform designed to transform flight-fare observations into a structured **Airfare Price Index** and supporting intelligence.

The platform combines route-level airfare observations, data-quality processing, statistical index computation, benchmark/back-testing workflows, and macroeconomic context into a single analytics workspace.

---

## 🚀 What is APIx?

Airfare prices change continuously and are influenced by factors such as:

- route demand
- travel dates
- booking lead time
- airline availability
- seasonality
- festivals and travel periods
- market conditions
- broader inflationary trends

APIx is designed to provide a structured way to observe these movements rather than treating individual ticket prices as isolated values.

The system provides:

- Airfare Price Index calculations
- Route-level analysis
- Airline-level analysis
- Historical airfare analysis
- Lead-time analysis
- Fare composition analysis
- Availability analysis
- Data-quality monitoring
- Benchmark and back-testing workflows
- CPI/inflation context
- Administrative controls for collection and methodology
- API-based backend services

---

# 🎯 Problem

Airfare information is highly dynamic and fragmented.

A single flight price does not represent the movement of an entire route or market. Building a meaningful airfare index requires a process for:

1. collecting observations,
2. validating and cleaning data,
3. preserving provenance,
4. handling incomplete observations,
5. aggregating route-level movements,
6. applying configurable methodology,
7. comparing the resulting index against verified benchmarks.

APIx is built around this complete data-to-index pipeline.

---

# 💡 Solution

APIx separates the system into distinct layers:

```text
                 ┌─────────────────────────┐
                 │      Data Sources       │
                 │                         │
                 │ FlightAPI / Providers   │
                 │ MoSPI / eSankhyiki      │
                 │ Verified benchmarks     │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │   Collection Pipeline   │
                 │                         │
                 │ Requests                │
                 │ Parsing                 │
                 │ Provenance              │
                 │ Raw observations        │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Data Quality Layer      │
                 │                         │
                 │ Validation              │
                 │ Cleaning                │
                 │ Outlier handling        │
                 │ Eligibility checks      │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │    Index Engine         │
                 │                         │
                 │ Route observations      │
                 │ Configurable weights    │
                 │ Methodology             │
                 │ Index generation        │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │ Analytics & Benchmarking│
                 │                         │
                 │ Historical trends       │
                 │ Back-testing            │
                 │ CPI context             │
                 │ Data quality            │
                 └────────────┬────────────┘
                              │
                              ▼
                 ┌─────────────────────────┐
                 │     APIx Dashboard      │
                 │                         │
                 │ Routes                  │
                 │ Airlines                │
                 │ Index                   │
                 │ Analytics               │
                 │ Administration          │
                 └─────────────────────────┘