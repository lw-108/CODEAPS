import subprocess
import json
import os
from pathlib import Path
from typing import Dict, Any
import radon.complexity as cc
from radon.metrics import mi_visit
from radon.visitors import ComplexityVisitor

class AnalysisService:
    def __init__(self):
        pass

    def analyze_python(self, file_path: Path) -> Dict[str, Any]:
        """Analyze Python code using Pylint and Radon"""
        
        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()
            
        # 1. Cyclomatic Complexity (Radon)
        try:
            complexity_data = cc.cc_visit(code)
            avg_complexity = sum(c.complexity for c in complexity_data) / len(complexity_data) if complexity_data else 0
        except:
            avg_complexity = 0
            
        # 2. Maintainability Index (Radon)
        try:
            mi_score = mi_visit(code, multi=True)
        except:
            mi_score = 0
            
        # 3. Static Analysis (Pylint - simplified)
        # In a real app, we'd run 'pylint --output-format=json'
        pylint_score = self._run_pylint(file_path)
            
        return {
            "complexity": avg_complexity,
            "maintainability_index": mi_score,
            "pylint_score": pylint_score,
            "status": "success"
        }

    def _run_pylint(self, file_path: Path) -> float:
        """Run pylint and extract score"""
        try:
            # Simplified mock for now as running subprocess in a tight loop is heavy
            # return 8.5 
            result = subprocess.run(
                ["pylint", str(file_path), "--output-format=text"],
                capture_output=True,
                text=True
            )
            # Parse score from output e.g. "Your code has been rated at 10.00/10"
            for line in result.stdout.split("\n"):
                if "rated at" in line:
                    score_part = line.split("rated at ")[1].split("/10")[0]
                    return float(score_part)
            return 0.0
        except:
            return 0.0
            
    def analyze_web(self, file_path: Path) -> Dict[str, Any]:
        """Analyze JS/TS using ESLint (mock)"""
        return {"status": "ESLint analysis not yet implemented"}
