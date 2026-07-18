"""Generator for LeetCode-style interview optimal solutions"""

import logging
from typing import Dict, Any, List, Optional

from ai_engine.code_generator.base_generator import BaseGenerator
from ai_engine.model_manager import ModelManager
from ai_engine.cache import AICache

logger = logging.getLogger(__name__)

class LeetCodeGenerator(BaseGenerator):
    """
    Specialized generator for competitive programming and interview problems.
    Produces optimal solutions with complexity analysis and alternative approaches.
    """
    
    async def generate(self, problem: str, language: str = "python", difficulty: str = "medium", **kwargs) -> Dict[str, Any]:
        """
        Generate an optimal solution for a given problem.
        
        Args:
            problem: Description of the algorithm problem
            language: Target programming language
            difficulty: easy/medium/hard
            **kwargs: Additional parameters like company, topics
            
        Returns:
            Dict containing code, explanation, and complexity analysis
        """
        
        # Format prompts using specialized templates
        system_prompt = self.templates.LEETCODE_SYSTEM
        user_prompt = self.templates.LEETCODE_USER.format(
            problem=problem,
            difficulty=difficulty,
            language=language
        )
        
        # Select best model for coding tasks
        model = await self.model_manager.get_best_model(task="coding")
        
        # Generate response (using cache to avoid redundant calls)
        response_text = await self._generate_with_cache(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model=model,
            params={
                "difficulty": difficulty, 
                "language": language,
                "company": kwargs.get("company", "N/A"),
                "topics": kwargs.get("topics", [])
            }
        )
        
        # Extract the primary solution from the response
        code_blocks = self._parse_code_blocks(response_text)
        main_code = code_blocks[0] if code_blocks else ""
        
        # Perform AST/heuristic-based complexity analysis
        complexity = self.analyze_complexity(main_code, language)
        
        return {
            "problem": problem,
            "language": language,
            "difficulty": difficulty,
            "solution_full": response_text,
            "code": main_code,
            "complexity": complexity,
            "model_used": model,
            "alternatives": self._extract_alternatives(response_text)
        }

    def _extract_alternatives(self, text: str) -> List[str]:
        """Simple extraction of alternative approaches if provided in text"""
        alternatives = []
        if "Alternative Approach" in text or "Approach 2" in text:
            # Simple heuristic: look for sections after the first code block
            parts = text.split("```")
            if len(parts) > 3:
                for i in range(3, len(parts), 2):
                    alternatives.append(parts[i].strip())
        return alternatives
