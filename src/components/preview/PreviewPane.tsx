import { useMemo, useState } from 'react';
import { useDesignStore } from '../../store/designStore';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useInteractionStore } from '../../store/interactionStore';
import { Icon } from '../ui/Icon';
import { ExportMenu } from '../export/ExportMenu';
import { DeviceToggle, DEVICE_WIDTH_PX, type Device } from './DeviceToggle';
import { CommentOverlay } from './CommentOverlay';
import { DrawOverlay } from './DrawOverlay';
import { parseHtmlFiles, fileById, type VirtualFile } from '../../lib/parseHtmlFiles';
import { cn } from '../../lib/cn';

const EMPTY_MESSAGE = 'Describe a UI to begin';
const TAILWIND_CDN = '<script src="https://cdn.tailwindcss.com"></script>';

function wrapComponentForPreview(snippet: string): string {
  return `<!doctype html><html><head><meta charset="utf-8">${TAILWIND_CDN}<style>body{margin:0;font-family:Inter,system-ui,sans-serif}</style></head><body class="bg-stone-50 p-6">${snippet}</body></html>`;
}

function bytesLabel(text: string): string {
  const bytes = new Blob([text]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function typeLabel(kind: VirtualFile['kind']): string {
  switch (kind) {
    case 'page':
      return 'HTML page';
    case 'component':
      return 'Component';
    case 'style':
      return 'Stylesheet';
    case 'script':
      return 'Script';
  }
}

export interface PreviewPaneProps {
  debounceMs?: number;
}

export function PreviewPane({ debounceMs = 150 }: PreviewPaneProps) {
  const activeSessionId = useDesignStore((s) => s.activeSessionId);
  const sessions = useDesignStore((s) => s.sessions);
  const session = activeSessionId ? sessions[activeSessionId] : undefined;
  const sourceHtml = session?.currentHtml ?? '';
  const debounced = useDebouncedValue(sourceHtml, debounceMs);

  const files = useMemo(() => parseHtmlFiles(debounced), [debounced]);
  const activeFileId = useInteractionStore((s) => s.activeFileId);
  const file = fileById(files, activeFileId) ?? files[0];

  const [device, setDevice] = useState<Device>('desktop');
  const [reloadKey, setReloadKey] = useState(0);
  const mode = useInteractionStore((s) => s.mode);
  const widthPx = DEVICE_WIDTH_PX[device];

  const hasPage = debounced.trim().length > 0 && file?.kind === 'page';
  const annotating = mode !== 'normal';

  const previewHtml = useMemo(() => {
    if (!file) return '';
    if (file.kind === 'page') return file.content;
    if (file.kind === 'component') return wrapComponentForPreview(file.content);
    return '';
  }, [file]);

  const openInNewTab = () => {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const isEmpty = !file || file.content.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          {file && !isEmpty && (
            <>
              <Icon name="file" size={14} className="shrink-0 text-muted" />
              <span className="truncate text-[13px] font-medium text-fg-strong">{file.name}</span>
              <span className="shrink-0 rounded-full bg-hover px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                {typeLabel(file.kind)}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isEmpty && (file?.kind === 'page' || file?.kind === 'component') && <DeviceToggle device={device} onChange={setDevice} />}
          {!isEmpty && <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />}
          <button
            type="button"
            aria-label="Reload preview"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={!previewHtml || isEmpty}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg disabled:opacity-40"
          >
            <Icon name="refresh" size={14} />
          </button>
          <button
            type="button"
            aria-label="Open preview in new tab"
            onClick={openInNewTab}
            disabled={!previewHtml || isEmpty}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-fg/85 transition-colors hover:bg-hover disabled:opacity-40"
          >
            <Icon name="external" size={13} />
            <span>Open</span>
          </button>
          <ExportMenu />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden p-2">
        {isEmpty ? (
          <EmptyState />
        ) : file.kind === 'page' || file.kind === 'component' ? (
          <PreviewFrame
            html={previewHtml}
            reloadKey={reloadKey}
            widthPx={widthPx}
            annotating={annotating}
            meta={{ size: bytesLabel(file.content), filename: file.name, type: typeLabel(file.kind) }}
          />
        ) : (
          <SourceCard file={file} />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="m-auto flex flex-col items-center gap-2 text-center">
      <Icon name="sparkle" size={28} className="text-accent" />
      <p className="text-[14px] text-fg/80">{EMPTY_MESSAGE}</p>
      <p className="text-[12px] text-muted">Type a prompt in the sidebar to generate your first design.</p>
    </div>
  );
}

function PreviewFrame({
  html,
  reloadKey,
  widthPx,
  annotating,
  meta,
}: {
  html: string;
  reloadKey: number;
  widthPx: number | null;
  annotating: boolean;
  meta: { size: string; filename: string; type: string };
}) {
  return (
    <div className="group/preview relative flex h-full w-full max-w-full justify-center">
      <div
        className="relative flex h-full w-full max-w-full justify-center transition-[max-width] duration-200"
        style={widthPx ? { maxWidth: `${widthPx}px` } : undefined}
      >
        <div className="relative flex h-full w-full overflow-hidden rounded-2xl border border-border bg-white shadow-lift">
          <iframe
            key={reloadKey}
            title="Live preview"
            sandbox="allow-scripts"
            srcDoc={html}
            className="block h-full w-full bg-white"
            style={annotating ? { pointerEvents: 'none' } : undefined}
          />
          <CommentOverlay />
          <DrawOverlay />
        </div>
      </div>
      {/* Meta line sits on top of the preview, only visible on hover so it never steals vertical space. */}
      <div
        className="pointer-events-none absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-fg-strong/85 px-2.5 py-1 text-[10px] text-bg opacity-0 backdrop-blur transition-opacity duration-200 group-hover/preview:opacity-100"
      >
        <span className="font-medium">{meta.filename}</span>
        <span>·</span>
        <span>{meta.type}</span>
        <span>·</span>
        <span>{meta.size}</span>
      </div>
    </div>
  );
}

function SourceCard({ file }: { file: VirtualFile }) {
  return (
    <div className="m-auto flex w-full max-w-2xl flex-col gap-3">
      <div className={cn(
        'overflow-hidden rounded-2xl border border-border bg-panel shadow-soft',
      )}>
        <div className="border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
          {typeLabel(file.kind)} · read-only
        </div>
        <pre className="max-h-[60vh] overflow-auto px-4 py-3 font-mono text-[12px] leading-relaxed text-fg/85">
          {file.content || '/* (empty) */'}
        </pre>
      </div>
      <div className="flex items-center justify-center gap-2 text-[11px] text-muted">
        <span className="font-medium text-fg/75">{file.name}</span>
        <span>·</span>
        <span>{typeLabel(file.kind)}</span>
        <span>·</span>
        <span>{bytesLabel(file.content)}</span>
      </div>
    </div>
  );
}
