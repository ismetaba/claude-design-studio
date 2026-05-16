import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/cn';
import type { Session } from '../../types/domain';

export interface ProjectCardProps {
  project: Session;
  variant?: 'default' | 'tutorial' | 'system';
}

function relativeDate(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day && new Date(ts).getDate() === new Date(now).getDate()) return 'Today';
  if (diff < 2 * day) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ProjectCard({ project, variant = 'default' }: ProjectCardProps) {
  const title = project.title?.trim() || 'Untitled design';
  const hasContent = useMemo(() => project.currentHtml.trim().length > 0, [project.currentHtml]);

  return (
    <Link
      to={`/p/${project.id}`}
      className={cn(
        'group relative flex flex-col gap-2 overflow-hidden rounded-2xl transition-colors',
        variant === 'tutorial'
          ? 'bg-blue-50/70 ring-1 ring-blue-100'
          : variant === 'system'
            ? 'bg-accent-soft/40 ring-1 ring-accent-soft/30'
            : 'hover:bg-hover/60',
      )}
      title={title}
    >
      <div
        className={cn(
          'relative flex aspect-[5/4] w-full items-center justify-center overflow-hidden rounded-2xl',
          variant === 'tutorial'
            ? 'bg-blue-50'
            : variant === 'system'
              ? 'bg-accent-soft/30'
              : 'bg-bg-elev',
        )}
      >
        {hasContent ? (
          <iframe
            title={`${title} preview`}
            sandbox="allow-scripts"
            srcDoc={project.currentHtml}
            tabIndex={-1}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full origin-top-left scale-[0.35] bg-white"
            style={{ width: '286%', height: '286%' }}
          />
        ) : (
          <div className="text-muted/60">
            <Icon name="folder" size={48} />
          </div>
        )}
        {variant === 'tutorial' && (
          <button
            type="button"
            aria-label="Dismiss tutorial card"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-muted hover:bg-white hover:text-fg"
          >
            <Icon name="close" size={12} />
          </button>
        )}
      </div>
      <div className="px-1 pb-2">
        <h3 className="line-clamp-2 text-[14px] font-medium text-fg-strong">{title}</h3>
        <div className="mt-1 flex items-center justify-between gap-2 text-[12px] text-muted">
          {variant === 'tutorial' ? (
            <span className="text-accent">Quick tutorial</span>
          ) : (
            <span>Your design · {relativeDate(project.updatedAt)}</span>
          )}
          <span className="shrink-0 rounded-md bg-hover px-1.5 py-0.5 text-[10px] font-medium text-muted">
            Owner
          </span>
        </div>
      </div>
    </Link>
  );
}
