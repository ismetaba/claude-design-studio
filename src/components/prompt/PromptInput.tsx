import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import { useDesignStore } from '../../store/designStore';
import { usePromptDraft } from '../../hooks/usePromptDraft';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/cn';

export interface PromptInputProps {
  onSubmit?: (text: string) => void;
  onStop?: () => void;
  disabled?: boolean;
}

const MAX_HEIGHT_PX = 152;

export function PromptInput({ onSubmit, onStop, disabled }: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isStreaming = useDesignStore((s) => s.isStreaming);
  const activeSessionId = useDesignStore((s) => s.activeSessionId);
  const appendUserTurn = useDesignStore((s) => s.appendUserTurn);

  // Draft survives reload + project switches (per-project key).
  const { value, setValue, clear: clearDraft } = usePromptDraft(activeSessionId);

  const textareaDisabled = disabled === true;

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || textareaDisabled || isStreaming) return;
    appendUserTurn(trimmed);
    onSubmit?.(trimmed);
    clearDraft();
  }, [appendUserTurn, clearDraft, isStreaming, onSubmit, textareaDisabled, value]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      if (isStreaming) return;
      submit();
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  const canSubmit = value.trim().length > 0 && !textareaDisabled && !isStreaming;

  return (
    <form
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="rounded-2xl bg-panel shadow-float transition-shadow duration-200 focus-within:shadow-lift">
        <textarea
          ref={textareaRef}
          aria-label="Describe the UI you want"
          placeholder="Describe what you want to create…"
          rows={1}
          value={value}
          disabled={textareaDisabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          className={cn(
            'block w-full resize-none border-0 bg-transparent px-3 pt-3 pb-1 text-[13px] leading-[1.45] text-fg-strong',
            'placeholder:text-muted',
            'focus:outline-none focus:ring-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          style={{ maxHeight: `${MAX_HEIGHT_PX}px` }}
        />
        <div className="flex items-center justify-between px-2 pb-1.5 pt-0.5">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Attach"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg"
            >
              <Icon name="plus" size={14} />
            </button>
            <button
              type="button"
              aria-label="Voice (coming soon)"
              disabled
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg disabled:opacity-40"
            >
              <Icon name="mic" size={14} />
            </button>
          </div>
          {isStreaming ? (
            <button
              type="button"
              aria-label="Stop generating"
              onClick={() => onStop?.()}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-fg-strong text-bg transition-transform hover:opacity-90 active:scale-95"
            >
              <Icon name="stop" size={11} />
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Send prompt"
              disabled={!canSubmit}
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full text-white shadow-soft transition-all duration-150 active:scale-95',
                canSubmit
                  ? 'bg-accent hover:bg-accent-hover'
                  : 'cursor-not-allowed bg-accent/40 shadow-none',
              )}
            >
              <Icon name="send" size={13} />
            </button>
          )}
        </div>
      </div>
      {isStreaming ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-muted"
        >
          <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-accent" aria-hidden="true" />
          <span>Generating… Stop to interrupt.</span>
        </div>
      ) : null}
    </form>
  );
}
