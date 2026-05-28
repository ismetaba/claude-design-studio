import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';

/** Sync the `dark` class on <html> with the persisted theme setting. */
export function useThemeEffect(): void {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
}
