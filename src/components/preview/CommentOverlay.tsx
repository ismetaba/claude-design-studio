import { useEffect, useRef, useState } from 'react';
import { useDesignStore } from '../../store/designStore';
import { useInteractionStore } from '../../store/interactionStore';
import { useAnnotationSubmit } from '../../hooks/useAnnotationSubmit';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/cn';

interface DraftComment {
  x: number;
  y: number;
}

export function CommentOverlay() {
  const mode = useInteractionStore((s) => s.mode);
  const setMode = useInteractionStore((s) => s.setMode);
  const activeSessionId = useDesignStore((s) => s.activeSessionId);
  const sessions = useDesignStore((s) => s.sessions);
  const addComment = useDesignStore((s) => s.addComment);
  const deleteComment = useDesignStore((s) => s.deleteComment);
  const clearComments = useDesignStore((s) => s.clearComments);
  const { sendComments } = useAnnotationSubmit();
  const isStreaming = useDesignStore((s) => s.isStreaming);

  const session = activeSessionId ? sessions[activeSessionId] : undefined;
  const comments = session?.comments ?? [];
  const openComments = comments.filter((c) => c.status === 'open');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState<DraftComment | null>(null);
  const [draftText, setDraftText] = useState('');

  useEffect(() => {
    if (mode !== 'comment') {
      setDraft(null);
      setDraftText('');
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'comment') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (draft) {
          setDraft(null);
          setDraftText('');
        } else {
          setMode('normal');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, draft, setMode]);

  if (mode !== 'comment' && openComments.length === 0) {
    return null;
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'comment') return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    setDraft({ x, y });
    setDraftText('');
  };

  const saveDraft = () => {
    if (!draft) return;
    const text = draftText.trim();
    if (!text) return;
    addComment({ x: draft.x, y: draft.y, text });
    setDraft(null);
    setDraftText('');
  };

  const sendAll = async () => {
    // Persist draft first if any
    if (draft && draftText.trim()) {
      addComment({ x: draft.x, y: draft.y, text: draftText.trim() });
      setDraft(null);
      setDraftText('');
    }
    await sendComments();
    setMode('normal');
  };

  const interactive = mode === 'comment';

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      aria-hidden={!interactive}
      className={cn(
        'absolute inset-0 z-30',
        interactive ? 'cursor-crosshair' : 'pointer-events-none',
      )}
      style={interactive ? undefined : { pointerEvents: 'none' }}
    >
      {openComments.map((c, i) => (
        <CommentPin
          key={c.id}
          n={i + 1}
          x={c.x}
          y={c.y}
          text={c.text}
          onDelete={() => deleteComment(c.id)}
          interactive={interactive}
        />
      ))}

      {draft && (
        <CommentPopover
          x={draft.x}
          y={draft.y}
          value={draftText}
          onChange={setDraftText}
          onCancel={() => {
            setDraft(null);
            setDraftText('');
          }}
          onSave={saveDraft}
        />
      )}

      {interactive && openComments.length > 0 && (
        <div
          className="pointer-events-auto absolute bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-fg-strong px-3 py-1.5 text-[12px] text-bg shadow-float"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="font-medium">{openComments.length} open</span>
          <button
            type="button"
            disabled={isStreaming}
            onClick={() => clearComments('open')}
            className="rounded-full px-2 py-0.5 text-bg/70 transition-colors hover:text-bg disabled:opacity-50"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={isStreaming}
            onClick={() => void sendAll()}
            className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            <Icon name="send" size={11} />
            Send to Claude
          </button>
        </div>
      )}
    </div>
  );
}

function CommentPin({
  n,
  x,
  y,
  text,
  onDelete,
  interactive,
}: {
  n: number;
  x: number;
  y: number;
  text: string;
  onDelete: () => void;
  interactive: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="pointer-events-auto absolute"
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: 'translate(-50%, -100%)' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white shadow-lift">
        {n}
        {interactive && (
          <button
            type="button"
            aria-label="Delete comment"
            onClick={onDelete}
            className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-fg-strong text-bg group-hover:flex"
          >
            <Icon name="close" size={8} />
          </button>
        )}
      </div>
      {hover && (
        <div className="absolute left-1/2 top-full mt-1 w-56 -translate-x-1/2 rounded-md bg-fg-strong px-3 py-2 text-[12px] text-bg shadow-float">
          {text}
        </div>
      )}
    </div>
  );
}

function CommentPopover({
  x,
  y,
  value,
  onChange,
  onCancel,
  onSave,
}: {
  x: number;
  y: number;
  value: string;
  onChange: (next: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  // Clamp popover so it doesn't fall off the edges (260px wide).
  const left = Math.min(0.85, Math.max(0.15, x));
  const top = y > 0.7 ? y - 0.02 : y + 0.04;
  const translate = y > 0.7 ? 'translate(-50%, -100%)' : 'translate(-50%, 0)';

  return (
    <div
      className="pointer-events-auto absolute z-50 w-[260px] rounded-xl bg-panel p-3 shadow-lift"
      style={{
        left: `${left * 100}%`,
        top: `${top * 100}%`,
        transform: translate,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSave();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        rows={3}
        placeholder="Describe the issue or suggestion..."
        className="block w-full resize-none rounded-md border border-border bg-bg-elev px-2 py-1.5 text-[13px] text-fg-strong placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-2 py-1 text-[12px] text-muted transition-colors hover:bg-hover hover:text-fg"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={value.trim().length === 0}
          className="rounded-md bg-accent px-2.5 py-1 text-[12px] font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
