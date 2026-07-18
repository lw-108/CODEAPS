import { ollamaService } from './OllamaService';
import { useRefactorStore, RefactorProposal } from '@/store/useRefactorStore';
import { invoke } from '@tauri-apps/api/tauri';

class RefactorService {
  async runRefactor(
    instruction: string, 
    selectedCode: string, 
    filePath: string,
    allOpenedFiles: Record<string, string>
  ): Promise<RefactorProposal[]> {
    const filename = filePath.split(/[\\/]/).pop() || filePath;
    
    // Prepare extended context
    const contextStr = Object.entries(allOpenedFiles)
      .map(([path, content]) => `FILE: ${path}\nCONTENT:\n${content}\n---`)
      .join('\n');

    const systemPrompt = `You are the CodeAps Collaborative Refactor Engine.
Your goal is to execute code transformations across one or more files based on a user instruction and a selection.

RULES:
1. ALWAYS return a valid JSON array of objects.
2. Each object must have: "path" (system path), "action" ("modify" or "create"), and "content" (the full new content of the file).
3. If you create a new file, specify a path relative to the current workspace.
4. If you modify the current file, provide the ENTIRE content of the file, not just the diff.
5. Be concise in your logic but exhaustive in your implementation.
6. STRICT DIRECTIVE: Return ONLY the JSON array. ABSOLUTELY NO conversational text, NO preamble, and NO explanation before or after the JSON.

Current File: ${filePath}
Selection Highlights:
${selectedCode}

Workspace Context (Open Tabs):
${contextStr}

User Instruction: "${instruction}"`;

    try {
      const response = await ollamaService.generate(instruction, {
        system_prompt: systemPrompt,
        temperature: 0.1, // Low temperature for code reliability
        model: 'mistral' // Or whatever model is active
      });

      const jsonStr = this._extractJson(response.response);
      const changes = JSON.parse(jsonStr);

      const proposals: RefactorProposal[] = await Promise.all(changes.map(async (change: any) => {
        let originalContent = '';
        if (change.action === 'modify') {
          // Try to fetch original content if it's already in our context
          originalContent = allOpenedFiles[change.path] || '';
          // If not in context, we could fetch from disk, but for now we assume it's open
        }

        return {
          filePath: change.path,
          filename: change.path.split(/[\\/]/).pop() || change.path,
          originalContent,
          newContent: change.content,
          status: 'pending' as const
        };
      }));

      return proposals;
    } catch (err) {
      console.error('Refactor generation failed:', err);
      throw err;
    }
  }

  private _extractJson(text: string): string {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end === -1) throw new Error('Refactor engine failed to return structured data.');
    return text.substring(start, end + 1);
  }
}

export const refactorService = new RefactorService();
