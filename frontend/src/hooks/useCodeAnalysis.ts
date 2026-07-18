import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useAnalysisStore, CodeMetrics, defaultMetrics } from '@/store/useAnalysisStore';
import { getLanguageFromExtension } from '@/lib/languageMap';
import { ollamaService } from '@/services/OllamaService';

/**
 * useCodeAnalysis: Powers the Diagnostics (StatsPanel) page.
 * 
 * Flow:
 *   1. On editor content change (debounced 2.5s), sends code to the local LLM backend.
 *   2. Backend uses Ollama to return security/performance/maintainability/reliability scores + findings.
 *   3. If backend is unavailable, falls back to a rich local heuristic engine.
 *   4. Updates useAnalysisStore with metrics, findings, and history.
 */

const LLM_ENDPOINT = 'http://localhost:8000/api/v1/analysis/quality-scan';

export const useCodeAnalysis = (autoRun = false) => {
  const tabs = useEditorStore((state: any) => state.tabs);
  const activeFile = useEditorStore((state: any) => state.activeFile);
  const activeTab = tabs.find((t: any) => t.filename === activeFile) || null;
  const { 
    setMetrics, setAnalyzing, setFindings, recordAnalysis, isAnalyzing, metrics, findings,
    setPerfectCode, setGeneratingSuggestion, isGeneratingSuggestion, lastPerfectCode, setOptimizationError 
  } = useAnalysisStore();
  const abortRef = useRef<AbortController | null>(null);
  const isRequestPending = useRef<boolean>(false);

  const analyze = useCallback(async () => {
    if (!activeTab || !activeTab.content || activeTab.content.trim().length < 5) {
      useAnalysisStore.getState().resetFileMetrics();
      setFindings([]);
      return;
    }

    // Strict Concurrency Lock: Prevent overlapping requests
    if (isRequestPending.current) return;

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    isRequestPending.current = true;
    setAnalyzing(true);
    try {
      const lang = getLanguageFromExtension(activeTab.filename).monacoId;
      const code = activeTab.content;

      // ── Anti-Glitch Check ──
      const store = useAnalysisStore.getState();
      const isFreshAI = store.metricsSource === 'ai' && 
                        store.lastAnalysis && 
                        (new Date().getTime() - new Date(store.lastAnalysis).getTime() < 15000);

      // ── Instant Heuristic Update (Zero Latency) ──
      // Only apply if we DON'T have a fresh AI result to protect against flickering
      const localResult = localQualityScan(code, lang);
      if (!isFreshAI) {
        setMetrics(localResult.metrics, 'heuristic');
        setFindings(localResult.findings);
      }

      let newMetrics: CodeMetrics;
      let findings: string[];

      // ── Retry with Exponential Backoff ──
      const maxRetries = 3;
      let retryCount = 0;

      const performFetch = async (): Promise<any> => {
        try {
          const response = await fetch(LLM_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              language: lang,
              filename: activeTab.filename,
            }),
            signal: abortRef.current?.signal,
          });

          if (response.status === 503 && retryCount < maxRetries) {
            retryCount++;
            const delay = Math.pow(2, retryCount) * 1000;
            console.warn(`[Diagnostics] Server busy (503), retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return performFetch();
          }

          if (!response.ok) throw new Error(`Backend returned ${response.status}`);
          const data = await response.json();

          // ── Check for Backend-level Errors (Ollama 503 as 200 OK) ──
          if (data.error && retryCount < maxRetries) {
            console.warn(`[Diagnostics] Backend reported error: ${data.error}. Retrying...`);
            retryCount++;
            const delay = Math.pow(2, retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            return performFetch();
          }

          return data;
        } catch (err) {
          if ((err as Error).name === 'AbortError') throw err;
          if (retryCount < maxRetries) {
            retryCount++;
            const delay = Math.pow(2, retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            return performFetch();
          }
          throw err;
        }
      };

      try {
        const data = await performFetch();

        newMetrics = {
          quality: clamp(data.quality ?? 0),
          security: clamp(data.security ?? 0),
          performance: clamp(data.performance ?? 0),
          maintainability: clamp(data.maintainability ?? 0),
          reliability: clamp(data.reliability ?? 0),
        };
        findings = Array.isArray(data.findings) ? data.findings : [];

        // Update with full LLM result (Sharpening)
        setMetrics(newMetrics, 'ai');
        setFindings(findings);
        recordAnalysis(newMetrics.quality);

      } catch (backendErr: any) {
        if (backendErr.name === 'AbortError') return; 
        console.warn('[Diagnostics] LLM backend unavailable, relying on existing metrics.');
      }

    } catch (err) {
      console.error('[Diagnostics] Analysis Error:', err);
    } finally {
      isRequestPending.current = false;
      setAnalyzing(false);
    }
  }, [activeTab?.content, activeTab?.filename, findings, recordAnalysis, setAnalyzing, setFindings, setMetrics]);

  const generatePerfectCode = useCallback(async (specificContext?: string) => {
    if (!activeTab || !activeTab.content || isGeneratingSuggestion) return;

    setGeneratingSuggestion(true);
    try {
      const { id } = getLanguageFromExtension(activeTab.filename);
      // Use the specific context if provided (e.g. from a click on a suggestion), 
      // otherwise fall back to the collected findings of the file.
      const context = specificContext || findings.join('\n');
      const result = await ollamaService.optimize(activeTab.content, id, 'perfect', context);
      
      if (result && result.optimized_code) {
        setPerfectCode(result.optimized_code);
      } else {
        setOptimizationError("Neural engine returned empty result.");
      }
    } catch (err: any) {
      console.error('[Diagnostics] Optimization Error:', err);
      setOptimizationError(err.message || "Neural Link connection failed.");
    } finally {
      setGeneratingSuggestion(false);
    }
  }, [activeTab?.content, activeTab?.filename, findings, isGeneratingSuggestion, setGeneratingSuggestion, setPerfectCode, setOptimizationError]);

  // ── Throttled Neural Diagnostics ──
  // We use a much longer debounce (3s) for the "Deep Scan" to prevent
  // overwhelming the backend while the user is actively typing.
  useEffect(() => {
    if (!autoRun || !activeTab?.content) return;
    
    const timer = setTimeout(() => {
      analyze();
    }, 3000); // 3-second pause required for Deep Scan

    return () => clearTimeout(timer);
  }, [activeTab?.content, analyze, autoRun]);

  // ── Auto-cleanup on File Switch ──
  useEffect(() => {
    // When the user switches tabs, clear the global "perfect code" suggestion
    // and reset metrics to prevent stale data from showing on the Overview page.
    const store = useAnalysisStore.getState();
    store.setPerfectCode(null);
    store.resetFileMetrics();
  }, [activeFile]);

  return { 
    analysis: { metrics, isAnalyzing }, 
    isAnalyzing, 
    refetch: analyze,
    generatePerfectCode,
    isGeneratingSuggestion,
    lastPerfectCode,
    optimizationError: useAnalysisStore((state: any) => state.optimizationError),
    setOptimizationError
  };
};


// ── Utilities ──

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}


// ══════════════════════════════════════════════════════════════
// LOCAL HEURISTIC CODE QUALITY ENGINE (Offline Fallback)
// ══════════════════════════════════════════════════════════════

function localQualityScan(code: string, language: string): { metrics: CodeMetrics; findings: string[] } {
  const lines = code.split('\n');
  const lineCount = lines.length;
  const charCount = code.length;
  const findings: string[] = [];

  // ── Security Analysis ──
  let security = 100;
  const securityPatterns = [
    { pattern: /\b(eval|exec)\s*\(/, penalty: 25, msg: 'Use of eval/exec detected — potential code injection risk' },
    { pattern: /\b(innerHTML|outerHTML)\s*=/, penalty: 20, msg: 'Direct innerHTML assignment — XSS vulnerability risk' },
    { pattern: /\b(document\.write)\s*\(/, penalty: 15, msg: 'document.write usage — security and performance concern' },
    { pattern: /\b(subprocess\.call|os\.system)\s*\(/, penalty: 20, msg: 'Shell command execution detected — command injection risk' },
    { pattern: /\bpassword\s*=\s*["'][^"']+["']/, penalty: 30, msg: 'Hardcoded password/credential detected' },
    { pattern: /\b(SELECT|INSERT|UPDATE|DELETE)\b.*\+\s*\w/, penalty: 25, msg: 'Potential SQL injection — use parameterized queries' },
    { pattern: /\b__proto__\b|\bconstructor\.prototype\b/, penalty: 20, msg: 'Prototype pollution risk detected' },
    { pattern: /https?:\/\/[^\s"'`]+/, penalty: 0, msg: '' }, // URLs present (not penalized, just noted)
  ];
  for (const { pattern, penalty, msg } of securityPatterns) {
    if (pattern.test(code) && penalty > 0) {
      security -= penalty;
      findings.push(`🔒 Security: ${msg}`);
    }
  }

  // Check for error handling
  const hasErrorHandling = /\b(try|catch|except|finally|rescue|Result<|Option<)\b/.test(code);
  if (!hasErrorHandling && lineCount > 20) {
    security -= 10;
    findings.push('🔒 Security: No error handling detected in substantial code');
  }

  // ── Performance Analysis ──
  let performance = 100;
  let maxLoopDepth = 0;
  let currentDepth = 0;
  let hasRecursion = false;
  const functionNames: string[] = [];

  const loopPatterns = /\b(for|while|do)\b/;
  const funcDefPatterns = /(?:function\s+(\w+)|def\s+(\w+)|fn\s+(\w+)|(\w+)\s*=\s*(?:async\s+)?(?:\(|function))/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) continue;

    const funcMatch = trimmed.match(funcDefPatterns);
    if (funcMatch) {
      const name = funcMatch[1] || funcMatch[2] || funcMatch[3] || funcMatch[4];
      if (name) functionNames.push(name);
    }

    if (loopPatterns.test(trimmed)) {
      currentDepth++;
      maxLoopDepth = Math.max(maxLoopDepth, currentDepth);
    }
    if (trimmed.includes('}') || (trimmed === '' && currentDepth > 0)) {
      currentDepth = Math.max(0, currentDepth - 1);
    }
  }

  for (const name of functionNames) {
    const callPattern = new RegExp(`\\b${name}\\s*\\(`, 'g');
    const matches = code.match(callPattern);
    if (matches && matches.length >= 2) {
      hasRecursion = true;
      break;
    }
  }

  if (maxLoopDepth >= 3) {
    performance -= 35;
    findings.push(`⚡ Performance: Triple-nested loops detected (depth ${maxLoopDepth}) — O(n³) or worse`);
  } else if (maxLoopDepth === 2) {
    performance -= 20;
    findings.push('⚡ Performance: Nested loops detected — O(n²) complexity');
  }

  if (hasRecursion) {
    performance -= 15;
    findings.push('⚡ Performance: Recursive function detected — monitor stack depth');
  }

  if (code.includes('.sort(') || code.includes('sorted(') || code.includes('Arrays.sort')) {
    performance -= 5;
  }

  // Check for expensive operations in loops
  const expensiveInLoopPatterns = /for\b.*\n(?:.*\n)*?.*\.(filter|map|reduce|find|sort)\s*\(/;
  if (expensiveInLoopPatterns.test(code)) {
    performance -= 10;
    findings.push('⚡ Performance: Array method inside loop — consider pre-computing');
  }

  // Repeated string concatenation
  if (/\+\s*=\s*["']/.test(code) || /\w\s*\+\s*\w\s*\+\s*\w/.test(code)) {
    if (maxLoopDepth > 0) {
      performance -= 10;
      findings.push('⚡ Performance: String concatenation in loop — use join() or template literals');
    }
  }

  // ── Maintainability Analysis ──
  let maintainability = 100;

  const commentLines = lines.filter(l => {
    const t = l.trim();
    return t.startsWith('//') || t.startsWith('#') || t.startsWith('/*') || t.startsWith('*');
  }).length;
  const commentRatio = lineCount > 0 ? commentLines / lineCount : 0;
  const avgLineLength = charCount / Math.max(lineCount, 1);

  if (commentRatio < 0.05 && lineCount > 30) {
    maintainability -= 15;
    findings.push('📝 Maintainability: Very low comment density (<5%) — add documentation');
  }

  if (avgLineLength > 100) {
    maintainability -= 15;
    findings.push('📝 Maintainability: Average line length exceeds 100 chars — break up long lines');
  } else if (avgLineLength > 80) {
    maintainability -= 8;
  }

  if (lineCount > 500) {
    maintainability -= 15;
    findings.push('📝 Maintainability: File exceeds 500 lines — consider splitting into modules');
  } else if (lineCount > 300) {
    maintainability -= 8;
    findings.push('📝 Maintainability: File exceeds 300 lines — approaching maintenance threshold');
  }

  // Function length check
  const longFunctionPattern = /(?:function\s+\w+|def\s+\w+|=>\s*\{)[^}]{2000,}/;
  if (longFunctionPattern.test(code)) {
    maintainability -= 12;
    findings.push('📝 Maintainability: Very long function detected — extract helper functions');
  }

  // Magic numbers
  const magicNumberMatches = code.match(/(?<!=)\b\d{2,}\b(?!\s*[;,\]})])/g);
  if (magicNumberMatches && magicNumberMatches.length > 5) {
    maintainability -= 8;
    findings.push('📝 Maintainability: Multiple magic numbers — use named constants');
  }

  // Bare exception handlers
  if (/catch\s*\(\s*\)/.test(code) || /except\s*:/.test(code)) {
    maintainability -= 10;
    findings.push('📝 Maintainability: Bare exception handler — specify exception types');
  }

  // Deeply nested conditionals
  let maxIndent = 0;
  for (const line of lines) {
    const leadingSpaces = line.match(/^(\s*)/)?.[1]?.length || 0;
    const indentLevel = Math.floor(leadingSpaces / (language === 'python' ? 4 : 2));
    maxIndent = Math.max(maxIndent, indentLevel);
  }
  if (maxIndent > 6) {
    maintainability -= 12;
    findings.push('📝 Maintainability: Deep nesting detected (>6 levels) — flatten conditionals');
  }

  // ── Reliability Analysis ──
  let reliability = 100;

  // No input validation
  const hasFunctions = functionNames.length > 0;
  const hasTypeChecks = /\b(isinstance|typeof|is_a\?|@type)\b/.test(code);
  const hasAssertions = /\b(assert|expect|should)\b/.test(code);
  
  if (hasFunctions && !hasTypeChecks && !hasAssertions && lineCount > 30) {
    reliability -= 12;
    findings.push('🛡️ Reliability: No input validation or type checking detected');
  }

  if (!hasErrorHandling && lineCount > 15) {
    reliability -= 15;
    findings.push('🛡️ Reliability: No error handling — add try/catch or error guards');
  }

  // Division without zero check
  if (/\/\s*\w+/.test(code) && !/!==?\s*0|>\s*0|!= 0/.test(code)) {
    reliability -= 8;
    findings.push('🛡️ Reliability: Division without zero-check detected');
  }

  // Null/undefined access risk
  if (/\.\w+\.\w+\.\w+/.test(code) && !/\?\.\w+/.test(code)) {
    reliability -= 8;
    findings.push('🛡️ Reliability: Deep property access without optional chaining');
  }

  // TODO/FIXME/HACK markers
  const todoCount = (code.match(/\b(TODO|FIXME|HACK|XXX|BUG)\b/gi) || []).length;
  if (todoCount > 0) {
    reliability -= Math.min(todoCount * 5, 15);
    findings.push(`🛡️ Reliability: ${todoCount} TODO/FIXME marker(s) — unresolved issues`);
  }

  // ── Calculate Quality (Weighted Average) ──
  const quality = Math.round(
    security * 0.25 +
    performance * 0.25 +
    maintainability * 0.25 +
    reliability * 0.25
  );

  return {
    metrics: {
      quality: clamp(quality),
      security: clamp(security),
      performance: clamp(performance),
      maintainability: clamp(maintainability),
      reliability: clamp(reliability),
    },
    findings,
  };
}
