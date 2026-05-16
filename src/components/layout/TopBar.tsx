import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDesignStore } from '../../store/designStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useInteractionStore } from '../../store/interactionStore';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/cn';

export function TopBar() {
  const navigate = useNavigate();
  const activeSessionId = useDesignStore((s) => s.activeSessionId);
  const sessions = useDesignStore((s) => s.sessions);
  const session = activeSessionId ? sessions[activeSessionId] : undefined;
  const createSession = useDesignStore((s) => s.createSession);
  const renameSession = useDesignStore((s) => s.renameSession);

  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const mode = useInteractionStore((s) => s.mode);
  const toggleMode = useInteractionStore((s) => s.toggleMode);

  const title = session?.title?.trim() || 'Untitled design';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (!session) return;
    const next = draft.trim();
    if (!next || next === title) return;
    renameSession(session.id, next);
  };

  const hasContent = !!session?.currentHtml.trim();

  const openPresent = () => {
    if (!session?.currentHtml) return;
    const blob = new Blob([session.currentHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <header className="relative flex h-11 shrink-0 items-center gap-3 bg-bg pl-3 pr-2">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-accent-soft/40 via-accent-soft/10 to-transparent"
      />
      <div className="relative flex min-w-0 flex-1 items-center gap-1.5">
        <Link
          to="/"
          aria-label="All designs"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-elev shadow-soft hover:opacity-90"
        >
          <Icon name="palette" size={16} />
        </Link>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              } else if (e.key === 'Escape') {
                setDraft(title);
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-fg-strong outline-none placeholder:text-muted"
            placeholder="Untitled design"
          />
        ) : (
          <button
            type="button"
            onClick={() => session && setEditing(true)}
            disabled={!session}
            className={cn(
              'min-w-0 truncate rounded-md px-1.5 py-1 text-left text-[14px] font-medium text-fg-strong transition-colors',
              session ? 'hover:bg-hover' : 'cursor-default text-muted',
            )}
            title={session ? 'Click to rename' : 'No design selected'}
          >
            {title}
          </button>
        )}
        <button
          type="button"
          aria-label="New design"
          onClick={() => {
            const id = createSession();
            navigate(`/p/${id}`);
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg"
        >
          <Icon name="plus" size={13} />
        </button>
      </div>
      <div className="relative flex items-center gap-1">
        <ModeButton
          active={mode === 'comment'}
          disabled={!hasContent}
          icon="comment"
          label="Comment"
          onClick={() => toggleMode('comment')}
        />
        <ModeButton
          active={mode === 'draw'}
          disabled={!hasContent}
          icon="pencil"
          label="Draw"
          onClick={() => toggleMode('draw')}
        />
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <button
          type="button"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
        </button>
        <button
          type="button"
          onClick={openPresent}
          disabled={!hasContent}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-fg/85 transition-colors hover:bg-hover disabled:opacity-40"
        >
          <Icon name="external" size={13} />
          <span>Present</span>
        </button>
        <button
          type="button"
          disabled={!hasContent}
          onClick={() => {
            if (!session?.currentHtml) return;
            void navigator.clipboard?.writeText(session.currentHtml);
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-fg-strong px-3 py-1.5 text-[12px] font-medium text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span>Share</span>
        </button>
      </div>
    </header>
  );
}

function ModeButton({
  active,
  disabled,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: 'comment' | 'pencil';
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-40',
        active ? 'bg-accent-soft text-accent' : 'text-fg/85 hover:bg-hover',
      )}
    >
      <Icon name={icon} size={13} />
      <span>{label}</span>
    </button>
  );
}
