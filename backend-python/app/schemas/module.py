from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ModuleBase(BaseModel):
    module_name: str
    description: Optional[str] = None
    order_index: Optional[int] = None


class ModuleCreate(ModuleBase):
    project_id: int
    milestone_id: Optional[int] = None
    parent_module_id: Optional[int] = None


class ModuleUpdate(BaseModel):
    module_name: Optional[str] = None
    description: Optional[str] = None
    milestone_id: Optional[int] = None
    status: Optional[str] = None
    completion_pct: Optional[float] = None
    order_index: Optional[int] = None


class Module(ModuleBase):
    id: int
    project_id: int
    milestone_id: Optional[int] = None
    parent_module_id: Optional[int] = None
    status: str = "not_started"
    completion_pct: float = 0.0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DependencyCreate(BaseModel):
    target_module_id: int
    dependency_type: str = "requires"  # blocks | requires | optional


class Dependency(BaseModel):
    id: int
    source_module_id: int
    target_module_id: int
    dependency_type: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
