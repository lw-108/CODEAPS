import * as monaco from 'monaco-editor';
import { LspClient } from '@/lsp/client';

export const registerLspProviders = (language: string, client: LspClient) => {
    // Register Definition Provider
    monaco.languages.registerDefinitionProvider(language, {
        provideDefinition: async (model: any, position: any) => {
            const result = await client.request('textDocument/definition', {
                textDocument: { uri: model.uri.toString() },
                position: { line: position.lineNumber - 1, character: position.column - 1 }
            });
            return result;
        }
    });

    // Register Hover Provider
    monaco.languages.registerHoverProvider(language, {
        provideHover: async (model: any, position: any) => {
            const result = await client.request('textDocument/hover', {
                textDocument: { uri: model.uri.toString() },
                position: { line: position.lineNumber - 1, character: position.column - 1 }
            });
            return result;
        }
    });

    // Register Completion Item Provider (THE SUGGESTIONS ENGINE)
    monaco.languages.registerCompletionItemProvider(language, {
        triggerCharacters: ['.', ':', '(', '"', "'", '/'],
        provideCompletionItems: async (model: any, position: any) => {
            const result = await client.request('textDocument/completion', {
                textDocument: { uri: model.uri.toString() },
                position: { line: position.lineNumber - 1, character: position.column - 1 }
            });

            if (!result) return { suggestions: [] };

            // Handle both simple arrays and CompletionList objects
            const items = Array.isArray(result) ? result : (result.items || []);
            
            const suggestions = items.map((item: any) => ({
                label: item.label,
                kind: mapLspKindToMonacoKind(item.kind),
                detail: item.detail,
                documentation: item.documentation,
                insertText: item.insertText || item.label,
                range: new monaco.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                )
            }));

            return { suggestions };
        }
    });

    console.log(`Neural Link: LSP [${language}] Intelligence Systems Active`);
};

function mapLspKindToMonacoKind(kind: number): monaco.languages.CompletionItemKind {
    const CompletionItemKind = monaco.languages.CompletionItemKind;
    switch (kind) {
        case 1: return CompletionItemKind.Text;
        case 2: return CompletionItemKind.Method;
        case 3: return CompletionItemKind.Function;
        case 4: return CompletionItemKind.Constructor;
        case 5: return CompletionItemKind.Field;
        case 6: return CompletionItemKind.Variable;
        case 7: return CompletionItemKind.Class;
        case 8: return CompletionItemKind.Interface;
        case 9: return CompletionItemKind.Module;
        case 10: return CompletionItemKind.Property;
        case 11: return CompletionItemKind.Unit;
        case 12: return CompletionItemKind.Value;
        case 13: return CompletionItemKind.Enum;
        case 14: return CompletionItemKind.Keyword;
        case 15: return CompletionItemKind.Snippet;
        case 16: return CompletionItemKind.Color;
        case 17: return CompletionItemKind.File;
        case 18: return CompletionItemKind.Reference;
        case 19: return CompletionItemKind.Folder;
        case 20: return CompletionItemKind.EnumMember;
        case 21: return CompletionItemKind.Constant;
        case 22: return CompletionItemKind.Struct;
        case 23: return CompletionItemKind.Event;
        case 24: return CompletionItemKind.Operator;
        case 25: return CompletionItemKind.TypeParameter;
        default: return CompletionItemKind.Property;
    }
}
