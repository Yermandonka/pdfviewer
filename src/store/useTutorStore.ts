import { create } from "zustand";

export interface Explanation {
  status: "loading" | "done" | "error";
  content: string;
}

interface TutorStore {
  explanations: Record<number, Explanation>;
  totalPages: number | null;
  currentPage: number;
  setTotalPages: (pages: number) => void;
  setCurrentPage: (page: number) => void;
  setExplanationStatus: (page: number, status: "loading" | "done" | "error", content?: string) => void;
}

export const useTutorStore = create<TutorStore>((set) => ({
  explanations: {},
  totalPages: null,
  currentPage: 1,
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
}));
