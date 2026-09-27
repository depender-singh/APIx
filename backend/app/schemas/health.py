from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    app: str | None = None
    environment: str | None = None
    data_mode: str | None = None
    service: str | None = None
    mode: str | None = None
