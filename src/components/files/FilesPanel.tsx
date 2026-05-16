import { useEffect, useMemo } from 'react';
import { useDesignStore } from '../../store/designStore';
import { useInteractionStore } from '../../store/interactionStore';
import { Icon, type IconName } from '../ui/Icon';
import { parseHtmlFiles, type VirtualFile } from '../../lib/parseHtmlFiles';
import { cn } from '../../lib/cn';

interface Section {
  key: 'pages' | 'components' | 'styles' | 'scripts';
  label: string;
}

const SECTIONS: Section[] = [
  { key: 'pages', label: 'Pages' },
  { key: 'components', label: 'Components' },
  { key: 'styles', label: 'Styles' },
  { key: 'scripts', label: 'Scripts' },
];

const ICON: Record<VirtualFile['kind'], IconName> = {
  page: 'file',
  component: 'file',
  style: 'file',
  script: 'file',
};

export function FilesPanel() {
  const activeSessionId = useDesignStore((s) => s.activeSessionId);
  const sessions = useDesignStore((s) => s.sessions);
  const html = activeSessionId ? sessions[activeSessionId]?.currentHtml ?? '' : '';
  const files = useMemo(() => parseHtmlFiles(html), [html]);

  const activeFileId = useInteractionStore((s) => s.activeFileId);
  const setActiveFileId = useInteractionStore((s) => s.setActiveFileId);

  // If the previously selected file no longer exists (e.g. user switched session),
  // fall back to the page file.
  useEffect(() => {
    if (!files.find((f) => f.id === activeFileId)) {
      setActiveFileId(files[0]?.id ?? 'pages/index');
    }
  }, [files, activeFileId, setActiveFileId]);

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-border bg-bg-elev">
      <div className="border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Design Files
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {SECTIONS.map((section) => {
          const items = files.filter((f) => f.section === section.key);
          if (items.length === 0) return null;
          return (
            <div key={section.key} className="px-2 py-1.5">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted/80">
                {section.label}
              </div>
              <ul className="flex flex-col gap-0.5" role="list" aria-label={section.label}>
                {items.map((file) => {
                  const selected = file.id === activeFileId;
                  return (
                    <li key={file.id}>
                      <button
                        type="button"
                        onClick={() => setActiveFileId(file.id)}
                        aria-current={selected ? 'true' : undefined}
                        className={cn(
                          'flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors',
                          selected
                            ? 'bg-accent-soft text-fg-strong'
                            : 'text-fg/85 hover:bg-hover',
                        )}
                      >
                        <Icon
                          name={ICON[file.kind]}
                          size={13}
                          className={selected ? 'text-accent' : 'text-muted'}
                        />
                        <span className="truncate">{file.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
