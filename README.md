# APIx — Automated Airfare Price Index

APIx is a dark-first analytics dashboard for Indian domestic airfare intelligence. The workspace includes both the existing mock/demo frontend and a live FastAPI backend with seeded synthetic development data.

## Current architecture

- Frontend: React + Vite + TypeScript
- Styling: Tailwind CSS
- Package manager: npm
- Data mode: `api` by default; `mock` only when explicitly selected
- Backend: FastAPI + PostgreSQL + Alembic in `backend/`
- Data engine: generated mock observations in `src/data/mockEngine.ts`
- Live API client: `src/services/api.ts` and `src/services/dataService.ts`

## Source boundaries

- Airfare observations feed the APIx calculation.
- DGCA benchmark records are isolated for back-testing only.
- DGCA traffic/reference statistics, aggregate airfare references, and route-level airfare benchmarks are separate classifications. Only verified route-level airfare observations can support APIx back-testing.
- MoSPI/eSankhyiki indicators provide CPI and macroeconomic context only; CPI is not an airfare benchmark.
- Synthetic records are development/demo data and are never labelled official.

## Install

```bash
npm install
```

## Mock mode

Use the existing mock/demo data without running the backend:

```bash
VITE_DATA_MODE=mock
npm run dev
```

## API mode (default)

Run the backend first, then start the frontend in API mode:

```bash
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then from the workspace root:

```bash
$env:VITE_DATA_MODE='api'
$env:VITE_API_BASE_URL='http://localhost:8000'
npm run dev -- --host 0.0.0.0 --port 4173
```

API mode never falls back to demo data. Backend/provider errors, unavailable sources, and insufficient-data results remain visible as those states. Keep `FLIGHTAPI_API_KEY` and `FLIGHTAPI_BASE_URL` server-side only; they are never sent to Vite or stored in PostgreSQL.

## Backend endpoints

The backend serves persisted PostgreSQL data. The current database contains six synthetic development observations and one real FlightAPI observation; synthetic rows remain explicitly identified as synthetic and total-only provider data retains null fare components.

- `GET /api/v1/health`
- `GET /api/v1/routes`
- `GET /api/v1/airlines`
- `GET /api/v1/observations`
- `GET /api/v1/airfare-index/latest`
- `GET /api/v1/airfare-index`
- `GET /api/v1/data-quality`
- `GET /api/v1/indicators`
- `GET /api/v1/indicators/mospi`
- `GET /api/v1/indicators/mospi/cpi`
- `GET /api/v1/indicators/mospi/inflation`
- `POST /api/v1/indicators/import`

## DGCA benchmark status

The current PostgreSQL database contains no verified public route-level monthly DGCA average-airfare observations. The benchmark API therefore returns `status: source_not_imported`, and back-test runs return `insufficient_data` without fabricated charts or percentages.

Publicly reported aggregate context, including an approximately 20.5% airfare increase across 72 domestic sectors between March 2025 and June 2026, is retained only as an aggregate reference. It is not converted into six-route benchmark observations and cannot be used as a 30-day APIx back-test.

Traffic/reference statistics, aggregate airfare references, and route-level airfare benchmarks must not be mixed. Synthetic/demo values remain explicitly synthetic and are never labelled DGCA.

Future verified DGCA route-level data can be loaded through `POST /api/v1/benchmarks/import` with route codes, dataset metadata, source URL, retrieval time, and provenance. The existing benchmark repository, normalization, back-testing service, and UI require no architectural replacement.

## Build, lint, typecheck and tests

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

Backend tests:

```bash
cd backend
.\.venv\Scripts\python.exe -m pytest
```

## Notes

- The current backend seed is synthetic development data for local integration testing and is not official airfare data.
- No official MoSPI/eSankhyiki dataset is currently imported. API mode reports `source_not_imported` rather than showing fabricated CPI values.
- MoSPI imports require verified records with source URL, retrieval timestamp, dataset metadata, and official organization/source fields. The importer is idempotent.
- Mock mode remains fully supported and should continue to work without FastAPI.
- The frontend now uses `src/services/dataService.ts` as the shared adapter between mock and API data sources for connected pages.
