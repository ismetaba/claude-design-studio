import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignStore } from '../store/designStore';
import { storage } from '../store/persist';

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

describe('designStore', () => {
  beforeEach(() => {
    reset();
  });

  it('createSession returns an id and makes it active', () => {
    const id = useDesignStore.getState().createSession();
    expect(id).toMatch(/.+/);
    const s = useDesignStore.getState();
    expect(s.activeSessionId).toBe(id);
    expect(s.sessionOrder[0]).toBe(id);
    expect(s.sessions[id]).toBeDefined();
  });

  it('appendUserTurn auto-creates a session and sets a 40-char title', () => {
    const text = 'A landing page for a coffee shop with a hero, gallery, and cta';
    useDesignStore.getState().appendUserTurn(text);
    const s = useDesignStore.getState();
    const sid = s.activeSessionId!;
    expect(sid).toBeTruthy();
    expect(s.sessions[sid].turns).toHaveLength(1);
    expect(s.sessions[sid].turns[0]).toMatchObject({ role: 'user', content: text });
    expect(s.sessions[sid].title.length).toBeLessThanOrEqual(40);
    expect(s.sessions[sid].title).toBe(text.slice(0, 40));
  });

  it('appendAssistantDelta concatenates onto the in-progress assistant turn', async () => {
    useDesignStore.getState().appendUserTurn('design a card');
    useDesignStore.getState().appendAssistantDelta('Hel');
    await new Promise((r) => setTimeout(r, 1));
    useDesignStore.getState().appendAssistantDelta('lo');
    const sid = useDesignStore.getState().activeSessionId!;
    const turns = useDesignStore.getState().sessions[sid].turns;
    const assistantTurns = turns.filter((t) => t.role === 'assistant');
    expect(assistantTurns).toHaveLength(1);
    expect(assistantTurns[0].content).toBe('Hello');
  });

  it('finalizeAssistantTurn stamps sdkSessionId on the active session', () => {
    useDesignStore.getState().appendUserTurn('design x');
    useDesignStore.getState().appendAssistantDelta('<html>');
    useDesignStore.getState().finalizeAssistantTurn({ sdkSessionId: 'sdk-abc' });
    const sid = useDesignStore.getState().activeSessionId!;
    expect(useDesignStore.getState().sessions[sid].sdkSessionId).toBe('sdk-abc');
  });

  it('deleteSession on active falls back to next in sessionOrder', () => {
    const a = useDesignStore.getState().createSession();
    const b = useDesignStore.getState().createSession();
    // sessionOrder is [b, a]; active = b.
    expect(useDesignStore.getState().activeSessionId).toBe(b);
    useDesignStore.getState().deleteSession(b);
    expect(useDesignStore.getState().activeSessionId).toBe(a);
    expect(useDesignStore.getState().sessions[b]).toBeUndefined();
  });

  it('deleting the last session leaves activeSessionId null', () => {
    const a = useDesignStore.getState().createSession();
    useDesignStore.getState().deleteSession(a);
    expect(useDesignStore.getState().activeSessionId).toBeNull();
    expect(useDesignStore.getState().sessionOrder).toHaveLength(0);
  });

  it('selectSession switches the active id (no-op for unknown ids)', () => {
    const a = useDesignStore.getState().createSession();
    const b = useDesignStore.getState().createSession();
    useDesignStore.getState().selectSession(a);
    expect(useDesignStore.getState().activeSessionId).toBe(a);
    useDesignStore.getState().selectSession('does-not-exist');
    expect(useDesignStore.getState().activeSessionId).toBe(a);
    expect(b).toBeDefined();
  });

  it('setCurrentHtml writes to the active session', () => {
    useDesignStore.getState().createSession();
    useDesignStore.getState().setCurrentHtml('<div>hi</div>');
    const sid = useDesignStore.getState().activeSessionId!;
    expect(useDesignStore.getState().sessions[sid].currentHtml).toBe('<div>hi</div>');
  });

  it('setStreaming / setStreamError update transient fields', () => {
    useDesignStore.getState().setStreaming(true);
    useDesignStore.getState().setStreamError('boom');
    expect(useDesignStore.getState().isStreaming).toBe(true);
    expect(useDesignStore.getState().streamError).toBe('boom');
  });

  it('persists sessions through the storage adapter (throttled write flushes)', async () => {
    useDesignStore.getState().appendUserTurn('persist me');
    // Allow throttled write to flush (≥ 1s).
    await new Promise((r) => setTimeout(r, 1100));
    const raw = storage.getItem('cds:design');
    expect(raw).toBeTruthy();
    expect(raw).toContain('persist me');
  });
});
