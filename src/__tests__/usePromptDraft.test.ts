import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePromptDraft } from '../hooks/usePromptDraft';
import { storage } from '../store/persist';

const KEY_PREFIX = 'cds:draft:';

function wipeDrafts() {
  storage.removeItem(KEY_PREFIX + 'p1');
  storage.removeItem(KEY_PREFIX + 'p2');
}

describe('usePromptDraft', () => {
  beforeEach(() => {
    vi.useRealTimers();
    wipeDrafts();
    vi.useFakeTimers();
    // The persist layer throttles writes per-key; advance past the throttle so
    // any cached lastWriteAt from a sibling test is effectively forgotten.
    vi.advanceTimersByTime(5000);
  });
  afterEach(() => {
    vi.useRealTimers();
    wipeDrafts();
  });

  it('starts empty when no draft exists for the project', () => {
    const { result } = renderHook(() => usePromptDraft('p1'));
    expect(result.current.value).toBe('');
  });

  it('persists keystrokes to localStorage after the debounce window', () => {
    const { result } = renderHook(() => usePromptDraft('p1'));
    act(() => {
      result.current.setValue('a login page');
    });
    expect(result.current.value).toBe('a login page');
    // Not saved yet — debounce hasn't fired.
    expect(storage.getItem(KEY_PREFIX + 'p1')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(storage.getItem(KEY_PREFIX + 'p1')).toBe('a login page');
  });

  it('restores the saved draft when the same project is mounted again', () => {
    storage.setItem(KEY_PREFIX + 'p1', 'something I was typing');
    // The persist layer throttles writes; advance fake timers so the value lands.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const { result } = renderHook(() => usePromptDraft('p1'));
    expect(result.current.value).toBe('something I was typing');
  });

  it('swaps drafts when the active project changes', () => {
    storage.setItem(KEY_PREFIX + 'p2', 'draft for p2');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const { result, rerender } = renderHook(({ id }: { id: string }) => usePromptDraft(id), {
      initialProps: { id: 'p1' },
    });
    // Start empty for p1.
    expect(result.current.value).toBe('');
    // Switch to p2 — should pull p2's persisted draft.
    rerender({ id: 'p2' });
    expect(result.current.value).toBe('draft for p2');
  });

  it('clear() wipes both state and localStorage', () => {
    storage.setItem(KEY_PREFIX + 'p1', 'will be removed');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const { result } = renderHook(() => usePromptDraft('p1'));
    act(() => {
      result.current.clear();
    });
    expect(result.current.value).toBe('');
    expect(storage.getItem(KEY_PREFIX + 'p1')).toBeNull();
  });

  it('setting an empty string removes the localStorage key (no orphaned entries)', () => {
    storage.setItem(KEY_PREFIX + 'p1', 'old');
    const { result } = renderHook(() => usePromptDraft('p1'));
    act(() => {
      result.current.setValue('');
      vi.advanceTimersByTime(300);
    });
    expect(storage.getItem(KEY_PREFIX + 'p1')).toBeNull();
  });

  it('does not write to storage when there is no active project', () => {
    const { result } = renderHook(() => usePromptDraft(null));
    act(() => {
      result.current.setValue('whatever');
      vi.advanceTimersByTime(300);
    });
    expect(storage.getItem(KEY_PREFIX + 'null')).toBeNull();
  });
});
