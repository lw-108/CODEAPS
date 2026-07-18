import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { aiCompletionService } from '@/services/aiCompletionService';
import { useSettingsStore } from '@/store/useSettingsStore';

export const useInlineCompletions = (editor: any) => {
    const providerRef = useRef<any>(null);
    const { neuralCompletions } = useSettingsStore();

    useEffect(() => {
        if (!editor) return;

        // Cleanup previous provider
        if (providerRef.current) {
            providerRef.current.dispose();
        }

        console.log('Neural Link: Registering Inline Completions Provider');

        providerRef.current = monaco.languages.registerInlineCompletionsProvider(
            { pattern: '**/*' }, // Register for all files
            {
                provideInlineCompletions: async (model: any, position: any, context: any, token: any) => {
                    // Only provide completions if enabled in settings and not cancelled
                    if (!neuralCompletions || token.isCancellationRequested) {
                        return { items: [] };
                    }

                    const word = model.getWordUntilPosition(position);
                    
                    // Simple debounce/gate: don't trigger if cursor is in middle of word unless specifically asked
                    // or if the line is very short.
                    // For now, let's just use the position.
                    
                    const prefix = model.getValueInRange({
                        startLineNumber: Math.max(1, position.lineNumber - 50), // 50 lines of context
                        startColumn: 1,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column
                    });

                    const suffix = model.getValueInRange({
                        startLineNumber: position.lineNumber,
                        startColumn: position.column,
                        endLineNumber: Math.min(model.getLineCount(), position.lineNumber + 50),
                        endColumn: model.getLineMaxColumn(Math.min(model.getLineCount(), position.lineNumber + 50))
                    });

                    try {
                        const completion = await aiCompletionService.complete({
                            prefix,
                            suffix,
                        });

                        if (!completion || completion.trim() === '') {
                            return { items: [] };
                        }

                        return {
                            items: [
                                {
                                    insertText: completion,
                                    range: new monaco.Range(
                                        position.lineNumber,
                                        position.column,
                                        position.lineNumber,
                                        position.column
                                    ),
                                },
                            ],
                        };
                    } catch (err) {
                        console.error('Inline Completion Provider Error:', err);
                        return { items: [] };
                    }
                },
                freeInlineCompletions: () => {},
            }
        );

        return () => {
            if (providerRef.current) {
                providerRef.current.dispose();
            }
        };
    }, [editor]);
};
