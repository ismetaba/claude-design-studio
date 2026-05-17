import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/cn';

const MIN_SCALE = 0.25;
const MAX_SCALE = 2.5;
const ZOOM_STEP = 1.25;

interface Transform {
  x: number;
  y: number;
  scale: number;
}

export interface PanZoomCanvasProps {
  children: ReactNode;
  className?: string;
  /** Re-runs the fit-to-viewport calculation when this key changes. */
  fitKey?: string;
}

/**
 * A Figma-style infinite canvas:
 *  - Mouse wheel zooms in/out, anchored at the cursor position.
 *  - Drag on empty space (or any non-interactive area) pans the canvas.
 *  - Toolbar in the bottom-right has zoom in / out / fit-to-screen.
 *  - On first render and whenever `fitKey` changes, content is scaled to fit.
 *
 * The wrapped children are rendered at their natural size; the wrapper handles
 * all of the camera math via a single CSS transform.
 */
export function PanZoomCanvas({ children, className, fitKey }: PanZoomCanvasProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const draggingRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Fit content into viewport — used on mount, on resize, and on reset.
  const fitToViewport = useCallback(() => {
    const vp = viewportRef.current;
    const ct = contentRef.current;
    if (!vp || !ct) return;
    const vpRect = vp.getBoundingClientRect();
    const ctRect = ct.getBoundingClientRect();
    // ctRect dimensions are already transformed — divide by current scale to get natural size.
    const natW = ctRect.width / transformRef.current.scale;
    const natH = ctRect.height / transformRef.current.scale;
    if (natW === 0 || natH === 0) return;
    const padding = 24;
    const fitScale = Math.min(
      (vpRect.width - padding * 2) / natW,
      (vpRect.height - padding * 2) / natH,
      1, // never zoom past 100% on fit
    );
    const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale));
    const x = (vpRect.width - natW * scale) / 2;
    const y = (vpRect.height - natH * scale) / 2;
    setTransform({ x, y, scale });
  }, []);

  // Keep a ref alongside the state so callbacks don't capture stale values.
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useLayoutEffect(() => {
    fitToViewport();
    // Refit when children change shape.
    const ct = contentRef.current;
    if (!ct) return;
    const obs = new ResizeObserver(() => fitToViewport());
    obs.observe(ct);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  // Wheel zoom (anchored at cursor).
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    setTransform((prev) => {
      const direction = e.deltaY < 0 ? 1 : -1;
      const factor = direction > 0 ? 1.1 : 1 / 1.1;
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));
      if (nextScale === prev.scale) return prev;
      // Keep the point under the cursor stationary in screen coordinates.
      const k = nextScale / prev.scale;
      const x = cursorX - (cursorX - prev.x) * k;
      const y = cursorY - (cursorY - prev.y) * k;
      return { x, y, scale: nextScale };
    });
  };

  // Drag-to-pan. Only kicks in when the user grabbed the canvas itself
  // (not a card, not a button, not an iframe).
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, iframe, [data-no-pan]')) return;
    draggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: transformRef.current.x,
      origY: transformRef.current.y,
    };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = draggingRef.current;
    if (!d) return;
    setTransform((prev) => ({
      ...prev,
      x: d.origX + (e.clientX - d.startX),
      y: d.origY + (e.clientY - d.startY),
    }));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const zoomBy = (factor: number) => {
    setTransform((prev) => {
      const vp = viewportRef.current;
      if (!vp) return prev;
      const rect = vp.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));
      if (nextScale === prev.scale) return prev;
      const k = nextScale / prev.scale;
      return {
        x: cx - (cx - prev.x) * k,
        y: cy - (cy - prev.y) * k,
        scale: nextScale,
      };
    });
  };

  return (
    <div
      ref={viewportRef}
      className={cn(
        'relative h-full w-full overflow-hidden bg-bg',
        draggingRef.current ? 'cursor-grabbing' : 'cursor-grab',
        className,
      )}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        // Square grid — two crossing 1px lines per cell. Background size and
        // position track the camera transform so the grid behaves like graph
        // paper UNDER the designs: pan moves the paper, zoom scales it.
        backgroundImage:
          'linear-gradient(to right, rgba(31,26,20,0.085) 1px, transparent 1px), linear-gradient(to bottom, rgba(31,26,20,0.085) 1px, transparent 1px)',
        backgroundSize: `${64 * transform.scale}px ${64 * transform.scale}px`,
        backgroundPosition: `${transform.x}px ${transform.y}px`,
      }}
    >
      <div
        ref={contentRef}
        className="absolute left-0 top-0 origin-top-left"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        {children}
      </div>

      <CanvasToolbar
        scale={transform.scale}
        onZoomIn={() => zoomBy(ZOOM_STEP)}
        onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
        onFit={fitToViewport}
      />
    </div>
  );
}

function CanvasToolbar({
  scale,
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  return (
    <div
      data-no-pan
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute bottom-4 right-4 z-40 flex items-center gap-0.5 rounded-full border border-border bg-panel/95 px-1 py-0.5 text-[12px] shadow-lift backdrop-blur"
    >
      <CanvasBtn aria="Zoom out" onClick={onZoomOut} disabled={scale <= MIN_SCALE + 0.001}>
        <Icon name="close" size={12} className="rotate-45" />
      </CanvasBtn>
      <button
        type="button"
        onClick={onFit}
        className="rounded-full px-2 py-1 font-medium text-fg/85 transition-colors hover:bg-hover"
        title="Fit to screen"
      >
        {Math.round(scale * 100)}%
      </button>
      <CanvasBtn aria="Zoom in" onClick={onZoomIn} disabled={scale >= MAX_SCALE - 0.001}>
        <Icon name="plus" size={12} />
      </CanvasBtn>
    </div>
  );
}

function CanvasBtn({
  aria,
  onClick,
  disabled,
  children,
}: {
  aria: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-fg/70 transition-colors hover:bg-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
