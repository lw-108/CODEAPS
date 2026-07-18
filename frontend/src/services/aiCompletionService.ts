import { invoke } from '@tauri-apps/api/tauri';

export interface CompletionRequest {
    prefix: string;
    suffix: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface CompletionResponse {
    response: string;
}

const completionCache = new Map<string, string>();

export const aiCompletionService = {
    complete: async (request: CompletionRequest): Promise<string> => {
        const cacheKey = `${request.prefix}|${request.suffix}`;
        if (completionCache.has(cacheKey)) {
            return completionCache.get(cacheKey)!;
        }

        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/ollama/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prefix: request.prefix,
                    suffix: request.suffix,
                    model: request.model,
                    temperature: request.temperature ?? 0.0,
                    max_tokens: request.maxTokens ?? 64,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json() as CompletionResponse;
            const finalResponse = data.response;
            
            // Limit cache size to 100 entries
            if (completionCache.size > 100) {
                const firstKey = completionCache.keys().next().value;
                completionCache.delete(firstKey);
            }
            completionCache.set(cacheKey, finalResponse);

            return finalResponse;
        } catch (error) {
            console.error('AI Completion Service Error:', error);
            return '';
        }
    }
};
