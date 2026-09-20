from fastapi import APIRouter

from app.api.routers import analytics, custom_fields, lookups, roles, teams, tickets

api_router = APIRouter(prefix="/api")
api_router.include_router(tickets.router)
api_router.include_router(analytics.router)
api_router.include_router(lookups.router)
api_router.include_router(roles.router)
api_router.include_router(teams.router)
api_router.include_router(custom_fields.router)
