from typing import Dict, Any, Optional
from ai_engine.model_manager import ModelManager
from ai_engine.code_generator.strategies import (
    PovStrategy, LeetCodePOV, ProductionPOV, EducationalPOV, OptimizedPOV
)

class CodeGenerator:
    def __init__(self, provider: str = "ollama"):
        self.model_manager = ModelManager(provider=provider)
        self.strategies = {
            "leetcode": LeetCodePOV(),
            "production": ProductionPOV(),
            "educational": EducationalPOV(),
            "optimized": OptimizedPOV()
        }

    async def generate(
        self, 
        prompt: str, 
        pov: str = "production", 
        language: str = "python",
        model: str = "llama3"
    ) -> Dict[str, Any]:
        """Generate code using a specific POV"""
        
        strategy = self.strategies.get(pov.lower())
        if not strategy:
            return {"error": f"POV strategy '{pov}' not found."}
        
        system_prompt = strategy.get_system_prompt()
        full_prompt = f"Problem: {prompt}\nLanguage: {language}\nProvide a complete solution."
        
        response = await self.model_manager.chat(
            prompt=full_prompt,
            model=model,
            system_prompt=system_prompt
        )
        
        return {
            "pov": pov,
            "language": language,
            "code": self._extract_code(response),
            "raw_response": response
        }

    def _extract_code(self, response: str) -> str:
        """Simple extraction of code from markdown blocks"""
        if "```" in response:
            parts = response.split("```")
            # Usually the second part is the code if it's one block
            for part in parts:
                if len(part.strip()) > 10 and ("def " in part or "import " in part or "public " in part or "#include" in part):
                    # Strip language identifier if present
                    lines = part.strip().split("\n")
                    if lines and not (" " in lines[0]) and len(lines[0]) < 10:
                        return "\n".join(lines[1:]).strip()
                    return part.strip()
        return response.strip()
