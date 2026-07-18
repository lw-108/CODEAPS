import { useCallback, useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

export const useTerminal = (onData: (data: string) => void) => {
  const [isReady, setIsReady] = useState(false);
  const commandQueueRef = useRef<string[]>([]);
  
  useEffect(() => {
    let unlisten: any;
    let isCancelled = false;
    
    const setupListener = async () => {
      const fn = await listen('terminal-output', (event: any) => {
        if (!isCancelled && event.payload && typeof event.payload.data === 'string') {
          onData(event.payload.data);
        }
      });
      
      if (isCancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    };

    setupListener();

    return () => {
      isCancelled = true;
      if (unlisten) unlisten();
    };
  }, [onData]);

  const createTerminal = useCallback(async (path?: string) => {
    try {
      setIsReady(false);
      await invoke('create_terminal', { path });
      setIsReady(true);
      
      // Automatic Neural Flush: Dispatch queued commands once terminal is validated
      if (commandQueueRef.current.length > 0) {
        const queue = [...commandQueueRef.current];
        commandQueueRef.current = [];
        for (const cmd of queue) {
          await invoke('write_terminal', { input: cmd });
        }
      }
    } catch (err: any) {
      console.error('Failed to create terminal:', err);
      onData(`\r\n\x1b[31m[ KINETIC ERROR: ]\x1b[0m ${err.toString()}\r\n`);
    }
  }, [onData]);

  const write = useCallback(async (data: string) => {
    if (!isReady) {
        commandQueueRef.current.push(data);
        return;
    }
    try {
        await invoke('write_terminal', { input: data });
    } catch (err: any) {
        // If session lost mid-operation, queue it and signal a need for reset
        commandQueueRef.current.push(data);
        setIsReady(false);
        onData(`\r\n[ NEURAL LINK INTERRUPTED: Queuing for Re-sync ]\r\n`);
    }
  }, [isReady, onData]);

  const resize = useCallback(async (rows: number, cols: number) => {
    try {
        await invoke('resize_terminal', { rows, cols });
    } catch (err: any) {
        console.error('Failed to resize terminal:', err);
    }
  }, []);

  return { createTerminal, write, resize, isReady };
};
