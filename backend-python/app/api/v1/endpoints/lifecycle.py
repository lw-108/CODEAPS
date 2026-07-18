from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.api import deps
from app.services.lifecycle_service import LifecycleService
from app.services.report_generator import ReportGenerator
from app.services.validator_orchestrator import ValidationOrchestrator
from app.models.user import User
from app.models.submission import Submission
from app.models.module import Module

router = APIRouter()


@router.get("/progress/{project_id}")
def get_project_progress(
    project_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Get full project progress breakdown (project + modules + milestones)"""
    service = LifecycleService(db)
    return service.compute_project_progress(project_id)


@router.get("/progress/module/{module_id}")
def get_module_progress(
    module_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Get progress for a single module"""
    service = LifecycleService(db)
    return service.compute_module_progress(module_id)


@router.get("/risks/{project_id}")
def get_project_risks(
    project_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Get active risk indicators for a project"""
    service = LifecycleService(db)
    risks = service.detect_risks(project_id)
    return {
        "project_id": project_id,
        "total_risks": len(risks),
        "critical": sum(1 for r in risks if r["severity"] == "critical"),
        "warnings": sum(1 for r in risks if r["severity"] == "warning"),
        "items": risks,
    }


@router.get("/report/{project_id}")
def get_project_report(
    project_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Generate and return a full analytical report for the project"""
    generator = ReportGenerator(db)
    return generator.generate_project_report(project_id)


@router.get("/report/module/{module_id}")
def get_module_report(
    module_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Generate a drill-down report for a single module"""
    generator = ReportGenerator(db)
    return generator.generate_module_report(module_id)


@router.post("/validate/{module_id}")
async def validate_module(
    module_id: int,
    code: str = Body(..., embed=True),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """
    Trigger LLM validation of code against a module's requirements.
    Creates a submission and runs the full validation pipeline.
    Uses the local Ollama service (fully offline).
    """
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    # Create a submission record
    submission = Submission(
        user_id=current_user.id,
        module_id=module_id,
        content=code,
        status="validating",
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    # Run full validation pipeline
    orchestrator = ValidationOrchestrator(db)
    try:
        results = await orchestrator.run_full_validation(submission.id)
        submission.status = "validated"
        db.commit()
        return {
            "submission_id": submission.id,
            "module_id": module_id,
            "status": "validated",
            "results": results,
        }
    except Exception as e:
        submission.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")
