import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useSettingsStore } from '@/store/useSettingsStore';

export interface FileInfo {
  name: string;
  path: string;
  is_directory: boolean;
  is_dir: boolean;
  children?: FileInfo[];
}

export const useFileSystem = () => {
  const [entries, setEntries] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTauriConnected, setIsTauriConnected] = useState(false);
  const { telemetry } = useSettingsStore();

  useEffect(() => {
    // Check if running in a Tauri environment
    const checkTauri = async () => {
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;
      if (isTauri) {
        if (!(window as any)._CODEAPS_TAURI_LOGGED && telemetry) {
            console.log("✅ CodeAps: Tauri bridge detected.");
            (window as any)._CODEAPS_TAURI_LOGGED = true;
        }
        setIsTauriConnected(true);
      } else {
        if (!(window as any)._CODEAPS_TAURI_LOGGED && telemetry) {
            console.warn("⚠️ CodeAps: Running in a standard browser. Native features (File Explorer, Run) will be disabled.");
            (window as any)._CODEAPS_TAURI_LOGGED = true;
        }
        setIsTauriConnected(false);
      }
    };
    checkTauri();
  }, [telemetry]);


  // ── Native Dialogs (Backend Driven) ──

  const checkPathExists = useCallback(async (path: string) => {
    try {
      return await (invoke as any)('check_path_exists', { path }) as boolean;
    } catch {
      return false;
    }
  }, []);

  const getUniquePath = useCallback(async (path: string) => {
    let currentPath = path;
    let counter = 1;
    
    while (await checkPathExists(currentPath)) {
      const lastDot = path.lastIndexOf('.');
      const dirSep = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
      
      if (lastDot > dirSep) {
        // File with extension
        const base = path.substring(0, lastDot);
        const ext = path.substring(lastDot);
        currentPath = `${base} (copy ${counter})${ext}`;
      } else {
        // Directory or no extension
        currentPath = `${path} (copy ${counter})`;
      }
      counter++;
      if (counter > 50) break; // Circuit breaker
    }
    return currentPath;
  }, [checkPathExists]);

  const emitRefresh = useCallback(async (path: string) => {
    try {
        const { emit } = await import('@tauri-apps/api/event');
        // Extract parent if it's a file
        const parent = path.includes('.') ? path.substring(0, Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'))) : path;
        console.log(`📡 CodeAps [FS]: Broadcasting refresh for: ${parent}`);
        await emit('refresh-directory', { path: parent });
    } catch (err) {
        console.error("Failed to emit refresh event:", err);
    }
  }, []);

  const readDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await (invoke as any)('read_directory', { path }) as FileInfo[];
      const mapped = result.map((e: any) => ({ 
        ...e, 
        is_dir: e.is_directory || e.is_dir 
      }));
      setEntries(mapped);
      return mapped;
    } catch (err: any) {
      console.error('CodeAps: readDirectory error:', err);
      setError(err.toString());
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const readFile = useCallback(async (path: string) => {
    try {
      return await (invoke as any)('read_file_content', { path }) as string;
    } catch (err: any) {
      console.error('CodeAps: readFile error:', err);
      return '';
    }
  }, []);

  const writeFile = useCallback(async (path: string, content: string) => {
    try {
      await (invoke as any)('write_file_content', { path, content });
      emitRefresh(path);
      return true;
    } catch (err: any) {
      console.error('CodeAps: writeFile error:', err);
      return false;
    }
  }, [emitRefresh]);

  const createFile = useCallback(async (path: string) => {
    try {
      await (invoke as any)('create_new_file', { path });
      emitRefresh(path);
      return true;
    } catch (err: any) {
      console.error('CodeAps: createFile error:', err);
      return false;
    }
  }, [emitRefresh]);

  const createDirectory = useCallback(async (path: string) => {
    try {
      await (invoke as any)('create_new_directory', { path });
      emitRefresh(path);
      return true;
    } catch (err: any) {
      console.error('CodeAps: createDirectory error:', err);
      return false;
    }
  }, [emitRefresh]);

  const deleteItem = useCallback(async (path: string) => {
    try {
      console.log(`🗑️ CodeAps [FS]: Attempting to delete: ${path}`);
      await (invoke as any)('delete_item', { path });
      emitRefresh(path);
      return { success: true };
    } catch (err: any) {
      console.error('❌ CodeAps: deleteItem failed:', err);
      return { success: false, error: err.toString() };
    }
  }, [emitRefresh]);

  const renameItem = useCallback(async (old_path: string, new_path: string) => {
    try {
      console.log(`CodeAps [FS]: Attempting rename/move: ${old_path} -> ${new_path}`);
      const success = await (invoke as any)('rename_item', { old_path, new_path }) as boolean;
      if (success) {
        emitRefresh(old_path); // Refresh source parent
        emitRefresh(new_path); // Refresh destination parent
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('CodeAps: renameItem error:', err);
      throw new Error(err); // Throw so UI can alert specific message
    }
  }, [emitRefresh]);

  const copyItem = useCallback(async (source: string, destination: string) => {
    try {
      const success = await (invoke as any)('copy_item', { source, destination }) as boolean;
      if (success) {
        emitRefresh(destination);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('CodeAps: copyItem error:', err);
      throw new Error(err);
    }
  }, [emitRefresh]);

  // ── Native Dialogs (Backend Driven) ──

  const openFolderDialog = useCallback(async () => {
    console.log("🚀 CodeAps [FRONTEND]: Requested open_folder_dialog...");
    try {
      // Direct invoke call with explicit logging
      console.log("⏳ CodeAps [BACKEND]: Sending invoke command...");
      const selected = await (invoke as any)('open_folder_dialog') as string | null;
      
      if (selected) {
        console.log("✨ CodeAps [BACKEND]: Success! Selected folder:", selected);
        return selected;
      } else {
        console.log("ℹ️ CodeAps [BACKEND]: Dialog closed by user (or returned null).");
      }
      
      return null;
    } catch (err) {
      console.error('❌ CodeAps [ERROR]: open_folder_dialog failed:', err);
      return null;
    }
  }, []);

  const saveAsDialog = useCallback(async (defaultFilename?: string) => {
    console.log("🚀 CodeAps [FRONTEND]: Requested save_as_dialog...");
    try {
      console.log("⏳ CodeAps [BACKEND]: Sending invoke command...");
      const selected = await (invoke as any)('save_file_dialog', { defaultFilename }) as string | null;
      if (selected) {
        console.log("✨ CodeAps [BACKEND]: Success! Selected save path:", selected);
        return selected;
      }

      return null;
    } catch (err) {
      console.error('❌ CodeAps [ERROR]: save_file_dialog failed:', err);
      return null;
    }
  }, []);

  const revealInExplorer = useCallback(async (path: string) => {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        const { open } = (window as any).__TAURI__.shell;
        await open(path);
        return true;
      }
      return false;
    } catch (err) {
      console.error('❌ CodeAps [ERROR]: revealInExplorer failed:', err);
      return false;
    }
  }, []);

  return { 
    entries, isLoading, error, isTauriConnected,
    readDirectory, readFile, writeFile, 
    createFile, createDirectory, deleteItem, renameItem, copyItem,
    openFolderDialog, saveAsDialog, revealInExplorer,
    getUniquePath, emitRefresh, checkPathExists
  };
};
