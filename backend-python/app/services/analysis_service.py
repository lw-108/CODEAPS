import asyncio
import logging
import re
import tracemalloc
import json
import time
from typing import Dict, Any, List, Optional
from app.services.ollama_service import ollama_service

logger = logging.getLogger(__name__)

class AnalysisService:
    def __init__(self):
        self.model = "deepseek-coder:6.7b"
        self.system_prompt = """
        You are an elite Software Architect and Algorithmic Expert.
        Analyze the provided code for:
        1. Time Complexity (Big O)
        2. Space Complexity (Big O)
        3. Radar Metrics (0-100): 
           - Scalability, Maintainability, Memory Efficiency, CPU Usage, I/O Efficiency, Concurrency Readiness.
        4. Operational Suggestions:
           - Optimization hints, memory warnings, complexity alerts.
        5. Confidence Level (0.0-1.0) for the analysis.

        Return ONLY a JSON object with this structure:
        {
          "radarMetrics": { 
            "scalability": 85, "maintainability": 70, "memoryEfficiency": 90, 
            "cpuUsage": 40, "ioEfficiency": 50, "concurrency": 80 
          },
          "complexity": { 
            "time": "O(n log n)", "space": "O(n)", "explanation": "Brief explanation...", 
            "confidence": 0.95 
          },
          "aiSuggestions": [
             { "line": 12, "message": "Consider using a generator for large data sets.", "type": "info" }
          ]
        }
        """

    async def analyze(self, code: str, filename: str, language: str) -> Dict[str, Any]:
        """Orchestrates AI analysis and profiling"""
        
        # 1. AI Analysis & Micro-Benchmarking in parallel
        ai_task = asyncio.create_task(self._get_ai_insights(code, language))
        benchmark_task = asyncio.create_task(self._run_micro_benchmark(code, language))
        
        # 2. System Bars (Static/Heuristic analysis)
        system_bars = self._get_system_bars(code, language)
        memory_map = []
        if language.lower() == 'python':
            memory_map = self._profile_python_memory(code)
        
        # Await tasks
        ai_result = await ai_task or {}
        benchmark_ms = await benchmark_task
        
        # 3. Finalize complexity with predictive runtime
        complexity_data = ai_result.get("complexity", self._default_complexity())
        complexity_data["predictedRuntimeMs"] = benchmark_ms if benchmark_ms > 0 else self._estimate_runtime(complexity_data.get("time", "O(1)"))
        
        return {
            "radarMetrics": ai_result.get("radarMetrics", self._default_radar()),
            "systemBars": system_bars,
            "complexity": complexity_data,
            "aiSuggestions": ai_result.get("aiSuggestions", []),
            "memory_map": memory_map
        }

    async def _get_ai_insights(self, code: str, language: str) -> Dict[str, Any]:
        """Fetches insights from local LLM"""
        prompt = f"Language: {language}\nCode:\n```\n{code}\n```"
        try:
            response = await ollama_service.generate(prompt, system_prompt=self.system_prompt, model=self.model)
            clean_json = self._extract_json(response)
            return json.loads(clean_json)
        except Exception as e:
            logger.error(f"AI Analysis failed: {e}")
            return {}

    async def _run_micro_benchmark(self, code: str, language: str) -> int:
        """Optional dry-run execution for runtime estimation (Simulated for safety)"""
        if not code or len(code) < 10: return 0
        try:
            # Simulate a micro-benchmark context
            # In a real environment, we'd execute a subset or profiled call
            # For now, we calculate a 'complexity weight'
            weight = 0
            weight += code.count('for ') * 10
            weight += code.count('while ') * 15
            weight += code.count('if ') * 2
            weight += code.count('递归') * 50 # Basic heuristic for recursion
            
            # Artificial 'jitter' and base latency
            import random
            latency = 1 + random.randint(0, 5)
            return latency + (weight // 2)
        except Exception:
            return 0

    def _get_system_bars(self, code: str, language: str) -> Dict[str, float]:
        """Calculates system bar metrics based on code analysis"""
        heap_score = 15
        stack_score = 5
        cpu_score = 10
        io_score = 2
        
        # Heuristic rules per language
        lang_lower = language.lower()
        if lang_lower in ['python', 'py']:
            if "async " in code: 
                io_score += 40
            if "os." in code or "shutil." in code or "pathlib" in code: io_score += 25
            if "import pandas" in code or "import numpy" in code or "import torch" in code: heap_score += 45
            if "multiprocessing" in code or "threading" in code: cpu_score += 20
        elif lang_lower in ['rust', 'rs']:
            if "Box::" in code: heap_score += 15
            if "Vec::" in code: heap_score += 25
            if "tokio::" in code or "async" in code: io_score += 35
            if "unsafe" in code: stack_score += 15
        elif lang_lower in ['javascript', 'typescript', 'js', 'ts']:
            if "fetch(" in code or "axios" in code: io_score += 30
            if "new Worker(" in code: cpu_score += 25
            if "Buffer.from" in code or "Uint8Array" in code: heap_score += 30

        # General Patterns
        if re.search(r'for .* in (range|list|zip|enumerate)\(.*\):', code): cpu_score += 25
        if re.search(r'while\s+True|while\s+1', code): cpu_score += 40
        if ".append(" in code or "+=" in code or ".push(" in code: heap_score += 10
        if re.search(r'def\s+\w+\(.*\):(?:\n\s+.*)*\b\w+\(.*\)', code): stack_score += 30 # Recursion detection
        
        return {
            "heap": min(heap_score, 100),
            "stack": min(stack_score, 100),
            "cpu": min(cpu_score, 100),
            "io": min(io_score, 100)
        }

    def _estimate_runtime(self, big_o: str) -> int:
        """Estimates execution time in MS based on Big O for n=10,000"""
        estimates = {
            "O(1)": 1,
            "O(log n)": 3,
            "O(n)": 15,
            "O(n log n)": 40,
            "O(n^2)": 850,
            "O(n^3)": 4500,
            "O(2^n)": 9999,
            "O(n!)": 9999,
            "O(sqrt n)": 5,
            "N/A": 0
        }
        # Normalize string (remove spaces, lowercase)
        key = big_o.replace(" ", "").upper()
        return estimates.get(key, 10)

    def _profile_python_memory(self, code: str) -> List[Dict[str, Any]]:
        """Static heuristic detection of Python allocations"""
        allocations = []
        lines = code.splitlines()
        for i, line in enumerate(lines):
            line_clean = line.strip()
            if line_clean.startswith('#') or not line_clean: continue
            
            if re.search(r'\[.*for.*in.*\]', line) or ' = list(' in line:
                allocations.append({"line": i+1, "type": "heap", "size": 1024})
            elif re.search(r'\{.*:.*for.*in.*\}', line) or ' = dict(' in line:
                allocations.append({"line": i+1, "type": "heap", "size": 2048})
            elif re.search(r'\w+ = \w+\(.+\)', line) and not 'self.' in line:
                # Potential object instantiation
                allocations.append({"line": i+1, "type": "heap", "size": 512})
        return allocations

    def _extract_json(self, text: str) -> str:
        # Robust JSON extraction
        try:
            # Look for triple backticks first
            match = re.search(r'```(?:json)?\n(.*?)\n```', text, re.DOTALL)
            if match: return match.group(1).strip()
            # If not found, look for first { and last }
            match = re.search(r'(\{.*\})', text, re.DOTALL)
            return match.group(1) if match else text
        except Exception:
            return text

    def _default_radar(self) -> Dict[str, int]:
        return {
            "scalability": 0, "maintainability": 0, "memoryEfficiency": 0, 
            "cpuUsage": 0, "ioEfficiency": 0, "concurrency": 0
        }

    def _default_complexity(self) -> Dict[str, Any]:
        return {"time": "N/A", "space": "N/A", "explanation": "Analysis pending.", "confidence": 0}

analysis_service = AnalysisService()
