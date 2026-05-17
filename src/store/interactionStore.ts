import { create } from 'zustand';

export type InteractionMode = 'normal' | 'comment' | 'draw';

interface InteractionStoreState {
  mode: InteractionMode;
  setMode(mode: InteractionMode): void;
  toggleMode(mode: Exclude<InteractionMode, 'normal'>): void;

  /** ID of the file selected in the Design Files panel ("pages/index", "components/Hero.html", …). */
  activeFileId: string;
  setActiveFileId(id: string): void;

  /** When true, the canvas shows the FilesBrowser overview instead of the active file's preview. */
  filesOverviewOpen: boolean;
  setFilesOverviewOpen(open: boolean): void;
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
    // Opening a file always closes the overview.
    set({ activeFileId: id, filesOverviewOpen: false });
  },

  filesOverviewOpen: false,
  setFilesOverviewOpen(open) {
    set({ filesOverviewOpen: open });
  },
}));
