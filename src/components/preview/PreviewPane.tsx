import { useMemo, useState } from 'react';
import { useDesignStore } from '../../store/designStore';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useInteractionStore } from '../../store/interactionStore';
import { Icon } from '../ui/Icon';
import { ExportMenu } from '../export/ExportMenu';
import { CommentOverlay } from './CommentOverlay';
import { DrawOverlay } from './DrawOverlay';
import { VariationsCanvas } from './VariationsCanvas';
import { QuestionsCanvas } from './QuestionsCanvas';
import { DeviceFrame } from './DeviceFrame';
import { FilesBrowser } from './FilesBrowser';
import { parseHtmlFiles, fileById, type VirtualFile } from '../../lib/parseHtmlFiles';
import { parseAssistantResponse, type DeviceKind } from '../../lib/parseAssistantResponse';
import { detectDevice } from '../../lib/detectDevice';
import { extractDesignBg } from '../../lib/extractDesignBg';
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

  // Look at the latest assistant turn to detect special modes (questions /
  // variations). For "questions" we additionally require that turn to be the
  // VERY LAST turn — once the user has answered (appending a user turn) the
  // questions card should vanish so the streaming response can take over.
  const turns = useMemo(() => session?.turns ?? [], [session]);
  const lastAssistant = useMemo(
    () => [...turns].reverse().find((t) => t.role === 'assistant'),
    [turns],
  );
  const lastTurnId = turns[turns.length - 1]?.id;

  const parsedLast = useMemo(
    () => (lastAssistant ? parseAssistantResponse(lastAssistant.content) : null),
    [lastAssistant],
  );

  const questionsPayload = useMemo(() => {
    if (!parsedLast || parsedLast.kind !== 'questions' || !lastAssistant) return null;
    if (lastAssistant.id !== lastTurnId) return null;
    return {
      turnId: lastAssistant.id,
      title: parsedLast.title,
      intro: parsedLast.intro,
      groups: parsedLast.groups,
    };
  }, [parsedLast, lastAssistant, lastTurnId]);

  const variationItems = useMemo(() => {
    if (!parsedLast || parsedLast.kind !== 'variations') return null;
    // Variations canvas is a permanent view — there's no "selecting" one to
    // collapse into single mode. The user pans/zooms; refinements happen
    // through the sidebar prompt.
    return parsedLast.items;
  }, [parsedLast]);

  const files = useMemo(() => parseHtmlFiles(debounced), [debounced]);
  const activeFileId = useInteractionStore((s) => s.activeFileId);
  const showFilesOverview = useInteractionStore((s) => s.filesOverviewOpen);
  const file = fileById(files, activeFileId) ?? files[0];

  const [reloadKey, setReloadKey] = useState(0);
  const mode = useInteractionStore((s) => s.mode);
  const toggleMode = useInteractionStore((s) => s.toggleMode);

  // Device is auto-detected from the HTML (meta tag, viewport classes). No manual override:
  // the canvas always frames the design in its native device chrome.
  const effectiveDevice: DeviceKind = useMemo(
    () => (file?.kind === 'page' ? detectDevice(file.content) : 'desktop'),
    [file],
  );

  const annotating = mode !== 'normal';
  const isEmpty = !file || file.content.length === 0;

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

  const showCanvas = questionsPayload || variationItems;
  const isPreviewable = !showCanvas && !isEmpty && (file?.kind === 'page' || file?.kind === 'component');

  if (showFilesOverview) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-bg">
        <FilesBrowser files={files} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <div className="flex h-10 shrink-0 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-2 text-[12px] font-medium text-muted">
          <Icon name="search" size={12} className="shrink-0" />
          <span>100%</span>
        </div>
        <div className="flex items-center gap-1">
          <ModeButton
            active={mode === 'comment'}
            disabled={!isPreviewable || !previewHtml}
            icon="comment"
            label="Comment"
            onClick={() => toggleMode('comment')}
          />
          <ModeButton
            active={mode === 'draw'}
            disabled={!isPreviewable || !previewHtml}
            icon="pencil"
            label="Draw"
            onClick={() => toggleMode('draw')}
          />
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <button
            type="button"
            aria-label="Reload preview"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={!isPreviewable || !previewHtml}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg disabled:opacity-40"
          >
            <Icon name="refresh" size={14} />
          </button>
          <button
            type="button"
            aria-label="Open preview in new tab"
            onClick={openInNewTab}
            disabled={!isPreviewable || !previewHtml}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-fg/85 transition-colors hover:bg-hover disabled:opacity-40"
          >
            <Icon name="external" size={13} />
            <span>Open</span>
          </button>
          <ExportMenu />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden p-2">
        {questionsPayload ? (
          <QuestionsCanvas {...questionsPayload} />
        ) : variationItems ? (
          <VariationsCanvas items={variationItems} />
        ) : isEmpty ? (
          <EmptyState />
        ) : file?.kind === 'page' || file?.kind === 'component' ? (
          <PreviewFrame
            html={previewHtml}
            reloadKey={reloadKey}
            device={effectiveDevice}
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
  device,
  annotating,
  meta,
}: {
  html: string;
  reloadKey: number;
  device: DeviceKind;
  annotating: boolean;
  meta: { size: string; filename: string; type: string };
}) {
  const iframe = (
    <iframe
      key={reloadKey}
      title="Live preview"
      sandbox="allow-scripts"
      srcDoc={html}
      className="block h-full w-full bg-white"
      style={annotating ? { pointerEvents: 'none' } : undefined}
    />
  );

  // Desktop / web: the iframe IS the canvas — no chrome, no surrounding
  // backdrop, the design fills edge-to-edge like a real browser viewport.
  if (device === 'desktop') {
    return (
      <div className="group/preview relative flex h-full w-full max-w-full overflow-hidden bg-white">
        {iframe}
        <CommentOverlay />
        <DrawOverlay />
        <MetaPill {...meta} />
      </div>
    );
  }

  // Mobile / tablet: extract the design's own body background and use it as
  // the canvas backdrop so the phone chrome sits in a themed surround instead
  // of a generic cream grid. Fall back to the studio bg + grid if extraction
  // fails (the design has no parseable body bg).
  const designBg = extractDesignBg(html);
  const backdropStyle: React.CSSProperties = designBg
    ? { background: designBg }
    : {
        backgroundImage:
          'linear-gradient(to right, rgba(31,26,20,0.085) 1px, transparent 1px), linear-gradient(to bottom, rgba(31,26,20,0.085) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
      };

  return (
    <div
      className={cn(
        'group/preview relative flex h-full w-full max-w-full items-center justify-center overflow-hidden',
        !designBg && 'bg-bg',
      )}
      style={backdropStyle}
    >
      <div className="relative flex w-full items-center justify-center p-6">
        <DeviceFrame device={device}>
          {iframe}
          <CommentOverlay />
          <DrawOverlay />
        </DeviceFrame>
      </div>
      <MetaPill {...meta} />
    </div>
  );
}

function MetaPill({ filename, type, size }: { filename: string; type: string; size: string }) {
  return (
    <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-fg-strong/85 px-2.5 py-1 text-[10px] text-bg opacity-0 backdrop-blur transition-opacity duration-200 group-hover/preview:opacity-100">
      <span className="font-medium">{filename}</span>
      <span>·</span>
      <span>{type}</span>
      <span>·</span>
      <span>{size}</span>
    </div>
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
