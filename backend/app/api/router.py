from fastapi import APIRouter

from app.api.routers import analytics, api_tokens, custom_fields, lookups, roles, saved_views, tags, teams, tickets

api_router = APIRouter(prefix="/api")
api_router.include_router(tickets.router)
api_router.include_router(analytics.router)
api_router.include_router(lookups.router)
api_router.include_router(roles.router)
api_router.include_router(teams.router)
api_router.include_router(custom_fields.router)
api_router.include_router(tags.router)
api_router.include_router(saved_views.router)
api_router.include_router(api_tokens.router)
