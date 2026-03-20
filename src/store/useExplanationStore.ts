import { create } from 'zustand';

// Status of an explanation
export type ExplanationStatus = 'loading' | 'done' | 'error';

// Structure of an explanation cache entry
export interface ExplanationEntry {
  status: ExplanationStatus;
  html: string;
}

// Store definition
interface ExplanationStore {
  explanations: Record<number, ExplanationEntry>;
  activeFetches: Set<number>;
  setExplanation: (pageNumber: number, data: ExplanationEntry) => void;
  startFetch: (pageNumber: number) => void;
  finishFetch: (pageNumber: number) => void;
  clearExplanations: () => void;
}

export const useExplanationStore = create<ExplanationStore>((set) => ({
  explanations: {},
  activeFetches: new Set(),
  
  setExplanation: (pageNumber, data) => set((state) => ({
    explanations: { ...state.explanations, [pageNumber]: data }
  })),
  
  startFetch: (pageNumber) => set((state) => {
    const newFetches = new Set(state.activeFetches);
    newFetches.add(pageNumber);
    return {
      activeFetches: newFetches,
      explanations: { ...state.explanations, [pageNumber]: { status: 'loading', html: '' } }
    };
  }),

  finishFetch: (pageNumber) => set((state) => {
    const newFetches = new Set(state.activeFetches);
    newFetches.delete(pageNumber);
    return { activeFetches: newFetches };
  }),

  clearExplanations: () => set({ explanations: {}, activeFetches: new Set() })
}));
