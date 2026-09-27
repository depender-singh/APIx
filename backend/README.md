# APIx backend foundation

This directory contains the initial FastAPI + PostgreSQL backend foundation for APIx.

## Overview

- FastAPI application entrypoint in `app/main.py`
- Pydantic-based configuration in `app/core/config.py`
- SQLAlchemy database foundation in `app/core/database.py`
- Domain models in `app/models/`
- API schemas in `app/schemas/`
- Repositories and services in `app/repositories/` and `app/services/`
- API endpoints under `app/api/v1/endpoints/`
- Alembic migration scaffold in `alembic/`

## Local development

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Notes

- The frontend remains in mock mode by default and is intentionally left untouched.
- PostgreSQL is prepared as the long-term persistence layer, but the current backend foundation is designed to bootstrap cleanly without requiring a live database immediately.
- API endpoints currently expose structured foundation responses and will be wired to real repositories/services in later phases.
