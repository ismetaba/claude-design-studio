import { useCallback } from 'react';
import { useDesignStore } from '../store/designStore';
import { useStreamingGenerate } from './useStreamingGenerate';
import type { CommentAnnotation, DrawAnnotation } from '../types/domain';

export function formatCommentRefinement(comments: CommentAnnotation[]): string {
  if (comments.length === 0) return '';
  const header =
    comments.length === 1
      ? 'Apply this refinement to the design:'
      : `Apply these ${comments.length} refinements to the design:`;
  const lines = comments.map((c, i) => {
    const xPct = Math.round(c.x * 100);
    const yPct = Math.round(c.y * 100);
    return `${i + 1}. (at ${xPct}% from left, ${yPct}% from top) ${c.text}`;
  });
  return [header, '', ...lines, '', 'Return the full updated HTML document.'].join('\n');
}

export function formatDrawingRefinement(drawing: DrawAnnotation): string {
  const note = drawing.note ? drawing.note : '(no description)';
  const lines: string[] = [];
  lines.push('I drew on the preview to point at something I want changed.');
  lines.push('');
  if (drawing.note) {
    lines.push(`Description: ${note}`);
    lines.push('');
  }
  lines.push(`The drawing has ${drawing.strokes.length} stroke(s) with these approximate bounds (normalised 0..1):`);
  for (let i = 0; i < drawing.strokes.length; i += 1) {
    const s = drawing.strokes[i];
    if (s.points.length === 0) continue;
    const xs = s.points.map((p) => p.x);
    const ys = s.points.map((p) => p.y);
    const x1 = Math.min(...xs).toFixed(2);
    const y1 = Math.min(...ys).toFixed(2);
    const x2 = Math.max(...xs).toFixed(2);
    const y2 = Math.max(...ys).toFixed(2);
    lines.push(`  stroke ${i + 1}: (${x1},${y1}) to (${x2},${y2}), ${s.points.length} points`);
  }
  lines.push('');
  lines.push('Use this region as a pointer to the area of the UI I want refined. Return the full updated HTML document.');
  return lines.join('\n');
}

export interface AnnotationSubmitApi {
  sendComments: () => Promise<void>;
  sendDrawing: (drawing: DrawAnnotation) => Promise<void>;
}

export function useAnnotationSubmit(): AnnotationSubmitApi {
  const { start } = useStreamingGenerate();

  const sendComments = useCallback(async () => {
    const ds = useDesignStore.getState();
    const sessionId = ds.activeSessionId;
    if (!sessionId) return;
    const session = ds.sessions[sessionId];
    const open = (session?.comments ?? []).filter((c) => c.status === 'open');
    if (open.length === 0) return;
    const prompt = formatCommentRefinement(open);
    ds.appendUserTurn(prompt);
    for (const c of open) ds.markCommentSent(c.id);
    await start();
  }, [start]);

  const sendDrawing = useCallback(
    async (drawing: DrawAnnotation) => {
      const ds = useDesignStore.getState();
      if (!ds.activeSessionId) return;
      const prompt = formatDrawingRefinement(drawing);
      ds.appendUserTurn(prompt);
      ds.markDrawingSent(drawing.id);
      await start();
    },
    [start],
  );

  return { sendComments, sendDrawing };
}
