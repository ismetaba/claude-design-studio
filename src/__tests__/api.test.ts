import { describe, it, expect, vi } from 'vitest';
import { postGenerate, postTestBackend } from '../lib/api';
import type { SSEEvent } from '../types/domain';

function makeStreamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

describe('postGenerate', () => {
  it('parses SSE chunks across packet boundaries into typed events', async () => {
    const events: SSEEvent[] = [];
    const chunks = [
      'event: session\n',
      'data: {"sdkSessionId":"abc"}\n\n',
      'event: delta\n',
      'data: {"text":"Hel"}\n',
      '\n',
      'event: delta\ndata: {"text":"lo"}\n\nevent: done\ndata: {}\n\n',
    ];
    const fetcher = vi.fn(async () => makeStreamResponse(chunks));
    await postGenerate({
      backend: { kind: 'claude-agent-sdk' },
      messages: [{ role: 'user', content: 'hi' }],
      onEvent: (e) => events.push(e),
      fetcher,
    });
    expect(events[0]).toEqual({ type: 'session', sdkSessionId: 'abc' });
    expect(events.filter((e) => e.type === 'delta')).toHaveLength(2);
    expect(events.find((e) => e.type === 'done')).toBeDefined();
  });

  it('throws when the server responds non-OK', async () => {
    const fetcher = vi.fn(
      async () => new Response('nope', { status: 500 }),
    );
    await expect(
      postGenerate({
        backend: { kind: 'claude-agent-sdk' },
        messages: [],
        onEvent: () => {},
        fetcher,
      }),
    ).rejects.toThrow(/Generate failed/);
  });
});

describe('postTestBackend', () => {
  it('returns the JSON body on success', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, latencyMs: 5 }), { status: 200 }),
    );
    const result = await postTestBackend({ kind: 'claude-agent-sdk' }, { fetcher });
    expect(result.ok).toBe(true);
    expect(result.latencyMs).toBe(5);
  });

  it('returns ok:false on HTTP error', async () => {
    const fetcher = vi.fn(async () => new Response('', { status: 502 }));
    const result = await postTestBackend({ kind: 'claude-agent-sdk' }, { fetcher });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('502');
  });
});
