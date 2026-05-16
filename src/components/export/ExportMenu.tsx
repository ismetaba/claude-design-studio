import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { useDesignStore } from '../../store/designStore';
import { copyText, downloadFile, toReactComponentString } from '../../lib/exporters';
import { cn } from '../../lib/cn';

export interface ExportMenuProps {
  /** Inject for tests. */
  exporters?: {
    copyText?: typeof copyText;
    downloadFile?: typeof downloadFile;
  };
}

export function ExportMenu({ exporters }: ExportMenuProps = {}) {
  const sessionId = useDesignStore((s) => s.activeSessionId);
  const html = useDesignStore((s) =>
    s.activeSessionId ? s.sessions[s.activeSessionId]?.currentHtml ?? '' : '',
  );
  const setStreamError = useDesignStore((s) => s.setStreamError);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const _copy = exporters?.copyText ?? copyText;
  const _download = exporters?.downloadFile ?? downloadFile;

  const disabled = !sessionId || html.trim().length === 0;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const announce = (msg: string) => setStreamError(msg);

  const onCopyHtml = async () => {
    try {
      await _copy(html);
      announce('Copied HTML to clipboard.');
    } catch (err) {
      announce(`Copy failed: ${(err as Error).message}`);
    } finally {
      setOpen(false);
    }
  };

  const onDownload = () => {
    try {
      _download('design.html', html, 'text/html;charset=utf-8');
      announce('Downloaded design.html.');
    } catch (err) {
      announce(`Download failed: ${(err as Error).message}`);
    } finally {
      setOpen(false);
    }
  };

  const onCopyReact = async () => {
    try {
      const jsx = toReactComponentString(html);
      await _copy(jsx);
      announce('Copied React component to clipboard.');
    } catch (err) {
      announce(`Copy failed: ${(err as Error).message}`);
    } finally {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="secondary"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        Export ▾
      </Button>
      {open && (
        <div
          role="menu"
          aria-label="Export options"
          className={cn(
            'absolute right-0 top-9 z-20 flex w-56 flex-col rounded-md border border-border bg-panel py-1 shadow-panel',
          )}
        >
          <button
            role="menuitem"
            type="button"
            className="px-3 py-1.5 text-left text-sm hover:bg-border/40"
            onClick={onCopyHtml}
          >
            Copy HTML
          </button>
          <button
            role="menuitem"
            type="button"
            className="px-3 py-1.5 text-left text-sm hover:bg-border/40"
            onClick={onDownload}
          >
            Download .html
          </button>
          <button
            role="menuitem"
            type="button"
            className="px-3 py-1.5 text-left text-sm hover:bg-border/40"
            onClick={onCopyReact}
          >
            Copy as React component
          </button>
        </div>
      )}
    </div>
  );
}
