import type { AdapterMessage, LLMBackend, StreamOptions, ConnectionTestResult } from './types';

/**
 * Stub adapter used until real backends are wired in T08/T09.
 * Emits a minimal HTML fenced response to exercise the full pipe.
 */
export class StubBackend implements LLMBackend {
  readonly kind = 'claude-agent-sdk' as const;

  async *streamCompletion(_messages: AdapterMessage[], opts: StreamOptions): AsyncIterable<string> {
    opts.onSessionId?.('stub-session-id');
    const tokens = ['```html\n', '<!DOCTYPE html>\n', '<html><body>', '<h1>Hello world</h1>', '</body></html>', '\n```'];
    for (const t of tokens) {
      if (opts.signal.aborted) return;
      yield t;
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    return { ok: true, latencyMs: 1 };
  }
}
