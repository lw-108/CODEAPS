"""Optimizer for existing code using pattern detection and LLM strategies"""

import logging
import re
from typing import Dict, Any, List, Optional

from ai_engine.model_manager import ModelManager
from ai_engine.code_generator.base_generator import BaseGenerator

logger = logging.getLogger(__name__)

class CodeOptimizer(BaseGenerator):
    """
    Advanced optimizer that detects performance bottlenecks and applies fixes.
    Uses centralized prompts (OPTIMIZE_TIME, OPTIMIZE_SPACE).
    """
    
    # Common performance anti-patterns (regex)
    PATTERNS = {
        "nested_loops": r"for.*?for.*?for",
        "linear_search_in_loop": r"for.*?in.*?:\s*if.*?in",
        "repeated_calculation": r"(\w+)\s*=\s*.*?\n.*?\1\s*=\s*",
        "recursion_no_memo": r"def\s+(\w+)\(.*\):.*?return.*?\1\(",
    }

    def __init__(self, model_manager: ModelManager, cache: Any):
        super().__init__(model_manager, cache)
        
    async def generate(self, code: str, language: str = "python", target: str = "time", **kwargs) -> Dict[str, Any]:
        """Implementation of abstract BaseGenerator.generate()"""
        return await self.optimize(code, language, target, **kwargs)
        
    async def optimize(self, code: str, language: str = "python", target: str = "time", **kwargs) -> Dict[str, Any]:
        """
        Optimize provided code for the specific target.
        
        Args:
            code: Original source code
            language: Target language
            target: "time" or "space"
            **kwargs: Additional constraints
            
        Returns:
            Dict containing optimized code and metrics
        """
        # 1. Detect patterns
        findings = self._detect_patterns(code)
        
        # 2. Format prompts
        system_prompt = self.templates.OPTIMIZE_TIME_SYSTEM if target == "time" else "You are a space optimization expert."
        user_template = self.templates.OPTIMIZE_TIME_USER if target == "time" else self.templates.OPTIMIZE_SPACE_USER
        
        user_prompt = user_template.format(
            code=code,
            language=language
        )
        
        # 3. Generate optimized version
        model = await self.model_manager.get_best_model(task="coding")
        response_text = await self._generate_with_cache(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model=model,
            params={"target": target, "language": language}
        )
        
        # 4. Extract code
        code_blocks = self._parse_code_blocks(response_text)
        optimized_code = code_blocks[0] if code_blocks else code
        
        # 5. Improvement metrics (heuristic)
        original_metrics = self._calculate_metrics(code)
        new_metrics = self._calculate_metrics(optimized_code)
        
        return {
            "original_code": code,
            "optimized_code": optimized_code,
            "findings": findings,
            "explanation": response_text,
            "improvement": {
                "loc_change": new_metrics["loc"] - original_metrics["loc"],
                "complexity_before": self.analyze_complexity(code, language)["time"],
                "complexity_after": self.analyze_complexity(optimized_code, language)["time"]
            }
        }

    def _detect_patterns(self, code: str) -> List[str]:
        """Identify potential bottlenecks using regex"""
        findings = []
        for name, pattern in self.PATTERNS.items():
            if re.search(pattern, code, re.DOTALL | re.MULTILINE):
                findings.append(name.replace("_", " ").capitalize())
        return findings

    def _calculate_metrics(self, code: str) -> Dict[str, int]:
        """Calculate simple code metrics"""
        lines = code.splitlines()
        return {
            "loc": len([l for l in lines if l.strip()])
        }
