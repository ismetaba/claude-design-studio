import type { AdapterMessage } from '../adapters/types';

/** Keep at most this many of the most recent turns *in addition* to the very first user turn. */
const RECENT_WINDOW = 8;

/** Hard cap on the current-HTML chunk we inject, so we never blow past a context limit. */
const CURRENT_HTML_CAP_CHARS = 60_000;

export interface PrepareMessagesArgs {
  messages: AdapterMessage[];
  currentHtml?: string;
}

export interface PreparedMessages {
  messages: AdapterMessage[];
  /** True if the last user message was rewritten to include the current HTML. */
  injectedCurrentHtml: boolean;
}

/**
 * Apply two strategies to the raw turn history before it hits the model:
 *
 *  1. Sliding-window: keep the very first user turn (the design brief) + the last
 *     RECENT_WINDOW turns. Drop anything in between. This stops cost/latency from
 *     blowing up after many refinements while preserving the original intent.
 *
 *  2. Current-state injection: if the caller knows the canonical HTML on disk
 *     (the source of truth for the preview), prepend it to the LAST user turn
 *     wrapped in markdown fences. Even if the conversation context drifts, the
 *     model always knows what it is editing.
 */
export function prepareMessages({ messages, currentHtml }: PrepareMessagesArgs): PreparedMessages {
  let prepared = applySlidingWindow(messages);
  let injectedCurrentHtml = false;
  if (currentHtml && currentHtml.trim().length > 0) {
    prepared = injectCurrentHtmlInLastUser(prepared, currentHtml);
    injectedCurrentHtml = true;
  }
  return { messages: prepared, injectedCurrentHtml };
}

function applySlidingWindow(messages: AdapterMessage[]): AdapterMessage[] {
  if (messages.length <= RECENT_WINDOW + 1) return messages;
  const firstUserIdx = messages.findIndex((m) => m.role === 'user');
  if (firstUserIdx === -1) return messages.slice(-RECENT_WINDOW);
  const tail = messages.slice(-RECENT_WINDOW);
  // If the first user message already falls inside the tail, no need to prepend it.
  if (firstUserIdx >= messages.length - RECENT_WINDOW) return tail;
  return [messages[firstUserIdx], ...tail];
}

function injectCurrentHtmlInLastUser(
  messages: AdapterMessage[],
  currentHtml: string,
): AdapterMessage[] {
  const idx = lastIndex(messages, (m) => m.role === 'user');
  if (idx === -1) return messages;
  const last = messages[idx];
  const clipped = currentHtml.length > CURRENT_HTML_CAP_CHARS
    ? currentHtml.slice(0, CURRENT_HTML_CAP_CHARS) + '\n<!-- truncated -->'
    : currentHtml;
  const wrapped: AdapterMessage = {
    role: 'user',
    content: [
      'The current design on the canvas is this HTML (treat it as the source of truth — edit it, do not replace it from scratch unless I explicitly ask):',
      '',
      '```html',
      clipped,
      '```',
      '',
      'My request:',
      last.content.trim(),
    ].join('\n'),
  };
  const out = messages.slice();
  out[idx] = wrapped;
  return out;
}

function lastIndex<T>(arr: T[], pred: (t: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i -= 1) if (pred(arr[i])) return i;
  return -1;
}
