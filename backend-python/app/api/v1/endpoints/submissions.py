from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Body
from sqlalchemy.orm import Session
from app.api import deps
from app.models.submission import Submission
from app.models.user import User
from app.services.validator_orchestrator import ValidationOrchestrator
from app.services.gamification_service import GamificationService
from typing import Dict, Any

router = APIRouter()

@router.post("/")
async def create_submission(
    background_tasks: BackgroundTasks,
    module_id: int = Body(..., embed=True),
    content: str = Body(..., embed=True),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Submit code for validation and storage"""
    
    # 1. Persist Submission
    submission = Submission(
        user_id=current_user.id,
        module_id=module_id,
        content=content,
        status="processing"
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    # 2. Trigger AI Validation (Background)
    orchestrator = ValidationOrchestrator(db)
    background_tasks.add_task(orchestrator.run_full_validation, submission.id)
    
    return {
        "status": "submitted",
        "submission_id": submission.id,
        "message": "Validation pipeline initiated in background."
    }

@router.get("/{id}/xp")
def get_submission_xp(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Calculate and return XP for a specific submission"""
    gamification = GamificationService(db)
    return gamification.process_submission_xp(id)

@router.get("/{id}")
def get_submission_status(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Get status and results of a submission"""
    submission = db.query(Submission).get(id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    return {
        "id": submission.id,
        "status": submission.status,
        "submitted_at": submission.submitted_at
    }
