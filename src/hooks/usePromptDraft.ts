import { useCallback, useEffect, useRef, useState } from 'react';
import { storage } from '../store/persist';

const KEY_PREFIX = 'cds:draft:';
/** Save at most once per this many ms to avoid hammering localStorage on every keystroke. */
const SAVE_DEBOUNCE_MS = 250;

function load(projectId: string | null): string {
  if (!projectId) return '';
  try {
    return storage.getItem(KEY_PREFIX + projectId) ?? '';
  } catch {
    return '';
  }
}

function save(projectId: string, value: string): void {
  try {
    const key = KEY_PREFIX + projectId;
    if (value === '') {
      storage.removeItem(key);
    } else {
      storage.setItem(key, value);
    }
  } catch {
    // Ignore quota / disabled-storage errors.
  }
}

export interface PromptDraftApi {
  value: string;
  setValue: (next: string) => void;
  clear: () => void;
}

/**
 * Per-project draft that survives reload. On project switch the draft is
 * automatically swapped to that project's value.
 */
export function usePromptDraft(projectId: string | null): PromptDraftApi {
  const [value, setValueState] = useState<string>(() => load(projectId));
  const currentId = useRef<string | null>(projectId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Swap the in-memory draft when the active project changes.
  useEffect(() => {
    if (currentId.current === projectId) return;
    currentId.current = projectId;
    setValueState(load(projectId));
  }, [projectId]);

  const setValue = useCallback(
    (next: string) => {
      setValueState(next);
      if (!projectId) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => save(projectId, next), SAVE_DEBOUNCE_MS);
    },
    [projectId],
  );

  const clear = useCallback(() => {
    setValueState('');
    if (!projectId) return;
    if (timer.current) clearTimeout(timer.current);
    save(projectId, '');
  }, [projectId]);

  // On unmount, flush any pending debounced save so we never lose the latest keystroke.
  useEffect(() => {
    return () => {
      if (timer.current && projectId) {
        clearTimeout(timer.current);
        // Read straight from the closure of the latest setValue is hard here, so
        // we rely on the debounced setValue having scheduled a save already.
        // If the user typed within the last 250ms, we save now to be safe.
        try {
          const el = document.activeElement as HTMLTextAreaElement | null;
          if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) {
            const v = el.value;
            if (typeof v === 'string') save(projectId, v);
          }
        } catch {
          /* ignore */
        }
      }
    };
  }, [projectId]);

  return { value, setValue, clear };
}
