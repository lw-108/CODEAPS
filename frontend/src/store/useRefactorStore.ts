import { create } from 'zustand';

export interface RefactorProposal {
  filePath: string;
  filename: string;
  originalContent: string;
  newContent: string;
  status: 'pending' | 'applied' | 'discarded';
}

export interface RefactorState {
  activeInstruction: string | null;
  selectedCode: string | null;
  selectionRange: { startLine: number; startCol: number; endLine: number; endCol: number } | null;
  targetFile: string | null;
  
  proposals: RefactorProposal[];
  isRefactoring: boolean;
  reviewVisible: boolean;
  
  // Actions
  startRefactor: (instruction: string, code: string, range: any, filePath: string) => void;
  setProposals: (proposals: RefactorProposal[]) => void;
  setRefactoring: (isRefactoring: boolean) => void;
  setReviewVisible: (visible: boolean) => void;
  applyAll: () => void;
  discardAll: () => void;
  reset: () => void;
}

export const useRefactorStore = create<RefactorState>((set, get) => ({
  activeInstruction: null,
  selectedCode: null,
  selectionRange: null,
  targetFile: null,
  proposals: [],
  isRefactoring: false,
  reviewVisible: false,

  startRefactor: (instruction: string, code: string, range: any, filePath: string) => set({
    activeInstruction: instruction,
    selectedCode: code,
    selectionRange: range,
    targetFile: filePath,
    isRefactoring: true,
    reviewVisible: false,
    proposals: []
  }),

  setProposals: (proposals: RefactorProposal[]) => set({ proposals, isRefactoring: false, reviewVisible: true }),
  
  setRefactoring: (isRefactoring: boolean) => set({ isRefactoring }),
  
  setReviewVisible: (visible: boolean) => set({ reviewVisible: visible }),

  applyAll: () => set((state: RefactorState) => ({
    proposals: state.proposals.map((p: RefactorProposal) => ({ ...p, status: 'applied' })),
    reviewVisible: false,
    activeInstruction: null
  })),

  discardAll: () => set({
    proposals: [],
    reviewVisible: false,
    activeInstruction: null,
    isRefactoring: false
  }),

  reset: () => set({
    activeInstruction: null,
    selectedCode: null,
    selectionRange: null,
    targetFile: null,
    proposals: [],
    isRefactoring: false,
    reviewVisible: false
  })
}));
