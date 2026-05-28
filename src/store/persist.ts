import { persist, type PersistOptions, type StateStorage } from 'zustand/middleware';

/**
 * Pick a usable Storage implementation:
 * - Prefer `window.localStorage` (jsdom or browser).
 * - Fall back to an in-memory shim when no real Storage is available
 *   (e.g. Node test workers, SSR, quota disabled).
 */
function pickStorage(): Storage {
  const candidates: unknown[] = [
    typeof window !== 'undefined' ? (window as Window).localStorage : undefined,
    typeof globalThis !== 'undefined' ? (globalThis as { localStorage?: Storage }).localStorage : undefined,
  ];
  for (const candidate of candidates) {
    if (
      candidate &&
      typeof (candidate as Storage).getItem === 'function' &&
      typeof (candidate as Storage).setItem === 'function'
    ) {
      try {
        const probeKey = '__cds_probe__';
        (candidate as Storage).setItem(probeKey, '1');
        (candidate as Storage).removeItem(probeKey);
        return candidate as Storage;
      } catch {
        // Storage exists but is unusable — try next.
      }
    }
  }
  const mem = new Map<string, string>();
  const shim: Storage = {
    get length() {
      return mem.size;
    },
    clear: () => mem.clear(),
    getItem: (key) => (mem.has(key) ? mem.get(key)! : null),
    key: (index) => Array.from(mem.keys())[index] ?? null,
    removeItem: (key) => {
      mem.delete(key);
    },
    setItem: (key, value) => {
      mem.set(key, String(value));
    },
  };
  return shim;
}

const backing = pickStorage();

/**
 * Throttled, quota-tolerant localStorage adapter for Zustand.
 * - Coalesces writes to ≤ 1/s per key.
 * - Catches quota and access errors so persistence never throws into the app.
 */
function safeStorage(): StateStorage {
  const lastWriteAt = new Map<string, number>();
  const pendingValue = new Map<string, string>();
  const pendingTimer = new Map<string, ReturnType<typeof setTimeout>>();
  const MIN_INTERVAL_MS = 1000;

  const flush = (key: string) => {
    const value = pendingValue.get(key);
    pendingValue.delete(key);
    pendingTimer.delete(key);
    if (value === undefined) return;
    try {
      backing.setItem(key, value);
      lastWriteAt.set(key, Date.now());
    } catch {
      // Quota or access error — drop silently; the next write attempt will retry.
    }
  };

  return {
    getItem: (key: string): string | null => {
      try {
        return backing.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string): void => {
      const now = Date.now();
      const last = lastWriteAt.get(key) ?? 0;
      const elapsed = now - last;
      pendingValue.set(key, value);
      if (elapsed >= MIN_INTERVAL_MS) {
        flush(key);
        return;
      }
      if (pendingTimer.has(key)) return;
      const t = setTimeout(() => flush(key), MIN_INTERVAL_MS - elapsed);
      // Avoid keeping the Node event loop alive in tests.
      if (typeof (t as { unref?: () => void }).unref === 'function') {
        (t as { unref: () => void }).unref();
      }
      pendingTimer.set(key, t);
    },
    removeItem: (key: string): void => {
      const t = pendingTimer.get(key);
      if (t) clearTimeout(t);
      pendingTimer.delete(key);
      pendingValue.delete(key);
      try {
        backing.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}

export const storage = safeStorage();

export type PartializeFn<S> = (state: S) => Partial<S>;

export interface BuildPersistOptions<S> {
  name: string;
  partialize: PartializeFn<S>;
  version?: number;
}

export function makePersistOptions<S>(opts: BuildPersistOptions<S>): PersistOptions<S, Partial<S>> {
  return {
    name: opts.name,
    storage: {
      getItem: (key) => {
        const raw = storage.getItem(key);
        if (typeof raw !== 'string' || raw.length === 0) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          storage.setItem(key, JSON.stringify(value));
        } catch {
          /* swallow */
        }
      },
      removeItem: (key) => storage.removeItem(key),
    },
    partialize: (state) => opts.partialize(state) as Partial<S>,
    version: opts.version ?? 1,
  };
}

export { persist };
