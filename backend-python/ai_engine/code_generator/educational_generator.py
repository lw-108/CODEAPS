"""Generator for educational coding content and tutorials"""

import logging
import re
from typing import Dict, Any, List, Optional

from ai_engine.code_generator.base_generator import BaseGenerator
from ai_engine.model_manager import ModelManager
from ai_engine.cache import AICache

logger = logging.getLogger(__name__)

class EducationalGenerator(BaseGenerator):
    """
    Generator focused on teaching and explaining code.
    Includes analogies, visual diagrams, and practice exercises.
    """
    
    async def generate(self, topic: str, level: str = "beginner", language: str = "python", 
                       include_exercises: bool = True, **kwargs) -> Dict[str, Any]:
        """
        Generate educational content for a topic.
        
        Args:
            topic: Concept to explain (e.g. "Recursion", "Binary Search")
            level: beginner/intermediate/advanced
            language: Target programming language
            include_exercises: Whether to include practice problems
            **kwargs: Additional context
            
        Returns:
            Dict containing explanation, visualization, and exercises
        """
        
        # Format prompts
        system_prompt = self.templates.EDUCATIONAL_SYSTEM
        user_prompt = self.templates.EDUCATIONAL_USER.format(
            topic=topic,
            level=level,
            language=language
        )
        
        # Select best model for explanation tasks
        model = await self.model_manager.get_best_model(task="chat")
        
        # Generate response
        response_text = await self._generate_with_cache(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model=model,
            params={
                "level": level, 
                "language": language,
                "include_exercises": include_exercises
            }
        )
        
        # Parse result (splitting common sections)
        sections = self._parse_sections(response_text)
        
        return {
            "topic": topic,
            "level": level,
            "language": language,
            "explanation": response_text,
            "analogy": sections.get("analogy", ""),
            "visualization": sections.get("visualization", ""),
            "exercises": sections.get("exercises", []),
            "model_used": model
        }

    def _parse_sections(self, text: str) -> Dict[str, Any]:
        """Deep parsing of educational response into components"""
        sections = {}
        
        # Extract visual symbols (ASCII diagrams)
        vis_match = re.search(r"(?i)Visual|Diagram|ASCII.*?\n(.*?)(\n\n|#|$)", text, re.DOTALL)
        if vis_match:
            sections["visualization"] = vis_match.group(1).strip()
            
        # Extract analogy
        analogy_match = re.search(r"(?i)Analogy.*?\n(.*?)(\n\n|#|$)", text, re.DOTALL)
        if analogy_match:
            sections["analogy"] = analogy_match.group(1).strip()
            
        # Extract exercises
        exercise_section = re.search(r"(?i)Exercise|Practice.*?\n(.*)", text, re.DOTALL)
        if exercise_section:
            ex_text = exercise_section.group(1)
            # Find bullet points
            sections["exercises"] = re.findall(r"^\d+\.\s+(.*)$", ex_text, re.MULTILINE)
            
        return sections
