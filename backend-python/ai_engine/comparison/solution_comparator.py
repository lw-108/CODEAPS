"""Comparator for analyzing multiple code solutions"""

import logging
from typing import Dict, Any, List, Optional

from ai_engine.model_manager import ModelManager
from ai_engine.code_generator.base_generator import BaseGenerator

logger = logging.getLogger(__name__)

class SolutionComparator(BaseGenerator):
    """
    Analyzes multiple solutions and provides a detailed comparison table.
    Evaluates based on time complexity, space complexity, and readability.
    """
    
    async def generate(self, solutions: List[Dict[str, Any]], criteria: Optional[List[str]] = None, **kwargs) -> Dict[str, Any]:
        """Implementation of abstract BaseGenerator.generate()"""
        return await self.compare(solutions, criteria)

    async def compare(self, solutions: List[Dict[str, Any]], criteria: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Compare a list of solutions based on provided criteria.
        
        Args:
            solutions: List of solution dictionaries (with code, complexity, etc.)
            criteria: List of aspects to compare (default: time, space, readability)
            
        Returns:
            Dict containing comparison table and recommendation
        """
        if not solutions:
            return {"error": "No solutions provided for comparison"}
            
        criteria = criteria or ["time", "space", "readability", "lines of code"]
        
        # 1. Extract and normalize metrics for each solution
        comparison_data = []
        for idx, sol in enumerate(solutions):
            metrics = {
                "id": sol.get("id", idx + 1),
                "time": sol.get("complexity", {}).get("time", "N/A"),
                "space": sol.get("complexity", {}).get("space", "N/A"),
                "loc": self._count_lines(sol.get("code", "")),
                "approach": sol.get("approach", f"Solution {idx + 1}")
            }
            comparison_data.append(metrics)
            
        # 2. LLM-powered trade-off analysis
        analysis = await self._analyze_tradeoffs(solutions)
        
        return {
            "comparison_table": comparison_data,
            "analysis": analysis,
            "best_for": {
                "performance": self._select_best(comparison_data, "time"),
                "readability": self._select_best(comparison_data, "loc", reverse=True)
            }
        }

    async def _analyze_tradeoffs(self, solutions: List[Dict[str, Any]]) -> str:
        """Use LLM to explain the trade-offs between solutions"""
        model = await self.model_manager.get_best_model(task="chat")
        
        prompt = "Compare these solutions and explain their trade-offs:\n\n"
        for idx, sol in enumerate(solutions):
            prompt += f"Solution {idx + 1}:\n{sol.get('code', '')[:500]}\n\n"
            
        return await self.model_manager.generate(
            prompt=prompt,
            system_prompt="You are a senior software architect. Analyze these solutions for time vs space trade-offs.",
            model=model
        )

    def _count_lines(self, code: str) -> int:
        return len([l for l in code.splitlines() if l.strip()])

    def _select_best(self, data: List[Dict], key: str, reverse: bool = False) -> Any:
        # Simplified selection logic
        try:
            return sorted(data, key=lambda x: str(x.get(key)), reverse=reverse)[0]["id"]
        except:
            return data[0]["id"] if data else None
