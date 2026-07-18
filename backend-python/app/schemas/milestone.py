from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MilestoneBase(BaseModel):
    title: str
    description: Optional[str] = None
    target_date: Optional[datetime] = None
    order_index: Optional[int] = 0


class MilestoneCreate(MilestoneBase):
    project_id: int


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[datetime] = None
    status: Optional[str] = None
    progress_pct: Optional[float] = None
    order_index: Optional[int] = None


class Milestone(MilestoneBase):
    id: int
    project_id: int
    status: str = "planned"
    progress_pct: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
