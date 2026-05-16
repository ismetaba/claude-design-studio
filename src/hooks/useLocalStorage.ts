import { useCallback, useEffect, useState } from 'react';
import { storage } from '../store/persist';

/**
 * Persist a primitive value to localStorage (via the project's safe storage adapter).
 * Falls back gracefully when storage is unavailable.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = storage.getItem(key);
      if (typeof raw !== 'string') return initialValue;
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  });

  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        storage.setItem(key, JSON.stringify(v));
      } catch {
        /* swallow */
      }
    },
    [key],
  );

  useEffect(() => {
    // Re-sync on key change (rare in practice).
    try {
      const raw = storage.getItem(key);
      if (typeof raw === 'string') setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
  }, [key]);

  return [value, set];
}
