from fastapi import APIRouter

from app.api.routers import analytics, lookups, tickets

api_router = APIRouter(prefix="/api")
api_router.include_router(tickets.router)
api_router.include_router(analytics.router)
api_router.include_router(lookups.router)
