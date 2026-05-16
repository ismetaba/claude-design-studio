import { useEffect, useMemo, useRef } from 'react';
import { useDesignStore } from '../../store/designStore';
import { useStreamingGenerate } from '../../hooks/useStreamingGenerate';
import { stripCodeFences } from '../../lib/stripCodeFences';
import { Markdown } from '../ui/Markdown';
import { Icon } from '../ui/Icon';
import type { Turn } from '../../types/domain';

export function ConversationView() {
  const activeSessionId = useDesignStore((s) => s.activeSessionId);
  const sessions = useDesignStore((s) => s.sessions);
  const isStreaming = useDesignStore((s) => s.isStreaming);
  const { start } = useStreamingGenerate();
  const session = activeSessionId ? sessions[activeSessionId] : undefined;

  const turns = session?.turns ?? [];
  const lastTurnId = turns.length > 0 ? turns[turns.length - 1].id : null;
  const lastContentLen = turns.length > 0 ? turns[turns.length - 1].content.length : 0;
  const lastTurn = turns.length > 0 ? turns[turns.length - 1] : null;

  // Auto-scroll: keep the latest message in view as the assistant streams.
  // jsdom (in tests) doesn't implement scrollIntoView, so guard with a typeof check.
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = endRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [lastTurnId, lastContentLen, isStreaming]);

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-[12px] text-muted">
        <Icon name="sparkle" size={20} className="text-accent" />
        <p>Pick a design or start a new one.</p>
      </div>
    );
  }

  if (turns.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-[12px] text-muted">
        <Icon name="sparkle" size={20} className="text-accent" />
        <p>Type a prompt below to start your design.</p>
        <p className="text-[11px] text-muted/80">
          Each project keeps a single ongoing conversation with Claude.
        </p>
      </div>
    );
  }

  // If the last turn is a user turn but no assistant has replied yet AND we're
  // not currently streaming, the previous generation was interrupted (probably
  // by a page reload). Offer to resume.
  const interrupted = !isStreaming && lastTurn?.role === 'user';

  return (
    <div className="flex flex-col gap-4 px-4 pb-4 pt-3">
      {turns.map((turn) => (
        <TurnView key={turn.id} turn={turn} />
      ))}

      {isStreaming && (
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
          <span>Generating…</span>
        </div>
      )}

      {interrupted && (
        <div className="flex items-start gap-2 rounded-xl border border-accent-soft bg-accent-soft/30 p-3 text-[12px]">
          <Icon name="refresh" size={14} className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-fg-strong">Generation was interrupted</p>
            <p className="text-muted">
              The last request didn't get a response. Resume to send it again with the project context intact.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void start()}
            className="shrink-0 rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Resume
          </button>
        </div>
      )}

      <div ref={endRef} aria-hidden="true" className="h-px w-full" />
    </div>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  const prose = useMemo(
    () => (turn.role === 'assistant' ? stripCodeFences(turn.content) : ''),
    [turn.role, turn.content],
  );

  if (turn.role === 'user') {
    return (
      <div className="rounded-2xl bg-hover px-3 py-2 text-[12px] leading-snug text-fg/90">
        {turn.content}
      </div>
    );
  }

  if (!prose) {
    return (
      <p className="text-[11px] italic text-muted">
        Claude returned only HTML — see the preview on the right.
      </p>
    );
  }
  return <Markdown source={prose} />;
}
