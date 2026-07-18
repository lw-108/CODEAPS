// This file provides global type definitions when @types/react is unavailable.

declare namespace React {
  export type ReactNode = any;
  export type FC<P = {}> = (props: P) => any;
  export interface ChangeEvent<T = Element> {
    target: T & { value: string };
  }
  export interface KeyboardEvent {
    key: string;
    preventDefault(): void;
    stopPropagation(): void;
  }
  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
  export function useRef<T>(initialValue: T | null): { current: T | null };
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps?: any[]): T;
  export function useCallback<T extends Function>(callback: T, deps?: any[]): T;
  
  export interface HTMLAttributes<T> {
    [key: string]: any;
  }
}

declare module 'react' {
  export = React;
}

declare module 'react-dom' {
  export const createRoot: any;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface Element extends any {}
    interface ElementClass extends any {}
    interface ElementAttributesProperty { props: {}; }
    interface ElementChildrenAttribute { children: {}; }
  }
}

declare module 'lucide-react';
declare module 'react-resizable-panels';
declare module 'clsx';
declare module 'tailwind-merge';
declare module 'tailwindcss-animate';
declare module 'zustand';
declare module 'framer-motion';
declare module 'monaco-editor';
declare module 'xterm';
declare module 'xterm-addon-fit';
declare module 'chart.js';
declare module 'split.js';
declare module 'marked';
declare module '@tauri-apps/api/dialog';
declare module '@tauri-apps/api/tauri';

declare module "*.png" {
  const value: any;
  export default value;
}

declare module "*.svg" {
  const value: any;
  export default value;
}

declare module "*.jpg" {
  const value: any;
  export default value;
}

