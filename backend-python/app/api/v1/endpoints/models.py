from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Body
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from ai_engine.model_manager import ModelManager
from app.services.validator_orchestrator import ValidationOrchestrator
from typing import Dict, Any, List, Optional

router = APIRouter()
model_manager = ModelManager()

@router.get("/health")
async def get_model_health():
    """Check AI Engine and Model Provider health"""
    return await model_manager.check_health()

@router.get("/registry")
async def get_model_registry():
    """Get available models and their hardware requirements"""
    return model_manager.MODEL_REGISTRY

@router.post("/generate")
async def generate_ai_response(
    prompt: str = Body(..., embed=True),
    model: Optional[str] = Body(None, embed=True),
    system_prompt: Optional[str] = Body(None, embed=True)
):
    """Generate a reasoned response from the local AI engine"""
    try:
        response = await model_manager.generate(prompt, model=model, system_prompt=system_prompt)
        return {"response": response, "model": model or "deepseek-coder:6.7b"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze")
async def analyze_code_quality(
    content: str = Body(..., embed=True),
    db: Session = Depends(deps.get_db)
):
    """Perform a one-off code quality audit (logic, style, coverage)"""
    try:
        orchestrator = ValidationOrchestrator(db)
        # Use a dummy or temporary ID if needed, or modify run_full_validation to take content
        # For now, we perform the 4-stage validation and return results
        result = await orchestrator.run_ad_hoc_analysis(content)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pull/{model_name}")
async def pull_model(model_name: str, background_tasks: BackgroundTasks):
    """Trigger a model pull from the provider (Background)"""
    # This just initiates. Progress is streamed via WebSocket 'model-pull-progress'
    background_tasks.add_task(model_manager.pull_model, model_name)
    return {"status": "started", "model": model_name}

@router.post("/preload/{model_name}")
async def preload_model(model_name: str):
    """Warm up a model for faster inference"""
    await model_manager.preload_model(model_name)
    return {"status": "preloaded", "model": model_name}
