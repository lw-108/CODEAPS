from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.services.analytics_service import AnalyticsService
from app.services.analytics_engine import AnalyticsEngine
from app.models.user import User
from typing import Dict, Any, List

router = APIRouter()

@router.get("/progress/{project_id}")
def get_progress(
    project_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Get project progress analytics"""
    analytics = AnalyticsService(db)
    return analytics.get_project_progress(project_id)

@router.get("/complexity-trend/{project_id}")
def get_complexity_trend(
    project_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[Dict[str, Any]]:
    """Get project complexity history"""
    analytics = AnalyticsService(db)
    return analytics.get_complexity_trend(project_id)

@router.get("/risks/{project_id}")
def get_risks(
    project_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[str]:
    """Get detected project risks"""
    analytics = AnalyticsService(db)
    return analytics.get_risk_detection(project_id)

@router.get("/user/progression")
def get_user_progression(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Get current user's skill progression across all projects"""
    engine = AnalyticsEngine(db)
    return engine.get_user_progression(current_user.id)

@router.get("/user/skills/gaps")
def get_skill_gaps(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[Dict[str, Any]]:
    """Get AI-identified skill gaps and recommendations"""
    engine = AnalyticsEngine(db)
    return engine.perform_skill_gap_analysis(current_user.id)
