import { cn } from '../../lib/cn';
import { Icon } from '../ui/Icon';
import type { Session } from '../../types/domain';

export interface SessionRowProps {
  session: Session;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function SessionRow({ session, selected, onSelect, onDelete }: SessionRowProps) {
  const title = session.title?.trim() || 'Untitled design';
  return (
    <div
      role="listitem"
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'group relative flex items-center rounded-md transition-colors',
        selected ? 'bg-hover' : 'hover:bg-hover',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        title={title}
        className={cn(
          'flex min-w-0 flex-1 items-center px-3 py-2 text-left text-[13px] leading-tight',
          selected ? 'text-fg-strong' : 'text-fg/85',
        )}
      >
        <span className="truncate">{title}</span>
      </button>
      <button
        type="button"
        aria-label={`Delete ${title}`}
        onClick={onDelete}
        className="invisible mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-red-500/10 hover:text-red-500 group-hover:visible"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
