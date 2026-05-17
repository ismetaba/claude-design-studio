import { useState } from 'react';
import { useDesignStore } from '../../store/designStore';
import { useInteractionStore } from '../../store/interactionStore';
import { Icon } from '../ui/Icon';
import type { VirtualFile, VirtualFileKind } from '../../lib/parseHtmlFiles';
import { cn } from '../../lib/cn';

export interface FilesBrowserProps {
  files: VirtualFile[];
}

interface Section {
  key: VirtualFile['section'];
  label: string;
}

const SECTIONS: Section[] = [
  { key: 'pages', label: 'Pages' },
  { key: 'components', label: 'Components' },
  { key: 'styles', label: 'Styles' },
  { key: 'scripts', label: 'Scripts' },
];

const KIND_LABEL: Record<VirtualFileKind, string> = {
  page: 'HTML page',
  component: 'Component',
  style: 'Stylesheet',
  script: 'Script',
};

/**
 * Full file browser shown in place of the preview canvas when the "Design
 * Files" tab is active. Mirrors Claude Design's overview exactly: subtle
 * section bands, file rows with kind subtitle and right-aligned meta column,
 * a borderless right-pane empty state, and a dashed drop zone footer.
 */
export function FilesBrowser({ files }: FilesBrowserProps) {
  const session = useDesignStore((s) => {
    const id = s.activeSessionId;
    return id ? s.sessions[id] : undefined;
  });
  const setActiveFileId = useInteractionStore((s) => s.setActiveFileId);
  const activeFileId = useInteractionStore((s) => s.activeFileId);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hoverFile = hoverId ? files.find((f) => f.id === hoverId) : null;

  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <Toolbar projectName={session?.title?.trim() || 'project'} />

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto">
          {SECTIONS.map((section) => {
            const items = files.filter((f) => f.section === section.key);
            if (items.length === 0) return null;
            return (
              <FileSection key={section.key} label={section.label}>
                {items.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    selected={file.id === activeFileId}
                    onHover={(on) =>
                      setHoverId(on ? file.id : (id) => (id === file.id ? null : id))
                    }
                    onOpen={() => setActiveFileId(file.id)}
                    timestamp={relativeTime(session?.updatedAt)}
                  />
                ))}
              </FileSection>
            );
          })}
          {files.length === 0 && (
            <div className="flex h-full items-center justify-center px-6 py-12 text-center text-[12px] text-muted">
              No files yet — generate a design from the sidebar to populate this list.
            </div>
          )}
        </div>

        {/* Right pane: borderless, same bg — only the empty-state text divides it visually. */}
        <div className="hidden w-[36%] min-w-[280px] max-w-[520px] shrink-0 items-center justify-center md:flex">
          {hoverFile ? (
            <button
              type="button"
              onClick={() => hoverFile && setActiveFileId(hoverFile.id)}
              className="flex flex-col items-center gap-3 px-6 text-center"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-panel text-muted shadow-soft">
                <Icon name="file" size={20} />
              </span>
              <span className="text-[14px] font-medium text-fg-strong">{hoverFile.name}</span>
              <span className="text-[11px] text-muted">
                {KIND_LABEL[hoverFile.kind]} · {bytes(hoverFile.content)}
              </span>
            </button>
          ) : (
            <span className="text-[13px] text-muted/85">Select a file to preview</span>
          )}
        </div>
      </div>

      <DropZone />
    </div>
  );
}

function Toolbar({ projectName }: { projectName: string }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 px-4">
      <div className="flex items-center gap-3 text-[12px]">
        <span className="inline-flex h-7 w-7 items-center justify-center text-muted/70">
          <UpArrow />
        </span>
        <span className="inline-flex h-7 w-7 items-center justify-center text-muted/70">
          <Icon name="refresh" size={14} />
        </span>
        <span className="text-fg/85">{projectName}</span>
      </div>
      <div className="flex items-center gap-4 text-[12px] text-muted">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-fg"
        >
          <PaperclipIcon />
          <span>New sketch</span>
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-fg"
        >
          <PaperclipIcon />
          <span>Paste</span>
        </button>
      </div>
    </div>
  );
}

function FileSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      {/* Border token is the darker-warm shade — at low opacity it gives Claude
          Design's faint tinted band that sits a notch darker than the rows. */}
      <div className="bg-border/35 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </div>
      <ul role="list" className="flex flex-col">
        {children}
      </ul>
    </section>
  );
}

function FileRow({
  file,
  selected,
  onHover,
  onOpen,
  timestamp,
}: {
  file: VirtualFile;
  selected: boolean;
  onHover: (on: boolean) => void;
  onOpen: () => void;
  timestamp: string;
}) {
  return (
    <li>
      <button
        type="button"
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onClick={onOpen}
        className={cn(
          'flex w-full items-center gap-3 px-5 py-3 text-left transition-colors',
          selected
            ? 'bg-accent text-white'
            : 'hover:bg-hover/60',
        )}
      >
        <FileIcon kind={file.kind} selected={selected} />
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-[13px] font-medium', selected ? 'text-white' : 'text-fg-strong')}>
            {file.name}
          </span>
          <span className={cn('block text-[11px]', selected ? 'text-white/80' : 'text-muted')}>
            {KIND_LABEL[file.kind]}
          </span>
        </span>
        <span className={cn('shrink-0 text-[11px]', selected ? 'text-white/80' : 'text-muted')}>
          {timestamp}
        </span>
      </button>
    </li>
  );
}

function FileIcon({ kind: _kind, selected }: { kind: VirtualFileKind; selected?: boolean }) {
  // Single outlined page icon. Inverts to white on the highlighted (selected)
  // row so the contrast matches Claude Design's strong selection state.
  return (
    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center', selected ? 'text-white' : 'text-muted/80')}>
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
        <path
          d="M3 1.5h6.5L13 5v9a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5Z"
          stroke="currentColor"
          strokeWidth="1.2"
          fill={selected ? 'currentColor' : 'var(--panel)'}
          fillOpacity={selected ? 0.18 : 1}
        />
        <path d="M9.5 1.5V5H13" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    </span>
  );
}

function DropZone() {
  return (
    <div className="m-4 mt-2 flex shrink-0 flex-col items-center gap-1 rounded-xl border border-dashed border-border bg-bg-elev/20 px-6 py-5 text-center">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        ↑ Drop files here
      </span>
      <span className="text-[12px] text-muted/85">
        Images, docs, references, Figma links, or folders — Claude can read them.
      </span>
    </div>
  );
}

function UpArrow() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M12 19V5m0 0-6 6m6-6 6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
      <path
        d="M21 12.5 12.7 20.8a5 5 0 0 1-7.07-7.07L14 5.36a3.5 3.5 0 1 1 4.95 4.95L10.6 18.66a2 2 0 1 1-2.83-2.83l7.78-7.78"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function bytes(text: string): string {
  const n = new Blob([text]).size;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function relativeTime(epochMs?: number): string {
  if (!epochMs) return '—';
  const diff = Date.now() - epochMs;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return 'over a week ago';
}
