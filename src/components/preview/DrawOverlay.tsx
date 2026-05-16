import { useCallback, useEffect, useRef, useState } from 'react';
import { useDesignStore } from '../../store/designStore';
import { useInteractionStore } from '../../store/interactionStore';
import { useAnnotationSubmit } from '../../hooks/useAnnotationSubmit';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/cn';
import { newId } from '../../lib/id';
import type { DrawStroke } from '../../types/domain';

const STROKE_COLOR = '#dc2626';
const STROKE_WIDTH = 3;

interface PendingStroke {
  points: Array<{ x: number; y: number }>;
}

export function DrawOverlay() {
  const mode = useInteractionStore((s) => s.mode);
  const setMode = useInteractionStore((s) => s.setMode);

  const activeSessionId = useDesignStore((s) => s.activeSessionId);
  const sessions = useDesignStore((s) => s.sessions);
  const addDrawing = useDesignStore((s) => s.addDrawing);
  const deleteDrawing = useDesignStore((s) => s.deleteDrawing);
  const isStreaming = useDesignStore((s) => s.isStreaming);
  const { sendDrawing } = useAnnotationSubmit();

  const session = activeSessionId ? sessions[activeSessionId] : undefined;
  const drawings = session?.drawings ?? [];
  const openDrawings = drawings.filter((d) => d.status === 'open');
  const interactive = mode === 'draw';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pendingStrokes, setPendingStrokes] = useState<DrawStroke[]>([]);
  const drawingRef = useRef<PendingStroke | null>(null);
  const [note, setNote] = useState('');

  // Render all strokes (committed + pending current) onto the canvas.
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const { width, height } = container.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    // Scale canvas for DPR for crisp lines.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawStroke = (points: Array<{ x: number; y: number }>, color: string, w: number) => {
      if (points.length === 0) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(points[0].x * width, points[0].y * height);
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i].x * width, points[i].y * height);
      }
      ctx.stroke();
    };

    // Committed pending strokes (current drawing in progress)
    for (const s of pendingStrokes) drawStroke(s.points, s.color, s.width);

    // In-progress stroke
    if (drawingRef.current) {
      drawStroke(drawingRef.current.points, STROKE_COLOR, STROKE_WIDTH);
    }

    // Sent / open drawings from store overlay (lighter so they don't dominate)
    for (const d of openDrawings) {
      for (const s of d.strokes) drawStroke(s.points, s.color, s.width);
    }
  }, [pendingStrokes, openDrawings]);

  // Redraw on stroke updates, resize, etc.
  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => redraw());
    obs.observe(el);
    return () => obs.disconnect();
  }, [redraw]);

  // Reset pending strokes when leaving draw mode (commit them as a drawing if there's content).
  useEffect(() => {
    if (mode !== 'draw') {
      drawingRef.current = null;
    }
  }, [mode]);

  // ESC exits or cancels.
  useEffect(() => {
    if (mode !== 'draw') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingStrokes([]);
        drawingRef.current = null;
        setMode('normal');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, setMode]);

  if (!interactive && openDrawings.length === 0 && pendingStrokes.length === 0) {
    return null;
  }

  const pointFromEvent = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x, y };
  };

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!interactive) return;
    if (e.button !== 0) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = pointFromEvent(e.clientX, e.clientY);
    if (!p) return;
    drawingRef.current = { points: [p] };
    redraw();
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!interactive || !drawingRef.current) return;
    const p = pointFromEvent(e.clientX, e.clientY);
    if (!p) return;
    drawingRef.current.points.push(p);
    redraw();
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = () => {
    if (!interactive || !drawingRef.current) return;
    const points = drawingRef.current.points;
    drawingRef.current = null;
    if (points.length < 2) {
      redraw();
      return;
    }
    setPendingStrokes((curr) => [
      ...curr,
      {
        id: newId(),
        points,
        color: STROKE_COLOR,
        width: STROKE_WIDTH,
        createdAt: Date.now(),
      },
    ]);
  };

  const undoLast = () => {
    setPendingStrokes((s) => s.slice(0, -1));
  };

  const clearAll = () => {
    setPendingStrokes([]);
    drawingRef.current = null;
    redraw();
  };

  const sendDraft = async () => {
    if (pendingStrokes.length === 0) return;
    const id = addDrawing({ note, strokes: pendingStrokes });
    if (!id) return;
    const created = useDesignStore.getState().sessions[activeSessionId!]?.drawings?.find((d) => d.id === id);
    if (!created) return;
    setPendingStrokes([]);
    setNote('');
    setMode('normal');
    await sendDrawing(created);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      className={cn(
        'absolute inset-0 z-30 touch-none select-none',
        interactive ? 'cursor-crosshair' : 'pointer-events-none',
      )}
      style={interactive ? undefined : { pointerEvents: 'none' }}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

      {interactive && (
        <div
          className="pointer-events-auto absolute bottom-3 left-1/2 z-40 flex w-[min(420px,90%)] -translate-x-1/2 items-center gap-2 rounded-2xl bg-fg-strong p-2 text-bg shadow-lift"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Undo last stroke"
            onClick={undoLast}
            disabled={pendingStrokes.length === 0}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-bg/80 transition-colors hover:bg-bg/10 hover:text-bg disabled:opacity-30"
          >
            <Icon name="undo" size={14} />
          </button>
          <button
            type="button"
            aria-label="Clear all strokes"
            onClick={clearAll}
            disabled={pendingStrokes.length === 0}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-bg/80 transition-colors hover:bg-bg/10 hover:text-bg disabled:opacity-30"
          >
            <Icon name="eraser" size={14} />
          </button>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={pendingStrokes.length === 0 ? 'Draw on the preview…' : 'Type anywhere to add a note'}
            className="flex-1 bg-transparent text-[12px] text-bg placeholder:text-bg/40 focus:outline-none"
          />
          <span className="text-[11px] text-bg/60">
            {pendingStrokes.length || ''}
          </span>
          <button
            type="button"
            disabled={pendingStrokes.length === 0 || isStreaming}
            onClick={() => void sendDraft()}
            className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[12px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            <Icon name="send" size={11} />
            Send
          </button>
        </div>
      )}

      {!interactive &&
        openDrawings.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => deleteDrawing(d.id)}
            title={d.note || 'Drawing annotation — click to dismiss'}
            className="pointer-events-auto absolute h-1 w-1 cursor-pointer rounded-full"
            style={{
              left: `${(d.strokes[0]?.points[0]?.x ?? 0) * 100}%`,
              top: `${(d.strokes[0]?.points[0]?.y ?? 0) * 100}%`,
            }}
          />
        ))}
    </div>
  );
}
