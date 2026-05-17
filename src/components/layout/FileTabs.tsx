import { useEffect, useMemo } from 'react';
import { useDesignStore } from '../../store/designStore';
import { useInteractionStore } from '../../store/interactionStore';
import { parseHtmlFiles, type VirtualFile } from '../../lib/parseHtmlFiles';
import { cn } from '../../lib/cn';

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
      <rect x="3.5" y="3" width="9" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="6" y="1.5" width="4" height="2.5" rx="0.6" stroke="currentColor" strokeWidth="1.2" fill="currentColor" />
    </svg>
  );
}

/**
 * Horizontal file tab strip in the TopBar. Replaces the old FilesPanel sidebar
 * and matches Claude Design's layout: a "Design Files" tab that switches the
 * canvas to a full file browser, followed by each parsed file as a tab that
 * shows that file's preview.
 */
export function FileTabs() {
  const activeSessionId = useDesignStore((s) => s.activeSessionId);
  const sessions = useDesignStore((s) => s.sessions);
  const html = activeSessionId ? (sessions[activeSessionId]?.currentHtml ?? '') : '';
  const files = useMemo(() => parseHtmlFiles(html), [html]);

  const activeFileId = useInteractionStore((s) => s.activeFileId);
  const setActiveFileId = useInteractionStore((s) => s.setActiveFileId);
  const overviewActive = useInteractionStore((s) => s.filesOverviewOpen);
  const setFilesOverviewOpen = useInteractionStore((s) => s.setFilesOverviewOpen);

  // Snap the active id to a real file when the set of files changes (e.g. on
  // session switch or content change).
  useEffect(() => {
    if (!files.find((f) => f.id === activeFileId)) {
      setActiveFileId(files[0]?.id ?? 'pages/index');
    }
  }, [files, activeFileId, setActiveFileId]);

  if (files.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-0.5">
      <button
        type="button"
        role="tab"
        aria-selected={overviewActive}
        onClick={() => setFilesOverviewOpen(true)}
        className={cn(
          'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors',
          overviewActive
            ? 'bg-panel text-fg-strong shadow-soft'
            : 'text-muted hover:bg-hover hover:text-fg',
        )}
      >
        <ClipboardIcon />
        <span>Design Files</span>
      </button>
      <div
        role="tablist"
        aria-label="Design files"
        className="ml-1 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto"
      >
        {files.map((file) => (
          <FileTabButton
            key={file.id}
            file={file}
            active={!overviewActive && file.id === activeFileId}
            onSelect={() => setActiveFileId(file.id)}
          />
        ))}
      </div>
    </div>
  );
}

function FileTabButton({
  file,
  active,
  onSelect,
}: {
  file: VirtualFile;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      title={file.name}
      className={cn(
        'group inline-flex h-7 max-w-[200px] shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] transition-colors',
        active
          ? 'bg-panel text-fg-strong shadow-soft'
          : 'text-muted hover:bg-hover hover:text-fg',
      )}
    >
      <span className="truncate">{file.name}</span>
    </button>
  );
}
