import { create } from "zustand";

export interface Explanation {
  status: "loading" | "done" | "error";
  content: string;
  pageText?: string;
}

interface TutorStore {
  apiKey: string | null;
  activeDocumentId: string | null;
  explanations: Record<number, Explanation>;
  totalPages: number | null;
  currentPage: number;
  setApiKey: (key: string | null) => void;
  setActiveDocument: (id: string | null) => void;
  setTotalPages: (pages: number) => void;
  setCurrentPage: (page: number) => void;
  setExplanationStatus: (page: number, status: "loading" | "done" | "error", content?: string, pageText?: string) => void;
  loadExplanations: (explanations: Record<number, Explanation>) => void;
  resetDocState: () => void;
}

export const useTutorStore = create<TutorStore>((set) => ({
  apiKey: null,
  activeDocumentId: null,
  explanations: {},
  totalPages: null,
  currentPage: 1,
  setApiKey: (key) => set({ apiKey: key }),
  setActiveDocument: (id) => set({ activeDocumentId: id }),
  setTotalPages: (pages) => set({ totalPages: pages }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setExplanationStatus: (page, status, content = "", pageText) =>
    set((state) => {
      const existing = state.explanations[page] || {};
      return {
        ...state,
        explanations: {
          ...state.explanations,
          [page]: { 
            status, 
            content: status === "done" ? content : existing.content || "",
            pageText: pageText ?? existing.pageText 
          },
        },
      };
    }),
  loadExplanations: (explanations) => set({ explanations }),
  resetDocState: () => set({ explanations: {}, totalPages: null, currentPage: 1, activeDocumentId: null }),
}));
