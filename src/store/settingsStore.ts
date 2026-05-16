import { create } from 'zustand';
import { persist, makePersistOptions } from './persist';
import type { BackendConfig, Theme } from '../types/domain';

export interface SettingsStoreState {
  theme: Theme;
  backend: BackendConfig;
  setTheme(theme: Theme): void;
  setBackend(backend: BackendConfig): void;
}

const defaultBackend: BackendConfig = { kind: 'claude-agent-sdk' };

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      theme: 'light',
      backend: defaultBackend,
      setTheme(theme) {
        set({ theme });
      },
      setBackend(backend) {
        set({ backend });
      },
    }),
    makePersistOptions<SettingsStoreState>({
      name: 'cds:settings',
      partialize: (state) => ({ theme: state.theme, backend: state.backend }),
    }),
  ),
);
