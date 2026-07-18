from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.user import User as UserSchema

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    project_path: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    name: Optional[str] = None

class Project(ProjectBase):
    id: int
    owner_id: int
    status: str
    created_at: datetime
    # owner: UserSchema

    class Config:
        from_attributes = True

class ModuleBase(BaseModel):
    module_name: str
    milestone: Optional[str] = None
    description: Optional[str] = None
    parent_module_id: Optional[int] = None
    order_index: Optional[int] = None

class ModuleCreate(ModuleBase):
    project_id: int

class Module(ModuleBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Requirement Schemas ---

class RequirementBase(BaseModel):
    requirement_text: str
    priority: Optional[str] = "medium"
    status: Optional[str] = "pending"

class RequirementCreate(RequirementBase):
    module_id: int

class RequirementSuggestRequest(BaseModel):
    code: str

class RequirementUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    requirement_text: Optional[str] = None

class Requirement(RequirementBase):
    id: int
    module_id: int
    acceptance_criteria: Optional[str] = None
    coverage_score: float = 0.0
    linked_submission_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
