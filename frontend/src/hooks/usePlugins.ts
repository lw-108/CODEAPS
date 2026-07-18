import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useEditorStore } from '@/store/useEditorStore';

export interface PluginInfo {
  name: string;
  status: 'loaded' | 'unloaded' | 'error';
  path: string;
}

export const usePlugins = () => {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const { getActiveTab } = useEditorStore();

  const refreshPlugins = useCallback(async () => {
    try {
      const available: string[] = await invoke('scan_plugins');
      const loaded: string[] = await invoke('list_plugins');
      
      const pluginInfos = available.map(name => ({
        name,
        status: (loaded.includes(name) ? 'loaded' : 'unloaded') as 'loaded' | 'unloaded',
        path: `plugins/${name}.wasm`
      }));
      setPlugins(pluginInfos);
    } catch (err) {
      console.error('[Plugins] Failed to refresh plugin list:', err);
    }
  }, []);

  const loadPlugin = async (name: string, path: string) => {
    setLoading(true);
    try {
      const activeTab = getActiveTab();
      const currentCode = activeTab?.content || '';
      const result = await invoke('load_plugin', { name, path, currentCode });
      console.log(`[Plugins] ${result}`);
      await refreshPlugins();
    } catch (err) {
      console.error(`[Plugins] Failed to load ${name}:`, err);
    } finally {
      setLoading(false);
    }
  };

  const runHook = async (pluginName: string, hook: string) => {
    try {
      const result: string = await invoke('call_plugin_hook', { name: pluginName, hook });
      console.log(`[Plugins] Hook Result: ${result}`);
      return result;
    } catch (err) {
      console.error(`[Plugins] Hook '${hook}' failed for ${pluginName}:`, err);
      throw err;
    }
  };

  useEffect(() => {
    refreshPlugins();
  }, [refreshPlugins]);

  return {
    plugins,
    loading,
    loadPlugin,
    runHook,
    refreshPlugins
  };
};
