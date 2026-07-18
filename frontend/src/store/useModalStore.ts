import { create } from 'zustand';

type ModalType = 'alert' | 'confirm' | 'prompt' | 'select';

interface ModalOptions {
  title: string;
  message: string;
  defaultValue?: string;
  type: ModalType;
  items?: { id: string; label: string }[];
}

interface ModalState {
  isOpen: boolean;
  options: ModalOptions | null;
  resolve: ((value: any) => void) | null;
  
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, title?: string) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
  select: (message: string, items: { id: string; label: string }[], title?: string) => Promise<string | null>;
  
  submit: (value?: any) => void;
  cancel: () => void;
}

export const useModalStore = create<ModalState>((set, get) => ({
  isOpen: false,
  options: null,
  resolve: null,

  alert: (message, title = 'System Alert') => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        options: { title, message, type: 'alert' },
        resolve,
      });
    });
  },

  confirm: (message, title = 'Confirm Action') => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        options: { title, message, type: 'confirm' },
        resolve,
      });
    });
  },

  prompt: (message, defaultValue = '', title = 'Input Required') => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        options: { title, message, defaultValue, type: 'prompt' },
        resolve,
      });
    });
  },

  select: (message, items, title = 'Select Option') => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        options: { title, message, items, type: 'select' },
        resolve,
      });
    });
  },

  submit: (value) => {
    const { resolve, options } = get();
    if (resolve) {
      if (options?.type === 'prompt' || options?.type === 'select') {
        resolve(value);
      } else if (options?.type === 'confirm') {
        resolve(true);
      } else {
        resolve(undefined);
      }
    }
    set({ isOpen: false, options: null, resolve: null });
  },

  cancel: () => {
    const { resolve, options } = get();
    if (resolve) {
      if (options?.type === 'confirm') {
        resolve(false);
      } else {
        resolve(null);
      }
    }
    set({ isOpen: false, options: null, resolve: null });
  },
}));
