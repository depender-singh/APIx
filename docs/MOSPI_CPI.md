# Official MoSPI CPI Integration

APIx uses the official eSankhyiki CPI API at `https://api.mospi.gov.in/api/cpi/getCPIData`.

The controlled APIx slice is:

- Product: Consumer Price Index (`CPI`)
- Base year: `2024 = 100`
- Series: `Current`
- Level: `Group`
- State: `All India` (`state_code=1`)
- Sector: `Combined` (`sector_code=3`)
- CPI General identifier: `division=CPI (General)` (`division_code=0`)
- Frequency: monthly

The importer requires an explicit `start_period` and `end_period`, limits requests to 24 months, sends the verified dimension filters, follows API pagination, and never downloads the full catalogue. Example request:

```json
{
  "base_year": 2024,
  "series": "Current",
  "level": "Group",
  "state_code": 1,
  "sector_code": 3,
  "division_code": 0,
  "start_period": "2025-01-01",
  "end_period": "2026-07-01",
  "page_size": 100
}
```

Send this body to `POST /api/v1/indicators/import`. The response reports fetched, accepted, rejected, inserted, skipped-duplicate, and page counts. Repeating the same request is idempotent.

MoSPI `index` is stored as `index_value`; MoSPI `inflation` is stored separately as `inflation_value` and may be null. APIx does not substitute one for the other. Each row retains the exact request URL, request parameters, retrieval timestamp, source dimensions, dataset identifier, official organization, and official flag.

API mode reads PostgreSQL-backed official rows and reports `source_not_imported` or `insufficient_data` explicitly. Mock mode remains deterministic and is labelled `Synthetic Demo`. APIx/CPI comparison uses normalized aligned monthly index series; it does not compare raw index levels as if they shared a base. The current imported CPI slice has no aligned APIx monthly index observations, so the comparison reports `insufficient_data` until real APIx history is available.

Only controlled imports are supported. Revision/release metadata is not invented when it is absent from the official API.
