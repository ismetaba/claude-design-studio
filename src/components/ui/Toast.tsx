import { cn } from '../../lib/cn';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastProps {
  message: string;
  tone?: ToastTone;
  onDismiss?: () => void;
}

const TONE: Record<ToastTone, string> = {
  info: 'border-border bg-panel text-fg',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-fg',
  error: 'border-red-500/40 bg-red-500/10 text-fg',
};

export function Toast({ message, tone = 'info', onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto flex max-w-sm items-start gap-3 rounded-md border px-3 py-2 shadow-panel',
        TONE[tone],
      )}
    >
      <span className="text-sm leading-snug">{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto text-muted hover:text-fg"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
