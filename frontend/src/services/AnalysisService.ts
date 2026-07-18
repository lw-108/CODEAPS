/**
 * AnalysisService: Frontend bridge for real-time code complexity and memory analysis.
 * Features a local heuristic fallback so diagnostics always work, even without the backend.
 */

export interface AnalysisResponse {
  radarMetrics: {
    scalability: number;
    maintainability: number;
    memoryEfficiency: number;
    cpuUsage: number;
    ioEfficiency: number;
    concurrency: number;
  };
  systemBars: {
    heap: number;
    stack: number;
    cpu: number;
    io: number;
  };
  complexity: {
    time: string;
    space: string;
    explanation: string;
    predictedRuntimeMs?: number;
  };
  memory_map: Array<{
    line: number;
    type: 'heap' | 'stack';
    size: number;
  }>;
  miniChatMessages: Array<{
    line: number;
    message: string;
    type: 'info' | 'warning';
  }>;
  source: 'ai' | 'heuristic';
}

class AnalysisService {
  private baseUrl: string = 'http://127.0.0.1:8000/api/v1/analysis';

  async analyze(code: string, filename: string, language: string, externalSignal?: AbortSignal): Promise<AnalysisResponse | null> {
    // Always compute local heuristics first (instant, zero-latency)
    const localResult = this._localAnalyze(code, filename, language);

    const maxRetries = 3;
    let retryCount = 0;

    const performFetch = async (): Promise<any> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s internal timeout
        
        // Link external signal to this controller if provided
        if (externalSignal) {
          externalSignal.addEventListener('abort', () => controller.abort());
          if (externalSignal.aborted) controller.abort();
        }

        const response = await fetch(`${this.baseUrl}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, filename, language }),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (response.status === 503 && retryCount < maxRetries) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s...
          console.warn(`[AnalysisService] Server busy (503), retrying in ${delay}ms (Attempt ${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return performFetch();
        }

        if (!response.ok) throw new Error(`Analysis failed: ${response.status}`);
        const data = await response.json();

        // ── Check for Backend-level Errors (Ollama 503 as 200 OK) ──
        if (data.error && retryCount < maxRetries) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000;
          console.warn(`[AnalysisService] Backend reported error: ${data.error}. Retrying (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return performFetch();
        }

        return data;
      } catch (err) {
        if (retryCount < maxRetries && (err as Error).name !== 'AbortError') {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return performFetch();
        }
        throw err;
      }
    };

    try {
      const backendResult = await performFetch();

      // Merge: prefer backend AI data when available, fall back to local heuristics
      return {
        radarMetrics: this._hasValidRadar(backendResult.radarMetrics) 
          ? backendResult.radarMetrics 
          : localResult.radarMetrics,
        systemBars: backendResult.systemBars || localResult.systemBars,
        complexity: backendResult.complexity || localResult.complexity,
        memory_map: backendResult.memory_map || localResult.memory_map,
        miniChatMessages: backendResult.aiSuggestions || localResult.miniChatMessages,
        source: 'ai'
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') return localResult;
      console.warn('[AnalysisService] Backend unavailable, using local heuristics:', (error as Error).message);
      // Return local heuristic result as fallback
      return localResult;
    }
  }

  /** Check if radar metrics from the backend have real values (not all zeros) */
  private _hasValidRadar(radar: any): boolean {
    if (!radar) return false;
    const values = Object.values(radar) as number[];
    return values.some(v => typeof v === 'number' && v > 0);
  }

  /** Pure local heuristic analysis — works instantly, no backend needed */
  private _localAnalyze(code: string, filename: string, language: string): AnalysisResponse {
    const lines = code.split('\n');
    const lineCount = lines.length;
    const charCount = code.length;

    // --- Complexity Detection ---
    let loopDepth = 0;
    let maxLoopDepth = 0;
    let currentDepth = 0;
    let hasRecursion = false;
    let functionNames: string[] = [];

    const loopPatterns = /\b(for|while|do)\b/;
    const funcDefPatterns = /(?:function\s+(\w+)|def\s+(\w+)|fn\s+(\w+)|(\w+)\s*=\s*(?:async\s+)?(?:\(|function))/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) continue;

      // Detect function definitions
      const funcMatch = trimmed.match(funcDefPatterns);
      if (funcMatch) {
        const name = funcMatch[1] || funcMatch[2] || funcMatch[3] || funcMatch[4];
        if (name) functionNames.push(name);
      }

      // Track loop nesting
      if (loopPatterns.test(trimmed)) {
        currentDepth++;
        maxLoopDepth = Math.max(maxLoopDepth, currentDepth);
      }
      if (trimmed.includes('}') || (trimmed === '' && currentDepth > 0)) {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    // Check for recursion (function calls its own name)
    for (const name of functionNames) {
      const callPattern = new RegExp(`\\b${name}\\s*\\(`, 'g');
      const matches = code.match(callPattern);
      if (matches && matches.length >= 2) {
        hasRecursion = true;
        break;
      }
    }

    // Determine Big-O
    let timeComplexity = 'O(1)';
    let spaceComplexity = 'O(1)';
    let explanation = 'No significant computational patterns detected.';

    if (hasRecursion && maxLoopDepth >= 1) {
      timeComplexity = 'O(2^n)';
      spaceComplexity = 'O(n)';
      explanation = 'Recursive calls combined with loops suggest exponential time complexity.';
    } else if (hasRecursion) {
      timeComplexity = 'O(n)';
      spaceComplexity = 'O(n)';
      explanation = 'Recursive function detected. Stack depth grows linearly.';
    } else if (maxLoopDepth >= 3) {
      timeComplexity = 'O(n^3)';
      spaceComplexity = 'O(n)';
      explanation = 'Triple-nested loops detected. Consider algorithmic optimization.';
    } else if (maxLoopDepth === 2) {
      timeComplexity = 'O(n^2)';
      spaceComplexity = 'O(n)';
      explanation = 'Nested loops detected. Quadratic time growth with input size.';
    } else if (maxLoopDepth === 1) {
      timeComplexity = 'O(n)';
      spaceComplexity = 'O(1)';
      explanation = 'Single-level iteration. Linear time complexity.';
    } else if (code.includes('.sort(') || code.includes('sorted(') || code.includes('Arrays.sort')) {
      timeComplexity = 'O(n log n)';
      spaceComplexity = 'O(n)';
      explanation = 'Sort operation detected. Typical comparison-based sort complexity.';
    }

    // Runtime estimate based on complexity
    const runtimeMap: Record<string, number> = {
      'O(1)': 1, 'O(log n)': 4, 'O(n)': 18, 'O(n log n)': 45,
      'O(n^2)': 950, 'O(n^3)': 8500, 'O(2^n)': 4800
    };
    const predictedRuntimeMs = runtimeMap[timeComplexity] || 10;

    // --- Radar Metrics (heuristic scoring) ---
    const commentLines = lines.filter(l => {
      const t = l.trim();
      return t.startsWith('//') || t.startsWith('#') || t.startsWith('/*') || t.startsWith('*');
    }).length;
    const commentRatio = lineCount > 0 ? commentLines / lineCount : 0;

    const avgLineLength = charCount / Math.max(lineCount, 1);
    const hasErrorHandling = /\b(try|catch|except|finally|rescue|Result<|Option<)\b/.test(code);
    const hasAsync = /\b(async|await|Promise|Future|tokio|asyncio)\b/.test(code);
    const hasImports = /\b(import|require|use |#include|from .+ import)\b/.test(code);

    const maintainability = Math.min(100, Math.max(10,
      100
      - (avgLineLength > 80 ? 20 : 0)
      - (commentRatio < 0.05 ? 15 : 0)
      - (lineCount > 500 ? 15 : 0)
      - (maxLoopDepth >= 3 ? 20 : 0)
      + (hasErrorHandling ? 10 : 0)
      + (commentRatio > 0.15 ? 10 : 0)
    ));

    const scalability = Math.min(100, Math.max(10,
      100
      - (maxLoopDepth >= 2 ? 30 : 0)
      - (hasRecursion ? 15 : 0)
      + (hasAsync ? 20 : 0)
    ));

    const memoryEfficiency = Math.min(100, Math.max(10,
      100
      - (code.match(/\b(list|array|vector|ArrayList|Vec<|HashMap|dict)\b/gi)?.length || 0) * 8
      - (lineCount > 300 ? 10 : 0)
    ));

    const cpuUsage = Math.min(100, Math.max(5, maxLoopDepth * 20 + (hasRecursion ? 30 : 0)));

    const ioEfficiency = Math.min(100, Math.max(10,
      (hasAsync ? 70 : 30)
      + (code.includes('fetch(') || code.includes('request') || code.includes('http') ? 20 : 0)
    ));

    const concurrency = Math.min(100, Math.max(10,
      (hasAsync ? 60 : 10)
      + (code.includes('thread') || code.includes('Thread') || code.includes('spawn') ? 25 : 0)
      + (code.includes('mutex') || code.includes('Mutex') || code.includes('lock') ? 15 : 0)
    ));

    // --- System Bars ---
    let heapScore = 15;
    let stackScore = 5;
    let cpuScore = 10;
    let ioScore = 2;

    if (hasAsync) ioScore += 40;
    if (/\b(os\.|shutil\.|fs\.|File\.)\b/.test(code)) ioScore += 30;
    if (/\b(pandas|numpy|tensorflow|torch)\b/.test(code)) heapScore += 50;
    if (/\b(Vec<|ArrayList|HashMap|dict\(|new Map)\b/.test(code)) heapScore += 20;
    if (maxLoopDepth >= 1) cpuScore += 35;
    if (/\.append\(|\.push\(|\+=/.test(code)) heapScore += 15;
    if (hasRecursion) stackScore += 30;

    // --- Memory Map ---
    const memory_map: Array<{ line: number; type: 'heap' | 'stack'; size: number }> = [];
    lines.forEach((line, i) => {
      const t = line.trim();
      if (!t || t.startsWith('//') || t.startsWith('#')) return;
      if (/\[.*for.*in.*\]|= list\(|= \[\]|new Array/.test(t)) {
        memory_map.push({ line: i + 1, type: 'heap', size: 1024 });
      } else if (/\{.*:.*for.*in.*\}|= dict\(|= \{\}|new Map|new Object/.test(t)) {
        memory_map.push({ line: i + 1, type: 'heap', size: 2048 });
      } else if (/\bnew\s+\w+|= \w+\(/.test(t) && !t.includes('self.')) {
        memory_map.push({ line: i + 1, type: 'heap', size: 512 });
      }
    });

    // --- AI Suggestions (heuristic) ---
    const miniChatMessages: Array<{ line: number; message: string; type: 'info' | 'warning' }> = [];
    lines.forEach((line, i) => {
      const t = line.trim();
      if (t.length > 120) {
        miniChatMessages.push({ line: i + 1, message: 'Line exceeds 120 chars. Consider breaking it up for readability.', type: 'info' });
      }
      if (/\b(eval|exec)\s*\(/.test(t)) {
        miniChatMessages.push({ line: i + 1, message: 'Avoid eval/exec — security risk and performance penalty.', type: 'warning' });
      }
      if (/catch\s*\(\s*\)/.test(t) || /except\s*:/.test(t)) {
        miniChatMessages.push({ line: i + 1, message: 'Bare exception handler. Specify the exception type for safer error handling.', type: 'warning' });
      }
    });

    if (maxLoopDepth >= 2) {
      miniChatMessages.push({ line: 1, message: `Nested loop depth of ${maxLoopDepth} detected. Consider using hash maps or sorting to reduce complexity.`, type: 'warning' });
    }

    return {
      radarMetrics: {
        scalability,
        maintainability,
        memoryEfficiency,
        cpuUsage,
        ioEfficiency,
        concurrency,
      },
      systemBars: {
        heap: Math.min(heapScore, 100),
        stack: Math.min(stackScore, 100),
        cpu: Math.min(cpuScore, 100),
        io: Math.min(ioScore, 100),
      },
      complexity: {
        time: timeComplexity,
        space: spaceComplexity,
        explanation,
        predictedRuntimeMs,
      },
      memory_map,
      miniChatMessages,
      source: 'heuristic'
    };
  }
}

export const analysisService = new AnalysisService();
