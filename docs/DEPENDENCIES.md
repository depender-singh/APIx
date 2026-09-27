# Dependency Manifest

This document records the dependency versions currently detected in the workspace from `package.json` and `package-lock.json`.

## Runtime

- Node.js: 24.15.0 (detected in the current environment)
- npm: 11.13.0 (detected in the current environment)

## Frontend

| Package | Installed Version | Required By | Compatibility Notes |
| --- | --- | --- | --- |
| React | ^18.3.1 | UI runtime | Current app uses React 18 with Vite |
| React DOM | ^18.3.1 | UI runtime | Matches React version |
| TypeScript | ^5.5.3 | Type checking and transpilation | Compatible with current Vite and TypeScript ESLint setup |
| Vite | ^5.4.2 | Build/dev tooling | Current build tool in use |
| @vitejs/plugin-react | ^4.3.1 | React integration for Vite | Compatible with Vite 5 |
| Tailwind CSS | ^3.4.1 | Styling | Current design system uses Tailwind 3 configuration |
| PostCSS | ^8.4.35 | CSS processing | Used with Tailwind |
| Autoprefixer | ^10.4.18 | CSS compatibility | Used with Tailwind/PostCSS |
| ESLint | ^9.9.1 | Linting | Configured via `eslint.config.js` |
| @eslint/js | ^9.9.1 | ESLint base config | Used by the existing config |
| typescript-eslint | ^8.3.0 | TypeScript-aware ESLint support | Compatible with TypeScript 5.5 |
| eslint-plugin-react-hooks | ^5.1.0-rc.0 | React hook linting | Current config uses the recommended rules |
| eslint-plugin-react-refresh | ^0.4.11 | Vite React refresh rules | Current config uses the recommended rules |
| globals | ^15.9.0 | ESLint global definitions | Used by `eslint.config.js` |
| lucide-react | ^0.446.0 | Icon set | UI-only dependency |
| @types/react | ^18.3.5 | Type definitions | Matches React 18 |
| @types/react-dom | ^18.3.0 | Type definitions | Matches React 18 |
| @supabase/supabase-js | ^2.57.4 | Client-side Supabase access | Present in the project, but not yet wired into live data flows |

## Backend

- No backend framework detected in the workspace (`FastAPI`, `Express`, `Next.js`, `Python`, `Flask`, `Django`, `SQLAlchemy`, etc. were not found in the current repository inspection).

## Database

- PostgreSQL: not configured in the current workspace
- Supabase: client library present, but no persistence layer or schema/migrations were found

## Routing

- Router library: not detected
- Current navigation is implemented with local page state in `src/App.tsx`

## Charts

- No charting library was detected as a direct declared dependency in `package.json`
- Chart components appear to be custom React components under `src/components/charts/`

## Testing

- Test framework: not configured in the current workspace
- No test script was found in `package.json`

## Data mode

- Current data mode is `mock` / demo data generation via `src/data/mockEngine.ts`
- No live data source adapter was found during inspection

## Notes

- The dependency set is already internally consistent for a Vite + React + TypeScript front-end.
- No dependency upgrades were applied during this audit.
- The workspace currently lacks a documented Node.js engine requirement in `package.json`, so runtime compatibility should be explicitly managed by the team.
