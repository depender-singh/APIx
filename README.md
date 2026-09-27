<div align="center">

# ✈️ APIx

### Automated Airfare Price Index

**Measuring · Analyzing · Benchmarking Indian Domestic Airfare**

<br/>

[![React](https://img.shields.io/badge/React-TypeScript-7C3AED?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-6366F1?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4F46E5?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2563EB?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Frontend-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-Backend-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)

<br/>

**A full-stack aviation analytics platform for transforming airfare observations into a structured Airfare Price Index and supporting route, airline, historical, and benchmark intelligence.**

</div>

---

## 🚀 What is APIx?

Airfare prices change continuously and are influenced by multiple factors including:

- Route demand
- Travel dates
- Booking lead time
- Airline availability
- Seasonality
- Festivals and travel periods
- Market conditions
- Broader inflationary trends

A single ticket price cannot represent the movement of an entire route or market.

**APIx** is designed to transform individual airfare observations into a structured analytical system that can collect, validate, clean, aggregate, benchmark, and visualize airfare movements.

The platform combines:

> **Data Collection → Data Quality → Statistical Indexing → Analytics → Benchmarking**

into a single full-stack aviation intelligence platform.

---

## 🎯 Problem

Airfare information is highly dynamic and fragmented.

Building a meaningful airfare index requires more than simply collecting ticket prices.

The system needs to handle:

1. Collecting airfare observations
2. Validating incoming data
3. Cleaning inconsistent observations
4. Preserving data provenance
5. Handling incomplete observations
6. Applying eligibility rules
7. Aggregating route-level movements
8. Applying configurable index methodology
9. Comparing results against available benchmarks
10. Presenting the resulting intelligence clearly

APIx is built around this complete **data-to-index pipeline**.

---

## 💡 Solution

APIx separates the platform into distinct processing layers:

```text
┌───────────────────────────────────────────────┐
│                 DATA SOURCES                  │
│                                               │
│  FlightAPI / Flight Providers                 │
│  MoSPI / eSankhyiki                           │
│  Verified Benchmark References                │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│              COLLECTION PIPELINE              │
│                                               │
│  Requests → Parsing → Provenance → Raw Data  │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│               DATA QUALITY LAYER              │
│                                               │
│  Validation → Cleaning → Outlier Handling    │
│  Eligibility Checks → Quality Metadata       │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                  INDEX ENGINE                 │
│                                               │
│  Route Observations                           │
│  Configurable Weights                         │
│  Reference Period                             │
│  Methodology                                  │
│  Index Generation                             │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│           ANALYTICS & BENCHMARKING            │
│                                               │
│  Historical Trends                            │
│  Route Analysis                               │
│  Airline Analysis                             │
│  Back-testing                                 │
│  CPI Context                                  │
│  Data Quality                                 │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                  APIx DASHBOARD               │
│                                               │
│  Overview · Routes · Airlines · Index         │
│  Analytics · Data Explorer · Administration   │
└───────────────────────────────────────────────┘
