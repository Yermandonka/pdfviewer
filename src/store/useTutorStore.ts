import { create } from "zustand";

export interface Explanation {
  status: "loading" | "done" | "error";
  content: string;
}

interface TutorStore {
  activeDocumentId: string | null;
  explanations: Record<number, Explanation>;
  totalPages: number | null;
  currentPage: number;
  setActiveDocument: (id: string | null) => void;
  setTotalPages: (pages: number) => void;
  setCurrentPage: (page: number) => void;
  setExplanationStatus: (page: number, status: "loading" | "done" | "error", content?: string) => void;
  loadExplanations: (explanations: Record<number, Explanation>) => void;
  resetDocState: () => void;
}

export const useTutorStore = create<TutorStore>((set) => ({
  activeDocumentId: null,
  explanations: {},
  totalPages: null,
  currentPage: 1,
  setActiveDocument: (id) => set({ activeDocumentId: id }),
  setTotalPages: (pages) => set({ totalPages: pages }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setExplanationStatus: (page, status, content = "") =>
    set((state) => ({
      ...state,
      explanations: {
        ...state.explanations,
        [page]: { status, content: status === "done" ? content : state.explanations[page]?.content || "" },
      },
    })),
  loadExplanations: (explanations) => set({ explanations }),
  resetDocState: () => set({ explanations: {}, totalPages: null, currentPage: 1, activeDocumentId: null }),
}));
