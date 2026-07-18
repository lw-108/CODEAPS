import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export interface SearchResult {
    file: string;
    line: number;
    column: number;
    content: string;
    filename: string;
}

export const useSearch = () => {
    const { workspacePath } = useWorkspaceStore();
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const search = useCallback(async (query: string, caseSensitive: boolean = false) => {
        if (!workspacePath || workspacePath === '__untitled__' || !query.trim()) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const results = await invoke('search_files', { 
                path: workspacePath, 
                query, 
                caseSensitive,
                maxResults: 100
            }) as SearchResult[];
            setResults(results);
        } catch (err) {
            console.error('Search failed:', err);
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [workspacePath]);

    const clearResults = useCallback(() => {
        setResults([]);
    }, []);

    return { results, isSearching, search, clearResults };
};
