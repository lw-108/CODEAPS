from typing import Any, List, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.models.requirement import Requirement
from app.schemas.project import Requirement as RequirementSchema, RequirementCreate, RequirementUpdate, RequirementSuggestRequest
from app.services.ollama_service import ollama_service
from app.core.logging_config import get_logger
import traceback
import json

logger = get_logger("requirements")

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
def read_all_requirements(
    db: Session = Depends(deps.get_db),
) -> Any:
    """Retrieve all requirements with manually safe serialization to bypass Pydantic bridge crashes."""
    try:
        logger.info("FETCH_START: Querying all requirements...")
        requirements = db.query(Requirement).all()
        logger.info(f"FETCH_SUCCESS: Retrieved {len(requirements)} raw records.")
        
        final_data = []
        for r in requirements:
            try:
                # 1. Convert to Pydantic for schema validation
                pydantic_obj = RequirementSchema.model_validate(r)
                # 2. Convert back to dict for generic transport
                # Use model_dump(mode='json') to handle datetime serialization automatically
                final_data.append(pydantic_obj.model_dump(mode='json'))
            except Exception as e:
                logger.error(f"SERIALIZATION_FAIL (Req ID {getattr(r, 'id', 'N/A')}): {str(e)}")
                # Log enough info to debug the specific record
                logger.debug(f"Malformed record details: {r.__dict__ if hasattr(r, '__dict__') else 'N/A'}")
                continue
        
        logger.info(f"FETCH_COMPLETE: Sending {len(final_data)} sanitized records.")
        return final_data
        
    except Exception as e:
        logger.error(f"FATAL_API_ERROR: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Database or serialization failure. Error: {str(e)}"
        )

@router.post("/", response_model=Dict[str, Any])
def create_requirement(
    *,
    db: Session = Depends(deps.get_db),
    requirement_in: RequirementCreate,
) -> Any:
    """Create new requirement with relational safety."""
    try:
        requirement = Requirement(
            module_id=requirement_in.module_id,
            requirement_text=requirement_in.requirement_text,
            priority=requirement_in.priority,
            status="pending"
        )
        db.add(requirement)
        db.commit()
        db.refresh(requirement)
        return RequirementSchema.model_validate(requirement).model_dump(mode='json')
    except Exception as e:
        logger.error(f"CREATE_FAIL: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/neural-sync", response_model=List[str])
async def suggest_requirements(
    *,
    db: Session = Depends(deps.get_db),
    request: RequirementSuggestRequest,
) -> Any:
    """Analyze code to suggest potential requirements from TODOs and logic gaps."""
    try:
        prompt = (
            f"As a Senior Technical Architect, analyze the following code for TODOs, FIXMEs, "
            f"and obvious missing features (like error handling, security, or data validation). "
            f"Extract exactly 3-5 high-priority technical requirements. "
            f"Return ONLY a JSON list of strings, nothing else.\n\n"
            f"CODE CONTEXT:\n```\n{request.code}\n```"
        )
        
        response = await ollama_service.generate(
            prompt=prompt,
            system_prompt="You are a requirement engineering engine. ONLY output raw JSON lists of requirement strings.",
            temperature=0.1
        )
        
        # Clean up the AI response to extract the JSON list
        import re
        json_match = re.search(r'\[.*\]', response, re.DOTALL)
        if json_match:
            try:
                suggestions = json.loads(json_match.group(0))
                if isinstance(suggestions, list):
                    return suggestions[:10] # Cap at 10
            except:
                pass
        
        # Fallback if AI output is messy
        lines = [l.strip("- ").strip() for l in response.split("\n") if len(l.strip()) > 10 and not l.startswith("{")]
        return lines[:5]
        
    except Exception as e:
        logger.error(f"SUGGEST_FAIL: {str(e)}")
        return ["Implement error handling", "Enhance security", "Optimize performance"]

@router.patch("/{id}", response_model=Dict[str, Any])
def update_requirement(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    requirement_in: RequirementUpdate,
) -> Any:
    """Update requirement status safely."""
    requirement = db.query(Requirement).filter(Requirement.id == id).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    if requirement_in.status is not None:
        requirement.status = requirement_in.status
    if requirement_in.priority is not None:
        requirement.priority = requirement_in.priority
    if requirement_in.requirement_text is not None:
        requirement.requirement_text = requirement_in.requirement_text
    db.commit()
    db.refresh(requirement)
    return RequirementSchema.model_validate(requirement).model_dump(mode='json')
