from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.routes import RouteRepository


class RouteService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = RouteRepository(session)

    async def list_routes(self, page: int = 1, page_size: int = 50):
        return await self.repository.list(page=page, page_size=page_size)

    async def get_route(self, route_code: str):
        return await self.repository.get_by_code(route_code)
