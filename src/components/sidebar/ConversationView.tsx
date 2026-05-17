import { useEffect, useMemo, useRef } from 'react';
import { useDesignStore } from '../../store/designStore';
import { useStreamingGenerate } from '../../hooks/useStreamingGenerate';
import { parseAssistantResponse } from '../../lib/parseAssistantResponse';
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

  const interrupted = !isStreaming && lastTurn?.role === 'user';

  return (
    <div className="flex flex-col gap-4 px-4 pb-4 pt-3">
      {turns.map((turn) => (
        <TurnView key={turn.id} turn={turn} />
      ))}

      {isStreaming && <StreamingPill />}

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

/**
 * Phase pills shown while the assistant is streaming. We cycle through a
 * canonical sequence (Searching → Writing → Editing) so the panel feels like
 * Claude Design's collapsible status bands even without real tool-use signals.
 */
function StreamingPill() {
  const phases = ['Searching', 'Writing', 'Editing'] as const;
  return (
    <div className="flex flex-col gap-1.5">
      {phases.map((label, i) => (
        <div
          key={label}
          className="flex items-center gap-2 rounded-lg border border-border bg-panel px-2.5 py-1.5 text-[11px] text-fg/80"
        >
          <span
            className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
            style={{ animation: `cdsPulse 1.4s ease-in-out ${i * 0.18}s infinite` }}
            aria-hidden="true"
          />
          <Icon name="sparkle" size={11} className="shrink-0 text-accent" />
          <span className="font-medium">{label}</span>
          <Icon name="chevron-down" size={10} className="ml-auto shrink-0 text-muted/70" />
        </div>
      ))}
      <style>{`@keyframes cdsPulse { 0%,100% { opacity: 0.35 } 50% { opacity: 1 } }`}</style>
    </div>
  );
}

function TurnView({ turn }: { turn: Turn }) {
  const parsed = useMemo(
    () => (turn.role === 'assistant' ? parseAssistantResponse(turn.content) : null),
    [turn.role, turn.content],
  );

  if (turn.role === 'user') {
    return (
      <div className="rounded-2xl bg-hover px-3 py-2 text-[12px] leading-snug text-fg/90">
        {turn.content}
      </div>
    );
  }

  if (!parsed) return null;

  // Questions mode: just announce — the form lives in the canvas now.
  if (parsed.kind === 'questions') {
    return (
      <div className="flex flex-col gap-2">
        {parsed.prose && <Markdown source={parsed.prose} />}
        <div className="flex items-center gap-1.5 rounded-xl border border-accent-soft bg-accent-soft/30 px-3 py-2 text-[11px] text-fg/85">
          <Icon name="sparkle" size={11} className="text-accent" />
          <span>
            {parsed.groups.length} quick question{parsed.groups.length === 1 ? '' : 's'} on the right — answer to continue.
          </span>
        </div>
      </div>
    );
  }

  // Variations mode: show the prose intro; the actual grid renders in the preview pane.
  if (parsed.kind === 'variations') {
    return (
      <div className="flex flex-col gap-2">
        {parsed.prose && <Markdown source={parsed.prose} />}
        <div className="flex items-center gap-1.5 text-[11px] text-muted">
          <Icon name="sparkle" size={11} className="text-accent" />
          <span>
            Showing {parsed.items.length} variations in the preview — click one to make it the main design.
          </span>
        </div>
      </div>
    );
  }

  // Single mode: just the prose. Empty prose => HTML-only response.
  if (!parsed.prose) {
    return (
      <p className="text-[11px] italic text-muted">
        Claude returned only HTML — see the preview on the right.
      </p>
    );
  }
  return <Markdown source={parsed.prose} />;
}
