"""Specialized solver for LeetCode problems with multi-perspective analysis"""

import logging
import re
from typing import Dict, Any, List, Optional

from ai_engine.model_manager import ModelManager
from ai_engine.code_generator.leetcode_generator import LeetCodeGenerator

logger = logging.getLogger(__name__)

class LeetCodeSolver:
    """
    Advanced solver for algorithmic problems.
    Coordinates between different generation perspectives and provides recommendations.
    """
    
    # Simple internal database of common problems for quick identification
    PROBLEM_DB = {
        "two-sum": {"id": 1, "difficulty": "easy", "topics": ["array", "hash-table"]},
        "add-two-numbers": {"id": 2, "difficulty": "medium", "topics": ["linked-list", "math"]},
        "longest-substring": {"id": 3, "difficulty": "medium", "topics": ["hash-table", "sliding-window"]},
        "median-of-two-sorted-arrays": {"id": 4, "difficulty": "hard", "topics": ["array", "binary-search", "divide-and-conquer"]},
        "longest-palindromic-substring": {"id": 5, "difficulty": "medium", "topics": ["string", "dynamic-programming"]}
    }

    def __init__(self, model_manager: ModelManager, cache: Any):
        self.model_manager = model_manager
        self.lc_generator = LeetCodeGenerator(model_manager, cache)
        
    async def solve(self, problem_description: str, language: str = "python", **kwargs) -> Dict[str, Any]:
        """
        Solve a problem by coordinating multiple generation attempts and identifying the problem.
        
        Args:
            problem_description: The problem text, URL, or ID
            language: Target language
            **kwargs: difficulty, company, topics
            
        Returns:
            Dict containing detailed solutions and problem identification
        """
        # 1. Identify problem
        info = self._identify_problem(problem_description)
        difficulty = kwargs.get("difficulty") or info.get("difficulty") or "medium"
        
        # 2. Generate primary optimal solution
        optimal = await self.lc_generator.generate(
            problem=problem_description,
            language=language,
            difficulty=difficulty,
            company=kwargs.get("company", "N/A"),
            topics=kwargs.get("topics") or info.get("topics", [])
        )
        
        # 3. Compile final response
        return {
            "problem": {
                "id": info.get("id"),
                "slug": info.get("slug"),
                "difficulty": difficulty,
                "topics": info.get("topics", [])
            },
            "solutions": {
                "primary": optimal
            },
            "recommendation": f"Optimal time: {optimal.get('complexity', {}).get('time', 'O(N)')}"
        }

    def _identify_problem(self, description: str) -> Dict[str, Any]:
        """Attempt to extract problem information from description"""
        # Try slug from URL
        url_match = re.search(r"leetcode\.com/problems/([^/]+)", description)
        if url_match:
            slug = url_match.group(1)
            if slug in self.PROBLEM_DB:
                info = self.PROBLEM_DB[slug].copy()
                info["slug"] = slug
                return info
            return {"slug": slug}
            
        # Try ID
        id_match = re.search(r"^\s*(\d+)\s*\.?\s*", description)
        if id_match:
            pid = int(id_match.group(1))
            for slug, data in self.PROBLEM_DB.items():
                if data["id"] == pid:
                    info = data.copy()
                    info["slug"] = slug
                    return info
            return {"id": pid}

        return {"slug": "unknown"}
