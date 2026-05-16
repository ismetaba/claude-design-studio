import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignStore } from '../store/designStore';

function reset() {
  useDesignStore.setState({
    sessions: {},
    sessionOrder: [],
    activeSessionId: null,
    openTabIds: [],
    isStreaming: false,
    streamError: null,
  });
}

describe('multi-tab — store', () => {
  beforeEach(reset);

  it('createSession opens the new session as a tab and makes it active', () => {
    const id = useDesignStore.getState().createSession();
    const s = useDesignStore.getState();
    expect(s.openTabIds).toEqual([id]);
    expect(s.activeSessionId).toBe(id);
  });

  it('selectSession opens an existing session as a tab if not open', () => {
    const a = useDesignStore.getState().createSession();
    const b = useDesignStore.getState().createSession();
    useDesignStore.getState().closeTab(b);
    expect(useDesignStore.getState().openTabIds).toEqual([a]);
    useDesignStore.getState().selectSession(b);
    expect(useDesignStore.getState().openTabIds).toEqual([a, b]);
    expect(useDesignStore.getState().activeSessionId).toBe(b);
  });

  it('selectSession on already-open tab just sets active without changing order', () => {
    const a = useDesignStore.getState().createSession();
    const b = useDesignStore.getState().createSession();
    const c = useDesignStore.getState().createSession();
    expect(useDesignStore.getState().openTabIds).toEqual([a, b, c]);
    useDesignStore.getState().selectSession(a);
    expect(useDesignStore.getState().openTabIds).toEqual([a, b, c]);
    expect(useDesignStore.getState().activeSessionId).toBe(a);
  });

  it('openTab dedupes — opening twice does not duplicate', () => {
    const a = useDesignStore.getState().createSession();
    useDesignStore.getState().openTab(a);
    useDesignStore.getState().openTab(a);
    expect(useDesignStore.getState().openTabIds).toEqual([a]);
  });

  it('openTab is a no-op for unknown ids', () => {
    useDesignStore.getState().createSession();
    useDesignStore.getState().openTab('missing');
    expect(useDesignStore.getState().openTabIds).toHaveLength(1);
    expect(useDesignStore.getState().activeSessionId).not.toBe('missing');
  });

  it('closeTab on active tab activates the next tab to the right', () => {
    const a = useDesignStore.getState().createSession();
    const b = useDesignStore.getState().createSession();
    const c = useDesignStore.getState().createSession();
    useDesignStore.getState().selectSession(b); // active = b
    useDesignStore.getState().closeTab(b);
    const s = useDesignStore.getState();
    expect(s.openTabIds).toEqual([a, c]);
    expect(s.activeSessionId).toBe(c);
  });

  it('closeTab on rightmost active tab falls back to the tab on the left', () => {
    const a = useDesignStore.getState().createSession();
    const b = useDesignStore.getState().createSession();
    useDesignStore.getState().selectSession(b);
    useDesignStore.getState().closeTab(b);
    expect(useDesignStore.getState().activeSessionId).toBe(a);
  });

  it('closeTab on the last open tab sets active to null', () => {
    const a = useDesignStore.getState().createSession();
    useDesignStore.getState().closeTab(a);
    expect(useDesignStore.getState().openTabIds).toEqual([]);
    expect(useDesignStore.getState().activeSessionId).toBeNull();
  });

  it('closeTab on a non-active tab keeps the active tab', () => {
    const a = useDesignStore.getState().createSession();
    const b = useDesignStore.getState().createSession();
    useDesignStore.getState().selectSession(a);
    useDesignStore.getState().closeTab(b);
    expect(useDesignStore.getState().activeSessionId).toBe(a);
    expect(useDesignStore.getState().openTabIds).toEqual([a]);
  });

  it('deleteSession also removes the tab and re-targets active', () => {
    const a = useDesignStore.getState().createSession();
    const b = useDesignStore.getState().createSession();
    useDesignStore.getState().selectSession(b);
    useDesignStore.getState().deleteSession(b);
    expect(useDesignStore.getState().openTabIds).toEqual([a]);
    expect(useDesignStore.getState().sessions[b]).toBeUndefined();
    expect(useDesignStore.getState().activeSessionId).toBe(a);
  });

  it('reorderTabs accepts a permutation of current tabs', () => {
    const a = useDesignStore.getState().createSession();
    const b = useDesignStore.getState().createSession();
    const c = useDesignStore.getState().createSession();
    useDesignStore.getState().reorderTabs([c, a, b]);
    expect(useDesignStore.getState().openTabIds).toEqual([c, a, b]);
  });

  it('reorderTabs rejects lists that drop or add ids', () => {
    const a = useDesignStore.getState().createSession();
    const b = useDesignStore.getState().createSession();
    useDesignStore.getState().reorderTabs([a]);
    expect(useDesignStore.getState().openTabIds).toEqual([a, b]);
    useDesignStore.getState().reorderTabs([a, b, 'fake']);
    expect(useDesignStore.getState().openTabIds).toEqual([a, b]);
  });
});
