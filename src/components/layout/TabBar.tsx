import { useEffect } from 'react';
import { useDesignStore } from '../../store/designStore';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/cn';

export function TabBar() {
  const openTabIds = useDesignStore((s) => s.openTabIds);
  const sessions = useDesignStore((s) => s.sessions);
  const activeSessionId = useDesignStore((s) => s.activeSessionId);
  const selectSession = useDesignStore((s) => s.selectSession);
  const closeTab = useDesignStore((s) => s.closeTab);
  const createSession = useDesignStore((s) => s.createSession);

  // Keyboard shortcuts: Cmd/Ctrl+W close current, Cmd/Ctrl+1..9 select tab.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      // Cmd+W close
      if (e.key.toLowerCase() === 'w' && !e.shiftKey && !e.altKey) {
        if (!activeSessionId) return;
        // Browsers usually own Cmd+W; only intercept if the event is preventable + focused on our app.
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        closeTab(activeSessionId);
      }
      // Cmd+1..9 — index into openTabIds
      const n = Number(e.key);
      if (!Number.isNaN(n) && n >= 1 && n <= 9) {
        const id = openTabIds[n - 1];
        if (id) {
          e.preventDefault();
          selectSession(id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeSessionId, openTabIds, closeTab, selectSession]);

  // A single tab is just the active design — its name is already in the TopBar.
  // Hide the row entirely so the preview can use that vertical space.
  if (openTabIds.length <= 1) return null;

  return (
    <div
      role="tablist"
      aria-label="Open designs"
      className="flex h-9 shrink-0 items-center gap-0.5 border-b border-border bg-bg px-2"
    >
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        {openTabIds.map((id) => {
          const session = sessions[id];
          if (!session) return null;
          const active = id === activeSessionId;
          const title = session.title?.trim() || 'Untitled design';
          return (
            <div
              key={id}
              role="tab"
              aria-selected={active}
              className={cn(
                'group/tab flex h-7 max-w-[200px] shrink-0 items-center gap-1.5 rounded-md px-2 text-[12px] transition-colors',
                active
                  ? 'bg-panel text-fg-strong shadow-soft'
                  : 'text-muted hover:bg-hover hover:text-fg',
              )}
            >
              <button
                type="button"
                onClick={() => selectSession(id)}
                className="min-w-0 truncate text-left"
                title={title}
              >
                {title}
              </button>
              <button
                type="button"
                aria-label={`Close ${title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(id);
                }}
                className={cn(
                  'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted/70 transition-colors hover:bg-hover hover:text-fg',
                  active ? '' : 'opacity-0 group-hover/tab:opacity-100',
                )}
              >
                <Icon name="close" size={10} />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Open a new design tab"
        onClick={() => createSession()}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg"
      >
        <Icon name="plus" size={13} />
      </button>
    </div>
  );
}
