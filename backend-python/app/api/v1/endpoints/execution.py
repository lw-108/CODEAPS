from fastapi import APIRouter, Depends, HTTPException, Body
from app.api import deps
from app.services.execution_service import execution_service
from app.services.file_service import file_service
from app.models.user import User
from pathlib import Path
from typing import Dict, Any, List

router = APIRouter()

@router.get("/languages")
async def list_languages(
    current_user: User = Depends(deps.get_current_user),
) -> List[Dict[str, Any]]:
    """Returns a list of supported and healthy execution languages"""
    return execution_service.get_supported_languages()

@router.post("/run/{project_id}")
async def run_code(
    project_id: int,
    file_path: str = Body(..., embed=True),
    language: str = Body(..., embed=True),
    input_data: str = Body("", embed=True),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Execute code for a project file with security and resource limits"""
    
    # Verify file existence and size before execution
    full_file_path = file_service.get_project_path(project_id) / file_path
    if not full_file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
        
    # Enforce 1MB source file limit
    if full_file_path.stat().st_size > 1024 * 1024:
        raise HTTPException(status_code=413, detail="Source file too large (max 1MB)")

    result = await execution_service.execute(
        full_file_path,
        language,
        input_data=input_data
    )
    
    return result
