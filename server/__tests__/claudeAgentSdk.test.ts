import { describe, it, expect, vi } from 'vitest';
import { ClaudeAgentSdkBackend, type QueryFn } from '../adapters/claudeAgentSdk';

function makeQuery(messages: unknown[]): QueryFn {
  return (() => {
    let i = 0;
    return {
      [Symbol.asyncIterator]() {
        return {
          next: async () => {
            if (i < messages.length) {
              return { value: messages[i++], done: false };
            }
            return { value: undefined, done: true };
          },
        };
      },
    };
  }) as unknown as QueryFn;
}

describe('ClaudeAgentSdkBackend', () => {
  it('yields assistant text deltas and surfaces session id', async () => {
    const query = makeQuery([
      { type: 'system', subtype: 'init', session_id: 'sdk-abc' },
      {
        type: 'assistant',
        session_id: 'sdk-abc',
        message: { content: [{ type: 'text', text: 'Hello ' }] },
      },
      {
        type: 'assistant',
        session_id: 'sdk-abc',
        message: { content: [{ type: 'text', text: 'world' }] },
      },
      { type: 'result', is_error: false },
    ]);
    const backend = new ClaudeAgentSdkBackend({ query });
    const ctrl = new AbortController();
    const onSessionId = vi.fn();
    const chunks: string[] = [];
    for await (const t of backend.streamCompletion(
      [{ role: 'user', content: 'a hero section' }],
      { signal: ctrl.signal, onSessionId },
    )) {
      chunks.push(t);
    }
    expect(chunks.join('')).toBe('Hello world');
    expect(onSessionId).toHaveBeenCalledWith('sdk-abc');
  });

  it('forwards resumeSdkSessionId via options.resume', async () => {
    let capturedOptions: unknown;
    const query: QueryFn = (params) => {
      capturedOptions = params.options;
      return makeQuery([{ type: 'result', is_error: false }])(params);
    };
    const backend = new ClaudeAgentSdkBackend({ query });
    const ctrl = new AbortController();
    for await (const _ of backend.streamCompletion(
      [{ role: 'user', content: 'refine the hero' }],
      { signal: ctrl.signal, resumeSdkSessionId: 'sdk-prev' },
    )) {
      // drain
    }
    expect((capturedOptions as { resume?: string }).resume).toBe('sdk-prev');
  });

  it('throws on result.is_error=true', async () => {
    const query = makeQuery([
      { type: 'result', is_error: true, errors: ['rate limit'] },
    ]);
    const backend = new ClaudeAgentSdkBackend({ query });
    const ctrl = new AbortController();
    await expect(async () => {
      for await (const _ of backend.streamCompletion(
        [{ role: 'user', content: 'go' }],
        { signal: ctrl.signal },
      )) {
        /* noop */
      }
    }).rejects.toThrow(/rate limit/);
  });

  it('honors AbortSignal', async () => {
    const query = makeQuery([
      { type: 'system', subtype: 'init', session_id: 'x' },
      { type: 'assistant', session_id: 'x', message: { content: [{ type: 'text', text: 'first' }] } },
      { type: 'assistant', session_id: 'x', message: { content: [{ type: 'text', text: 'second' }] } },
    ]);
    const backend = new ClaudeAgentSdkBackend({ query });
    const ctrl = new AbortController();
    const chunks: string[] = [];
    const iter = backend.streamCompletion([{ role: 'user', content: 'go' }], { signal: ctrl.signal })[Symbol.asyncIterator]();
    const first = await iter.next();
    if (!first.done) chunks.push(first.value);
    ctrl.abort();
    const second = await iter.next();
    expect(second.done).toBe(true);
    expect(chunks).toEqual(['first']);
  });
});
