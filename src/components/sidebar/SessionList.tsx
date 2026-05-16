import { useDesignStore } from '../../store/designStore';
import { SessionRow } from './SessionRow';

export interface SessionListProps {
  confirmDelete?: (title: string) => boolean;
}

export function SessionList({ confirmDelete }: SessionListProps) {
  const sessionOrder = useDesignStore((s) => s.sessionOrder);
  const sessions = useDesignStore((s) => s.sessions);
  const activeId = useDesignStore((s) => s.activeSessionId);
  const selectSession = useDesignStore((s) => s.selectSession);
  const deleteSession = useDesignStore((s) => s.deleteSession);

  if (sessionOrder.length === 0) {
    return <div className="px-3 py-2 text-[12px] text-muted">No designs yet</div>;
  }

  const ask =
    confirmDelete ?? ((title: string) => globalThis.confirm?.(`Delete "${title}"?`) ?? false);

  return (
    <div role="list" aria-label="Sessions" className="flex flex-col gap-0.5">
      {sessionOrder.map((id) => {
        const session = sessions[id];
        if (!session) return null;
        return (
          <SessionRow
            key={id}
            session={session}
            selected={id === activeId}
            onSelect={() => selectSession(id)}
            onDelete={() => {
              if (ask(session.title || 'Untitled design')) deleteSession(id);
            }}
          />
        );
      })}
    </div>
  );
}
