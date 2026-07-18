"""
QualityScanService: LLM-powered code quality scoring for the Diagnostics page.

Sends code to the local Ollama model with a structured prompt, parses the JSON response,
and returns security/performance/maintainability/reliability scores + findings.
Falls back to a deterministic heuristic engine if the LLM is unavailable.
"""

import asyncio
import json
import re
import logging
import hashlib
from typing import Dict, Any, List

from app.services.ollama_service import ollama_service

logger = logging.getLogger(__name__)

QUALITY_SYSTEM_PROMPT = """You are a Senior Code Quality Auditor. Analyze the provided code and return ONLY a JSON object with these exact fields:

{
  "quality": <int 0-100, overall code health>,
  "security": <int 0-100, safety from injection/XSS/credential leaks/unsafe ops>,
  "performance": <int 0-100, algorithmic efficiency and runtime cost>,
  "maintainability": <int 0-100, readability, modularity, documentation>,
  "reliability": <int 0-100, error handling, edge cases, null safety>,
  "findings": [
    "<string: actionable finding with category prefix like '🔒 Security: ...' or '⚡ Performance: ...' or '📝 Maintainability: ...' or '🛡️ Reliability: ...'>"
  ]
}

Rules:
- Return ONLY valid JSON, no markdown, no explanation outside the JSON.
- Scores must be integers 0-100.
- Findings should be specific, actionable, and reference the actual code patterns you observe.
- Include at least 1 finding per category where issues exist.
- quality = weighted average of the other 4 scores.
- Be rigorous but fair. Production-ready code with tests should score 80+.
"""


class QualityScanService:
    def __init__(self):
        self.model = "deepseek-coder:1.3b"
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_limit = 50

    async def scan(self, code: str, language: str, filename: str) -> Dict[str, Any]:
        """Run LLM quality scan with heuristic fallback."""
        if not code or len(code.strip()) < 5:
            return self._empty_result()

        # ── Result Cache Look-up ──
        cache_key = hashlib.md5(f"{language}:{code}".encode()).hexdigest()
        if cache_key in self.cache:
            logger.info(f"[QualityScan] Cache hit for {filename}")
            return self.cache[cache_key]

        # Try LLM first
        try:
            llm_result = await asyncio.wait_for(
                self._llm_scan(code, language),
                timeout=30.0
            )
            if llm_result and self._is_valid_result(llm_result):
                logger.info(f"[QualityScan] LLM scan complete for {filename}: quality={llm_result.get('quality')}")
                
                # Update Cache (FIFO eviction)
                if len(self.cache) >= self.cache_limit:
                    # Remove the oldest item (first key)
                    oldest_key = next(iter(self.cache))
                    self.cache.pop(oldest_key)
                self.cache[cache_key] = llm_result
                
                return llm_result
        except asyncio.TimeoutError:
            logger.warning("[QualityScan] LLM scan timed out after 30s, falling back to heuristics")
        except Exception as e:
            logger.warning(f"[QualityScan] LLM scan failed ({e}), falling back to heuristics")

        # Fallback: deterministic heuristic scan
        heuristic_res = self._heuristic_scan(code, language)
        
        # If we reached here, it means LLM failed. Append a hint to findings.
        heuristic_res["findings"].append("⚠️ Neural Link: AI model timed out or is not pulled. Falling back to local heuristics.")
        return heuristic_res

    async def _llm_scan(self, code: str, language: str) -> Dict[str, Any]:
        """Send code to LLM for quality analysis."""
        prompt = f"Language: {language}\nCode:\n```\n{code[:8000]}\n```"

        response = await ollama_service.generate(
            prompt,
            system_prompt=QUALITY_SYSTEM_PROMPT,
            model=self.model,
            temperature=0.1,
            max_tokens=1024
        )

        if not response or (isinstance(response, str) and ("Error" in response or "Neural Link" in response)):
            return {}

        # Extract JSON from response
        clean = self._extract_json(str(response))
        try:
            data = json.loads(clean)
            return {
                "quality": self._clamp(data.get("quality", 0)),
                "security": self._clamp(data.get("security", 0)),
                "performance": self._clamp(data.get("performance", 0)),
                "maintainability": self._clamp(data.get("maintainability", 0)),
                "reliability": self._clamp(data.get("reliability", 0)),
                "findings": data.get("findings", [])[:20],
                "source": "llm"
            }
        except (json.JSONDecodeError, TypeError) as e:
            logger.error(f"[QualityScan] Failed to parse LLM JSON: {e}")
            return {}

    def _heuristic_scan(self, code: str, language: str) -> Dict[str, Any]:
        """Deterministic heuristic-based quality scan (no LLM needed)."""
        lines = code.split('\n')
        line_count = len(lines)
        char_count = len(code)
        findings: List[str] = []

        # ── Security ──
        security = 100
        sec_checks = [
            (r'\b(eval|exec)\s*\(', 25, '🔒 Security: eval/exec detected — code injection risk'),
            (r'\b(innerHTML|outerHTML)\s*=', 20, '🔒 Security: Direct innerHTML — XSS vulnerability'),
            (r'\b(subprocess\.call|os\.system)\s*\(', 20, '🔒 Security: Shell command execution — injection risk'),
            (r'\bpassword\s*=\s*["\'][^"\']+["\']', 30, '🔒 Security: Hardcoded credential detected'),
            (r'\b(SELECT|INSERT|UPDATE|DELETE)\b.*\+\s*\w', 25, '🔒 Security: Potential SQL injection'),
            (r'document\.write\s*\(', 15, '🔒 Security: document.write usage'),
        ]
        for pattern, penalty, msg in sec_checks:
            if re.search(pattern, code, re.IGNORECASE):
                security -= penalty
                findings.append(msg)

        has_error_handling = bool(re.search(r'\b(try|catch|except|finally)\b', code))
        if not has_error_handling and line_count > 20:
            security -= 10
            findings.append('🔒 Security: No error handling in substantial code')

        # ── Performance ──
        performance = 100
        max_loop_depth = 0
        current_depth = 0
        has_recursion = False
        
        # Refined Recursion Detection: Check if a function name is called within its body
        current_function = None
        func_names: List[str] = []
        func_patterns = [
            r'def\s+(\w+)\s*\(',     # Python
            r'function\s+(\w+)\s*\(', # JS/TS
            r'fn\s+(\w+)\s*\(',       # Rust
            r'func\s+(\w+)\s*\(',     # Go
        ]
        
        for line in lines:
            t = line.strip()
            if not t or t.startswith(('//', '#', '/*')):
                continue
            
            # Detect Function Start
            for pat in func_patterns:
                f_match = re.search(pat, t)
                if f_match:
                    current_function = f_match.group(1)
                    func_names.append(current_function)
                    break
            
            # Detect Loop Depth
            if re.search(r'\b(for|while|do)\b', t):
                current_depth += 1
                max_loop_depth = max(max_loop_depth, current_depth)
            
            # Simple bracket-based depth reset
            if '}' in t:
                current_depth = max(0, current_depth - 1)
                # If we hit a closing bracket at top level, function likely ended
                if current_depth == 0:
                    current_function = None
            
            # Check for recursion
            if current_function:
                # Look for name( but not in the definition line itself
                if f'{current_function}(' in t and not any(re.search(pat, t) for pat in func_patterns):
                    has_recursion = True

        if max_loop_depth >= 3:
            performance -= 35
            findings.append(f'⚡ Performance: Triple-nested loops (depth {max_loop_depth}) — O(n³)+')
        elif max_loop_depth == 2:
            performance -= 20
            findings.append('⚡ Performance: Nested loops — O(n²) complexity')

        if has_recursion:
            performance -= 15
            findings.append('⚡ Performance: Recursive call detected — monitor stack depth')

        # ── Maintainability ──
        maintainability = 100
        comment_lines = sum(1 for l in lines if l.strip().startswith(('//','#','/*','*')))
        comment_ratio = comment_lines / max(line_count, 1)
        avg_line_len = char_count / max(line_count, 1)

        if comment_ratio < 0.05 and line_count > 30:
            maintainability -= 15
            findings.append('📝 Maintainability: Comment ratio below 5% — add documentation')

        if avg_line_len > 100:
            maintainability -= 15
            findings.append('📝 Maintainability: Average line length >100 chars')
        elif avg_line_len > 80:
            maintainability -= 8

        if line_count > 500:
            maintainability -= 15
            findings.append('📝 Maintainability: File >500 lines — split into modules')
        elif line_count > 300:
            maintainability -= 8

        if re.search(r'catch\s*\(\s*\)', code) or re.search(r'except\s*:', code):
            maintainability -= 10
            findings.append('📝 Maintainability: Bare exception handler — specify types')

        # ── Reliability ──
        reliability = 100
        has_type_checks = bool(re.search(r'\b(isinstance|typeof|is_a\?)\b', code))
        has_assertions = bool(re.search(r'\b(assert|expect|should)\b', code))

        if func_names and not has_type_checks and not has_assertions and line_count > 30:
            reliability -= 12
            findings.append('🛡️ Reliability: No input validation or type checking')

        if not has_error_handling and line_count > 15:
            reliability -= 15
            findings.append('🛡️ Reliability: No error handling present')

        todo_count = len(re.findall(r'\b(TODO|FIXME|HACK|XXX|BUG)\b', code, re.IGNORECASE))
        if todo_count > 0:
            reliability -= min(todo_count * 5, 15)
            findings.append(f'🛡️ Reliability: {todo_count} TODO/FIXME marker(s)')

        # ── Quality (weighted average) ──
        quality = round(
            self._clamp(security) * 0.25 +
            self._clamp(performance) * 0.25 +
            self._clamp(maintainability) * 0.25 +
            self._clamp(reliability) * 0.25
        )

        return {
            "quality": self._clamp(quality),
            "security": self._clamp(security),
            "performance": self._clamp(performance),
            "maintainability": self._clamp(maintainability),
            "reliability": self._clamp(reliability),
            "findings": findings,
            "source": "heuristic"
        }

    def _extract_json(self, text: str) -> str:
        """Robustly extract JSON from LLM response text."""
        try:
            match = re.search(r'```(?:json)?\n(.*?)\n```', text, re.DOTALL)
            if match:
                return match.group(1).strip()
            match = re.search(r'(\{.*\})', text, re.DOTALL)
            return match.group(1) if match else text
        except Exception:
            return text

    def _is_valid_result(self, result: Dict[str, Any]) -> bool:
        """Check if the result has the expected shape."""
        required = ['quality', 'security', 'performance', 'maintainability', 'reliability']
        return all(k in result for k in required)

    def _clamp(self, v: Any, lo: int = 0, hi: int = 100) -> int:
        try:
            return max(lo, min(hi, int(v)))
        except (ValueError, TypeError):
            return 0

    def _empty_result(self) -> Dict[str, Any]:
        return {
            "quality": 0,
            "security": 0,
            "performance": 0,
            "maintainability": 0,
            "reliability": 0,
            "findings": [],
            "source": "empty"
        }


quality_scan_service = QualityScanService()
