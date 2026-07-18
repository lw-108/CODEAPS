"""Generator for robust, production-ready enterprise code"""

import logging
import re
from typing import Dict, Any, List, Optional

from ai_engine.code_generator.base_generator import BaseGenerator
from ai_engine.model_manager import ModelManager
from ai_engine.cache import AICache

logger = logging.getLogger(__name__)

class ProductionGenerator(BaseGenerator):
    """
    Generator focused on production-grade software engineering.
    Includes error handling, security checks, unit tests, and metrics.
    """
    
    async def generate(self, requirement: str, language: str = "python", framework: str = "fastapi", 
                       include_tests: bool = True, **kwargs) -> Dict[str, Any]:
        """
        Generate production-ready code for a requirement.
        
        Args:
            requirement: Technical description of the feature/bugfix
            language: Target language
            framework: Preferred framework (FastAPI, Django, React, etc.)
            include_tests: Whether to generate unit tests
            **kwargs: Additional context (database, auth, etc.)
            
        Returns:
            Dict containing code, tests, and security analysis
        """
        
        # Format prompts
        system_prompt = self.templates.PRODUCTION_SYSTEM
        user_prompt = self.templates.PRODUCTION_USER.format(
            requirement=requirement,
            language=language,
            framework=framework
        )
        
        # Select best model
        model = await self.model_manager.get_best_model(task="coding")
        
        # Generate response
        response_text = await self._generate_with_cache(
            prompt=user_prompt,
            system_prompt=system_prompt,
            model=model,
            params={
                "framework": framework, 
                "language": language,
                "include_tests": include_tests
            }
        )
        
        # Parse result
        code_blocks = self._parse_code_blocks(response_text)
        main_code = code_blocks[0] if code_blocks else ""
        test_code = code_blocks[1] if len(code_blocks) > 1 else ""
        
        # Security and metrics analysis
        security_analysis = self._analyze_security(main_code, language)
        metrics = self._calculate_metrics(main_code)
        
        return {
            "requirement": requirement,
            "language": language,
            "framework": framework,
            "code": main_code,
            "tests": test_code,
            "security_analysis": security_analysis,
            "metrics": metrics,
            "raw_response": response_text
        }

    def _analyze_security(self, code: str, language: str) -> List[str]:
        """Simple rule-based security scanner for common pitfalls"""
        findings = []
        
        # Generic patterns
        if "eval(" in code or "exec(" in code:
            findings.append("CRITICAL: Potential code injection (eval/exec used)")
        
        if "os.system(" in code or "subprocess.run(..., shell=True)" in code:
            findings.append("WARNING: Potential command injection (shell=True)")
            
        if "password =" in code.lower() or "secret =" in code.lower() or "apikey =" in code.lower():
            findings.append("CAUTION: Potential hardcoded secret found")

        if language == "python":
            if "pickle.load" in code:
                findings.append("WARNING: Unsafe deserialization with pickle")
        
        if not findings:
            findings.append("No obvious security issues detected by rule engine.")
            
        return findings

    def _calculate_metrics(self, code: str) -> Dict[str, int]:
        """Calculate simple code metrics"""
        lines = code.splitlines()
        return {
            "loc": len(lines),
            "functions": len(re.findall(r"def\s+\w+\(", code)),
            "classes": len(re.findall(r"class\s+\w+", code)),
            "comments": len([l for l in lines if l.strip().startswith("#")])
        }
