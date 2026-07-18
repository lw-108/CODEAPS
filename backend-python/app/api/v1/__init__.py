from fastapi import APIRouter
from app.api.v1.endpoints import (
    ai_generator, analytics, auth, execution, modules, projects, 
    requirements, websocket, models, submissions, ollama, analysis,
    milestones, lifecycle
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(modules.router, prefix="/modules", tags=["modules"])
api_router.include_router(requirements.router, prefix="/requirements", tags=["requirements"])
api_router.include_router(milestones.router, prefix="/milestones", tags=["milestones"])
api_router.include_router(lifecycle.router, prefix="/lifecycle", tags=["lifecycle"])
api_router.include_router(ai_generator.router, prefix="/ai", tags=["ai"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(execution.router, prefix="/execution", tags=["execution"])
api_router.include_router(models.router, prefix="/models", tags=["models"])
api_router.include_router(ollama.router, prefix="/ollama", tags=["ollama"])
api_router.include_router(submissions.router, prefix="/submissions", tags=["submissions"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(websocket.router, tags=["websocket"])
