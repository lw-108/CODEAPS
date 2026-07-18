from fastapi import APIRouter, Depends, HTTPException, Body, WebSocket, WebSocketDisconnect, BackgroundTasks
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.services.validator_orchestrator import ValidationOrchestrator
from typing import Dict, Any, List, Optional
import json
import logging

from ai_engine.model_manager import ModelManager
from ai_engine.cache import AICache
from ai_engine.code_generator.leetcode_generator import LeetCodeGenerator
from ai_engine.code_generator.production_generator import ProductionGenerator
from ai_engine.code_generator.educational_generator import EducationalGenerator
from ai_engine.problem_solver.leetcode_solver import LeetCodeSolver
from ai_engine.optimizer.code_optimizer import CodeOptimizer
from ai_engine.comparison.solution_comparator import SolutionComparator

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize AI components
cache = AICache()
model_manager = ModelManager()
leetcode_gen = LeetCodeGenerator(model_manager, cache)
production_gen = ProductionGenerator(model_manager, cache)
educational_gen = EducationalGenerator(model_manager, cache)
leetcode_solver = LeetCodeSolver(model_manager, cache)
code_optimizer = CodeOptimizer(model_manager, cache)
comparator = SolutionComparator(model_manager, cache)

@router.get("/status")
async def get_ai_status():
    """Minimal status check for UI indicators"""
    health = await model_manager.check_health()
    return {"status": "online" if health.get("status") == "healthy" else "offline"}

@router.post("/generate")
async def generate_ai_response(
    prompt: str = Body(..., embed=True),
    model: Optional[str] = Body(None, embed=True),
    system_prompt: Optional[str] = Body(None, embed=True)
):
    """Generate a reasoned response from the local AI engine"""
    try:
        response = await model_manager.generate(prompt, model=model, system_prompt=system_prompt)
        return {"response": response, "model": model or "deepseek-coder:6.7b"}
    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze")
async def analyze_code_quality(
    content: str = Body(..., embed=True),
    db: Session = Depends(deps.get_db)
):
    """Perform a one-off deep code quality audit (logic, style, coverage)"""
    try:
        orchestrator = ValidationOrchestrator(db)
        result = await orchestrator.run_ad_hoc_analysis(content)
        return result
    except Exception as e:
        logger.error(f"Deep Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate/leetcode")
async def generate_leetcode(
    problem: str = Body(..., embed=True),
    difficulty: str = Body("medium", embed=True),
    language: str = Body("python", embed=True),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Generate interview-optimal solutions with complexity analysis"""
    try:
        return await leetcode_gen.generate(problem, language, difficulty)
    except Exception as e:
        logger.error(f"LeetCode generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate/production")
async def generate_production(
    requirement: str = Body(..., embed=True),
    language: str = Body("python", embed=True),
    framework: str = Body("fastapi", embed=True),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Generate production-ready enterprise code with tests and security analysis"""
    try:
        return await production_gen.generate(requirement, language, framework)
    except Exception as e:
        logger.error(f"Production generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate/educational")
async def generate_educational(
    topic: str = Body(..., embed=True),
    level: str = Body("beginner", embed=True),
    language: str = Body("python", embed=True),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Generate educational learning content with analogies and exercises"""
    try:
        return await educational_gen.generate(topic, level, language)
    except Exception as e:
        logger.error(f"Educational generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/leetcode/{problem_id}")
async def solve_leetcode_by_id(
    problem_id: str,
    language: str = "python",
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Solve a LeetCode problem by ID or slug"""
    try:
        return await leetcode_solver.solve(problem_id, language)
    except Exception as e:
        logger.error(f"LeetCode solver error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimize")
async def optimize_code(
    code: str = Body(..., embed=True),
    language: str = Body("python", embed=True),
    target: str = Body("time", embed=True),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Optimize existing code for performance and efficiency"""
    try:
        return await code_optimizer.optimize(code, language, target)
    except Exception as e:
        logger.error(f"Optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare")
async def compare_solutions(
    solutions: List[Dict[str, Any]] = Body(..., embed=True),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Compare multiple solutions and analyze trade-offs"""
    try:
        return await comparator.compare(solutions)
    except Exception as e:
        logger.error(f"Comparison error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze")
async def analyze_code(
    code: str = Body(..., embed=True),
    language: str = Body("python", embed=True),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """Perform fast, non-generative analysis of code complexity and patterns"""
    try:
        complexity = code_optimizer.analyze_complexity(code, language)
        patterns = code_optimizer._detect_patterns(code)
        
        # Calculate optimization potential (100 - (10 per pattern))
        potential = max(0, 100 - (len(patterns) * 15))
        
        return {
            "complexity": complexity,
            "patterns": patterns,
            "optimization_potential": potential,
            "language": language
        }
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/ws/generate")
async def ai_streaming_generation(websocket: WebSocket):
    """WebSocket for real-time streaming AI responses"""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            prompt = message.get("prompt")
            if not prompt:
                await websocket.send_text(json.dumps({"type": "error", "message": "No prompt provided"}))
                continue
                
            model = message.get("model", "llama3")
            
            async for chunk in model_manager.generate(prompt, model=model, stream=True):
                await websocket.send_text(json.dumps({"type": "chunk", "content": chunk}))
            
            await websocket.send_text(json.dumps({"type": "done"}))
            
    except WebSocketDisconnect:
        logger.info("AI generation websocket disconnected")
    except Exception as e:
        logger.error(f"AI websocket error: {e}")
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except:
            pass
