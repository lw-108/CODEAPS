from fastapi import APIRouter, Depends, Body
from app.api import deps
from app.services.analysis_service import analysis_service
from app.services.quality_scan_service import quality_scan_service
from app.models.user import User
from typing import Dict, Any, Optional

router = APIRouter()

@router.post("/analyze")
async def analyze_code(
    code: str = Body(..., embed=True),
    filename: str = Body(..., embed=True),
    language: str = Body(..., embed=True),
    current_user: Optional[User] = Depends(deps.get_optional_current_user),
) -> Dict[str, Any]:
    """Execute real-time code complexity and quality analysis"""
    
    result = await analysis_service.analyze(
        code,
        filename,
        language
    )
    
    return result


@router.post("/quality-scan")
async def quality_scan(
    code: str = Body(..., embed=True),
    language: str = Body("python", embed=True),
    filename: str = Body("untitled", embed=True),
    current_user: Optional[User] = Depends(deps.get_optional_current_user),
) -> Dict[str, Any]:
    """
    LLM-powered code quality scoring for the Diagnostics page.
    Returns security, performance, maintainability, reliability scores (0-100)
    plus actionable findings.
    """
    result = await quality_scan_service.scan(code, language, filename)
    return result
