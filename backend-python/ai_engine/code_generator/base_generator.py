"""Base class for all code generators # Trigger linter"""

import ast
import re
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

from ai_engine.model_manager import ModelManager
from ai_engine.cache import AICache
from ai_engine.prompt_templates import PromptTemplates

logger = logging.getLogger(__name__)

class BaseGenerator(ABC):
    """
    Abstract Base Class for all AI generators.
    Provides common utilities for caching, code extraction, and complexity analysis.
    """
    
    def __init__(self, model_manager: ModelManager, cache: AICache):
        self.model_manager = model_manager
        self.cache = cache
        self.templates = PromptTemplates()

    @abstractmethod
    async def generate(self, *args, **kwargs) -> Dict[str, Any]:
        """Main generation entry point to be implemented by subclasses"""
        raise NotImplementedError("Subclasses must implement generate()")

    async def _generate_with_cache(self, prompt: str, system_prompt: str, model: str, params: Dict[str, Any]) -> str:
        """Helper to generate text with cache integration"""
        # Check cache
        cached = self.cache.get(prompt, model, params)
        if cached:
            logger.info("Cache hit for AI request")
            return cached

        # Generate using model manager
        response = await self.model_manager.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            model=model,
            **params
        )

        # Update cache
        if response and not response.startswith("Ollama Error:"):
            self.cache.set(prompt, model, params, response)
        
        return response

    def _parse_code_blocks(self, text: str) -> List[str]:
        """Extract code blocks from markdown response"""
        pattern = r"```(?:\w+)?\n([\s\S]*?)```"
        return re.findall(pattern, text)

    def analyze_complexity(self, code: str, language: str) -> Dict[str, str]:
        """
        Estimate time and space complexity.
        Uses AST analysis for Python and heuristic-based estimation for others.
        """
        if language.lower() == "python":
            try:
                tree = ast.parse(code)
                visitor = ComplexityVisitor()
                visitor.visit(tree)
                return {
                    "time": visitor.get_time_complexity(),
                    "space": visitor.get_space_complexity(),
                    "method": "AST analysis"
                }
            except Exception as e:
                logger.warning(f"AST analysis failed for Python: {e}")
        
        # Fallback for other languages or failed AST
        return {
            "time": "O(N) - estimated",
            "space": "O(1) - estimated",
            "method": "heuristic fallback"
        }

class ComplexityVisitor(ast.NodeVisitor):
    """AST Visitor to estimate code complexity"""
    
    def __init__(self):
        self.loop_depth = 0
        self.max_loop_depth = 0
        self.data_structures = set()

    def visit_For(self, node):
        self.loop_depth += 1
        self.max_loop_depth = max(self.max_loop_depth, self.loop_depth)
        self.generic_visit(node)
        self.loop_depth -= 1

    def visit_While(self, node):
        self.loop_depth += 1
        self.max_loop_depth = max(self.max_loop_depth, self.loop_depth)
        self.generic_visit(node)
        self.loop_depth -= 1

    def visit_Assign(self, node):
        # Heuristic: assignments to lists or dicts suggest linear space
        if isinstance(node.value, (ast.List, ast.Dict, ast.ListComp, ast.DictComp)):
            self.data_structures.add("O(N)")
        self.generic_visit(node)

    def get_time_complexity(self) -> str:
        if self.max_loop_depth == 0: return "O(1)"
        if self.max_loop_depth == 1: return "O(N)"
        if self.max_loop_depth == 2: return "O(N^2)"
        return f"O(N^{self.max_loop_depth})"

    def get_space_complexity(self) -> str:
        if "O(N)" in self.data_structures:
            # Very rough heuristic: if we see a loop and a data structure, it might be O(N)
            if self.max_loop_depth > 0:
                return "O(N)"
        return "O(1)"
