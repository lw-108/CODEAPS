from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.models.milestone import Milestone
from app.schemas.milestone import (
    Milestone as MilestoneSchema,
    MilestoneCreate,
    MilestoneUpdate,
)
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=List[MilestoneSchema])
def list_milestones(
    project_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """List all milestones for a project"""
    milestones = (
        db.query(Milestone)
        .filter(Milestone.project_id == project_id)
        .order_by(Milestone.order_index)
        .all()
    )
    return milestones


@router.post("/", response_model=MilestoneSchema)
def create_milestone(
    *,
    db: Session = Depends(deps.get_db),
    milestone_in: MilestoneCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create a new milestone"""
    milestone = Milestone(
        project_id=milestone_in.project_id,
        title=milestone_in.title,
        description=milestone_in.description,
        target_date=milestone_in.target_date,
        order_index=milestone_in.order_index or 0,
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone


@router.put("/{milestone_id}", response_model=MilestoneSchema)
def update_milestone(
    *,
    db: Session = Depends(deps.get_db),
    milestone_id: int,
    milestone_in: MilestoneUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update a milestone"""
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    update_data = milestone_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(milestone, field, value)

    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone


@router.delete("/{milestone_id}")
def delete_milestone(
    *,
    db: Session = Depends(deps.get_db),
    milestone_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Delete a milestone"""
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    db.delete(milestone)
    db.commit()
    return {"status": "deleted", "id": milestone_id}
