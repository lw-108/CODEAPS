from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.models.module import Module
from app.models.module_dependency import ModuleDependency
from app.schemas.project import Module as ModuleSchema, ModuleCreate
from app.schemas.module import ModuleUpdate, DependencyCreate, Dependency as DependencySchema
from app.models.user import User

router = APIRouter()


@router.get("/project/{project_id}", response_model=List[ModuleSchema])
def read_modules(
    project_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Retrieve modules for a specific project"""
    modules = db.query(Module).filter(Module.project_id == project_id).all()
    return modules


@router.post("/", response_model=ModuleSchema)
def create_module(
    *,
    db: Session = Depends(deps.get_db),
    module_in: ModuleCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create new module"""
    module = Module(
        project_id=module_in.project_id,
        module_name=module_in.module_name,
        milestone=module_in.milestone,
        description=module_in.description,
        parent_module_id=module_in.parent_module_id,
        order_index=module_in.order_index
    )
    db.add(module)
    db.commit()
    db.refresh(module)
    return module


@router.put("/{module_id}", response_model=ModuleSchema)
def update_module(
    *,
    db: Session = Depends(deps.get_db),
    module_id: int,
    module_in: ModuleUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update a module"""
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    update_data = module_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(module, field, value)

    db.add(module)
    db.commit()
    db.refresh(module)
    return module


# ─── Dependency Management ───────────────────────────────────────

@router.post("/{module_id}/dependencies", response_model=DependencySchema)
def add_dependency(
    module_id: int,
    dep_in: DependencyCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Add a dependency to a module"""
    # Validate both modules exist
    source = db.query(Module).get(module_id)
    target = db.query(Module).get(dep_in.target_module_id)
    if not source or not target:
        raise HTTPException(status_code=404, detail="Module not found")

    # Prevent self-dependency
    if module_id == dep_in.target_module_id:
        raise HTTPException(status_code=400, detail="Module cannot depend on itself")

    dep = ModuleDependency(
        source_module_id=module_id,
        target_module_id=dep_in.target_module_id,
        dependency_type=dep_in.dependency_type,
    )
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep


@router.get("/{module_id}/dependencies", response_model=List[DependencySchema])
def list_dependencies(
    module_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """List all dependencies for a module"""
    deps_list = db.query(ModuleDependency).filter(
        ModuleDependency.source_module_id == module_id
    ).all()
    return deps_list


@router.delete("/{module_id}/dependencies/{dep_id}")
def remove_dependency(
    module_id: int,
    dep_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Remove a dependency"""
    dep = db.query(ModuleDependency).filter(
        ModuleDependency.id == dep_id,
        ModuleDependency.source_module_id == module_id,
    ).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Dependency not found")

    db.delete(dep)
    db.commit()
    return {"status": "deleted", "id": dep_id}
