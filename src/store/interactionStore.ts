import { create } from 'zustand';

export type InteractionMode = 'normal' | 'comment' | 'draw';

interface InteractionStoreState {
  mode: InteractionMode;
  setMode(mode: InteractionMode): void;
  toggleMode(mode: Exclude<InteractionMode, 'normal'>): void;

  /** ID of the file selected in the Design Files panel ("pages/index", "components/Hero.html", …). */
  activeFileId: string;
  setActiveFileId(id: string): void;
}

export const useInteractionStore = create<InteractionStoreState>((set, get) => ({
  mode: 'normal',
  setMode(mode) {
    set({ mode });
  },
  toggleMode(mode) {
    set({ mode: get().mode === mode ? 'normal' : mode });
  },

  activeFileId: 'pages/index',
  setActiveFileId(id) {
    set({ activeFileId: id });
  },
}));
