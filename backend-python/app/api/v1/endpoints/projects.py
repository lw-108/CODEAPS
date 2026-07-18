from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.models.project import Project, ProjectMember
from app.schemas.project import Project as ProjectSchema, ProjectCreate, ProjectUpdate
from app.services.template_service import TemplateService
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[ProjectSchema])
def read_projects(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Retrieve projects where user is owner or member"""
    projects = db.query(Project).filter(Project.owner_id == current_user.id).offset(skip).limit(limit).all()
    # Also add projects where user is a member
    # projects_member = db.query(Project).join(ProjectMember).filter(ProjectMember.user_id == current_user.id).all()
    # return list(set(projects + projects_member))
    return projects

@router.post("/", response_model=ProjectSchema)
def create_project(
    *,
    db: Session = Depends(deps.get_db),
    project_in: ProjectCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create new project"""
    project = Project(
        name=project_in.name,
        description=project_in.description,
        deadline=project_in.deadline,
        project_path=project_in.project_path,
        owner_id=current_user.id
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("/{id}", response_model=ProjectSchema)
def read_project(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get project by ID"""
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        # Check membership
        member = db.query(ProjectMember).filter(ProjectMember.project_id == id, ProjectMember.user_id == current_user.id).first()
        if not member:
            raise HTTPException(status_code=400, detail="Not enough permissions")
    return project

@router.put("/{id}", response_model=ProjectSchema)
def update_project(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    project_in: ProjectUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update a project"""
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    update_data = project_in.model_dump(exclude_unset=True)
    for field in update_data:
        setattr(project, field, update_data[field])
    
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("/templates/available")
def list_templates():
    """Get list of smart starter templates"""
    return TemplateService.TEMPLATES

@router.post("/templates/instantiate/{template_key}", response_model=ProjectSchema)
def instantiate_template(
    template_key: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create a project from a predefined template"""
    service = TemplateService(db)
    try:
        return service.instantiate_template(template_key, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
