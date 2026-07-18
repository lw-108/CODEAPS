/**
 * OllamaService: Frontend bridge to the CodeAps AI backend.
 * Synchronized with the /api/v1/ollama endpoint suite.
 */

class OllamaService {
    private baseUrl: string = 'http://127.0.0.1:8000/api/v1/ollama';
    private directBaseUrl: string = 'http://127.0.0.1:11434/api';

    async checkStatus() {
        // First try the backend proxy endpoint
        try {
            const resp = await fetch(`${this.baseUrl}/status`);
            if (resp.ok) {
                const data = await resp.json();
                // Backend returns { status, models }
                if (data?.models) {
                    const models = data.models.map((m: any) => m.name);
                    console.log('[OllamaService] Backend status OK');
                    return { status: 'running', models };
                }
                return { status: data?.status || 'unknown' };
            }
        } catch (e) {
            console.warn('[OllamaService] Backend status check failed, falling back to direct Ollama:', e);
        }
        // Fallback: query the direct Ollama /api/tags endpoint
        try {
            const resp = await fetch(`${this.directBaseUrl}/tags`);
            if (resp.ok) {
                const data = await resp.json();
                const models = data.models?.map((m: any) => m.name) ?? [];
                console.log('[OllamaService] Direct Ollama status OK');
                return { status: 'running', models };
            }
        } catch (e) {
            console.error('[OllamaService] Direct Ollama status failed:', e);
        }
        return { status: 'offline', message: 'Neural Link disconnected' };
    }

    async generate(prompt: string, options: any = {}) {
        console.log(`[OllamaService] Generating at: ${this.baseUrl}/generate`, { prompt: prompt.substring(0, 50) + '...' });
        try {
            const response = await fetch(`${this.baseUrl}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    system_prompt: options.system_prompt,
                    model: options.model,
                    temperature: options.temperature || 0.2,
                    max_tokens: options.max_tokens || 2048
                })
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Generation failed (${response.status}): ${errText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('[OllamaService] Network Error during generation:', error);
            return { response: 'Error: Cannot reach Neural Link' };
        }
    }

    async chat(messages: any[], options: any = {}, onChunk?: (chunk: string) => void) {
        try {
            const response = await fetch(`${this.baseUrl}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    messages, 
                    model: options.model,
                    files: options.files 
                })
            });
            if (!response.ok) throw new Error("Chat failed");
            
            if (!response.body) throw new Error("No response body");
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                fullResponse += chunk;
                if (onChunk) onChunk(chunk);
            }
            
            return { response: fullResponse };
        } catch (error) {
            console.error('Chat Error:', error);
            return { response: 'Error: Cannot reach Neural Link' };
        }
    }

    async explain(code: string, language: string = 'python') {
        const response = await fetch(`${this.baseUrl}/explain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language })
        });
        return await response.json();
    }

    async optimize(code: string, language: string = 'python', target: string = 'time', context?: string) {
        const response = await fetch(`${this.baseUrl}/optimize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language, target, context })
        });
        return await response.json();
    }

    async syncRag(filepath: string, content: string) {
        console.log(`[OllamaService] Syncing RAG context for ${filepath}...`);
        try {
            const response = await fetch(`${this.baseUrl}/rag/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filepath, content })
            });
            if (!response.ok) throw new Error("RAG sync failed");
            return await response.json();
        } catch (error) {
            console.error('[OllamaService] RAG Sync Error:', error);
            return { status: 'error' };
        }
    }

    async updateConfig(ollamaPath?: string, modelDir?: string) {
        console.log(`[OllamaService] Updating configuration...`);
        try {
            const response = await fetch(`${this.baseUrl.replace('/ollama', '/ollama/config')}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ollama_path: ollamaPath, model_dir: modelDir })
            });
            return await response.json();
        } catch (error) {
            console.error('[OllamaService] Config Update Error:', error);
            return { status: 'error' };
        }
    }

    async pullModel(model: string, onProgress: (data: any) => void) {
        console.log(`[OllamaService] Pulling model: ${model}...`);
        try {
            const response = await fetch(`${this.baseUrl.replace('/ollama', '/ollama/pull')}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model })
            });

            if (!response.body) throw new Error("No response body");
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            onProgress(data);
                        } catch (e) {
                            continue;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[OllamaService] Pull Model Error:', error);
            onProgress({ status: 'error', message: 'Failed to initiate model pull' });
        }
    }
}

export const ollamaService = new OllamaService();
