import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignStore } from '../store/designStore';
import { useInteractionStore } from '../store/interactionStore';
import { formatCommentRefinement } from '../hooks/useAnnotationSubmit';
import type { CommentAnnotation } from '../types/domain';

function resetStores() {
  useDesignStore.setState({
    sessions: {},
    sessionOrder: [],
    activeSessionId: null,
    isStreaming: false,
    streamError: null,
  });
  useInteractionStore.setState({ mode: 'normal' });
}

describe('comment mode — store', () => {
  beforeEach(resetStores);

  it('refuses to add comments when there is no active session', () => {
    const id = useDesignStore.getState().addComment({ x: 0.5, y: 0.5, text: 'hello' });
    expect(id).toBeNull();
  });

  it('adds, marks-sent, and clears comments scoped to the active session', () => {
    const sid = useDesignStore.getState().createSession();
    const a = useDesignStore.getState().addComment({ x: 0.1, y: 0.2, text: 'one' });
    const b = useDesignStore.getState().addComment({ x: 0.3, y: 0.4, text: 'two' });
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();

    let session = useDesignStore.getState().sessions[sid];
    expect(session.comments?.length).toBe(2);
    expect(session.comments?.every((c) => c.status === 'open')).toBe(true);

    useDesignStore.getState().markCommentSent(a!);
    session = useDesignStore.getState().sessions[sid];
    expect(session.comments?.find((c) => c.id === a)?.status).toBe('sent');

    useDesignStore.getState().clearComments('open');
    session = useDesignStore.getState().sessions[sid];
    expect(session.comments?.length).toBe(1);
    expect(session.comments?.[0].status).toBe('sent');

    useDesignStore.getState().clearComments();
    session = useDesignStore.getState().sessions[sid];
    expect(session.comments?.length).toBe(0);
  });

  it('clamps coordinates to [0, 1]', () => {
    useDesignStore.getState().createSession();
    useDesignStore.getState().addComment({ x: -1, y: 5, text: 'x' });
    const c = Object.values(useDesignStore.getState().sessions)[0].comments![0];
    expect(c.x).toBe(0);
    expect(c.y).toBe(1);
  });

  it('rejects empty text', () => {
    useDesignStore.getState().createSession();
    const id = useDesignStore.getState().addComment({ x: 0.5, y: 0.5, text: '   ' });
    expect(id).toBeNull();
  });

  it('deleteComment removes a single comment', () => {
    useDesignStore.getState().createSession();
    const a = useDesignStore.getState().addComment({ x: 0.1, y: 0.1, text: 'a' });
    useDesignStore.getState().addComment({ x: 0.2, y: 0.2, text: 'b' });
    useDesignStore.getState().deleteComment(a!);
    const session = Object.values(useDesignStore.getState().sessions)[0];
    expect(session.comments?.length).toBe(1);
    expect(session.comments?.[0].text).toBe('b');
  });
});

describe('comment mode — refinement formatter', () => {
  function fakeComment(overrides: Partial<CommentAnnotation> = {}): CommentAnnotation {
    return {
      id: 'id',
      x: 0.5,
      y: 0.5,
      text: 'change this',
      status: 'open',
      createdAt: 0,
      ...overrides,
    };
  }

  it('returns empty string for no comments', () => {
    expect(formatCommentRefinement([])).toBe('');
  });

  it('uses singular header for one comment', () => {
    const out = formatCommentRefinement([fakeComment({ text: 'bigger font' })]);
    expect(out).toContain('Apply this refinement');
    expect(out).toContain('1. (at 50% from left, 50% from top) bigger font');
    expect(out).toContain('Return the full updated HTML document.');
  });

  it('uses plural header for multiple comments and lists positions', () => {
    const out = formatCommentRefinement([
      fakeComment({ x: 0.25, y: 0.1, text: 'A' }),
      fakeComment({ x: 0.75, y: 0.9, text: 'B' }),
    ]);
    expect(out).toContain('Apply these 2 refinements');
    expect(out).toContain('1. (at 25% from left, 10% from top) A');
    expect(out).toContain('2. (at 75% from left, 90% from top) B');
  });
});

describe('interaction store', () => {
  beforeEach(resetStores);

  it('starts in normal mode', () => {
    expect(useInteractionStore.getState().mode).toBe('normal');
  });

  it('toggleMode flips on and off', () => {
    const { toggleMode } = useInteractionStore.getState();
    toggleMode('comment');
    expect(useInteractionStore.getState().mode).toBe('comment');
    toggleMode('comment');
    expect(useInteractionStore.getState().mode).toBe('normal');
  });

  it('toggleMode switches between modes without going through normal', () => {
    const { toggleMode } = useInteractionStore.getState();
    toggleMode('comment');
    toggleMode('draw');
    expect(useInteractionStore.getState().mode).toBe('draw');
  });
});
