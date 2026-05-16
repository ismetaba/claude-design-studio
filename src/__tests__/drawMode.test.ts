import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignStore } from '../store/designStore';
import { formatDrawingRefinement } from '../hooks/useAnnotationSubmit';
import type { DrawAnnotation, DrawStroke } from '../types/domain';

function makeStroke(points: Array<[number, number]>): DrawStroke {
  return {
    id: 'sid',
    color: '#dc2626',
    width: 3,
    createdAt: 0,
    points: points.map(([x, y]) => ({ x, y })),
  };
}

function makeDrawing(overrides: Partial<DrawAnnotation> = {}): DrawAnnotation {
  return {
    id: 'd',
    note: '',
    strokes: [],
    status: 'open',
    createdAt: 0,
    ...overrides,
  };
}

function reset() {
  useDesignStore.setState({
    sessions: {},
    sessionOrder: [],
    activeSessionId: null,
    isStreaming: false,
    streamError: null,
  });
}

describe('draw mode — store', () => {
  beforeEach(reset);

  it('refuses without active session', () => {
    const id = useDesignStore.getState().addDrawing({
      note: 'x',
      strokes: [makeStroke([[0, 0], [1, 1]])],
    });
    expect(id).toBeNull();
  });

  it('rejects empty stroke list', () => {
    useDesignStore.getState().createSession();
    const id = useDesignStore.getState().addDrawing({ note: 'x', strokes: [] });
    expect(id).toBeNull();
  });

  it('adds, marks-sent, deletes, and clears drawings', () => {
    const sid = useDesignStore.getState().createSession();
    const a = useDesignStore.getState().addDrawing({
      note: 'A',
      strokes: [makeStroke([[0, 0], [0.5, 0.5]])],
    });
    const b = useDesignStore.getState().addDrawing({
      note: 'B',
      strokes: [makeStroke([[0.1, 0.2], [0.3, 0.4]])],
    });
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();

    let session = useDesignStore.getState().sessions[sid];
    expect(session.drawings?.length).toBe(2);

    useDesignStore.getState().markDrawingSent(a!);
    session = useDesignStore.getState().sessions[sid];
    expect(session.drawings?.find((d) => d.id === a)?.status).toBe('sent');

    useDesignStore.getState().clearDrawings('open');
    session = useDesignStore.getState().sessions[sid];
    expect(session.drawings?.length).toBe(1);
    expect(session.drawings?.[0].status).toBe('sent');

    useDesignStore.getState().deleteDrawing(session.drawings![0].id);
    session = useDesignStore.getState().sessions[sid];
    expect(session.drawings?.length).toBe(0);
  });
});

describe('draw mode — refinement formatter', () => {
  it('includes note, stroke count and approximate bounds', () => {
    const drawing = makeDrawing({
      note: 'make this section taller',
      strokes: [
        makeStroke([[0.1, 0.2], [0.5, 0.8], [0.4, 0.3]]),
        makeStroke([[0.6, 0.6], [0.65, 0.7]]),
      ],
    });
    const out = formatDrawingRefinement(drawing);
    expect(out).toContain('I drew on the preview');
    expect(out).toContain('Description: make this section taller');
    expect(out).toContain('2 stroke(s)');
    expect(out).toMatch(/stroke 1: \(0\.10,0\.20\) to \(0\.50,0\.80\), 3 points/);
    expect(out).toMatch(/stroke 2: \(0\.60,0\.60\) to \(0\.65,0\.70\), 2 points/);
    expect(out).toContain('Return the full updated HTML document.');
  });

  it('handles empty note gracefully', () => {
    const drawing = makeDrawing({
      strokes: [makeStroke([[0, 0], [1, 1]])],
    });
    const out = formatDrawingRefinement(drawing);
    expect(out).toContain('I drew on the preview');
    expect(out).not.toContain('Description:');
    expect(out).toContain('1 stroke(s)');
  });

  it('skips strokes with no points but still counts them', () => {
    const drawing = makeDrawing({
      strokes: [
        makeStroke([]),
        makeStroke([[0.5, 0.5], [0.6, 0.5]]),
      ],
    });
    const out = formatDrawingRefinement(drawing);
    expect(out).toContain('2 stroke(s)');
    // Only the non-empty stroke is detailed
    expect(out).toMatch(/stroke 2: \(0\.50,0\.50\) to \(0\.60,0\.50\), 2 points/);
    expect(out).not.toMatch(/stroke 1: /);
  });
});
