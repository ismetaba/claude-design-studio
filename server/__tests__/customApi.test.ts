import { describe, it, expect, vi } from 'vitest';
import { CustomApiBackend } from '../adapters/customApi';

function streamResponse(chunks: string[], status = 200, headers: Record<string, string> = {}): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { 'Content-Type': 'text/event-stream', ...headers } });
}

describe('CustomApiBackend (openai)', () => {
  it('parses multi-chunk OpenAI deltas and stops at [DONE]', async () => {
    const fetcher = vi.fn(
      async () =>
        streamResponse([
          'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
          'data: [DONE]\n\n',
        ]),
    );
    const backend = new CustomApiBackend(
      { kind: 'custom-api', baseUrl: 'https://api.example.com', apiKey: 'k', model: 'm', format: 'openai' },
      { fetcher },
    );
    const ctrl = new AbortController();
    const out: string[] = [];
    for await (const t of backend.streamCompletion([{ role: 'user', content: 'hi' }], { signal: ctrl.signal })) {
      out.push(t);
    }
    expect(out.join('')).toBe('Hello');
  });

  it('handles partial event boundary across fetch chunks', async () => {
    const fetcher = vi.fn(
      async () =>
        streamResponse([
          'data: {"choices":[{"delta":{"content":"He"}}]}\n',
          '\ndata: {"choices":[{"delta":{"content":"y"}}]}',
          '\n\ndata: [DONE]\n\n',
        ]),
    );
    const backend = new CustomApiBackend(
      { kind: 'custom-api', baseUrl: 'https://api.example.com', apiKey: 'k', model: 'm', format: 'openai' },
      { fetcher },
    );
    const out: string[] = [];
    for await (const t of backend.streamCompletion([{ role: 'user', content: 'hi' }], { signal: new AbortController().signal })) {
      out.push(t);
    }
    expect(out.join('')).toBe('Hey');
  });

  it('testConnection returns ok:true on 200', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 200 }));
    const backend = new CustomApiBackend(
      { kind: 'custom-api', baseUrl: 'https://x', apiKey: 'k', model: 'm', format: 'openai' },
      { fetcher },
    );
    const r = await backend.testConnection();
    expect(r.ok).toBe(true);
  });

  it('testConnection returns ok:false on 401', async () => {
    const fetcher = vi.fn(async () => new Response('Unauthorized', { status: 401 }));
    const backend = new CustomApiBackend(
      { kind: 'custom-api', baseUrl: 'https://x', apiKey: 'bad', model: 'm', format: 'openai' },
      { fetcher },
    );
    const r = await backend.testConnection();
    expect(r.ok).toBe(false);
    expect(r.error).toContain('401');
  });

  it('testConnection returns ok:false on network failure', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('ENOTFOUND');
    });
    const backend = new CustomApiBackend(
      { kind: 'custom-api', baseUrl: 'https://x', apiKey: 'k', model: 'm', format: 'openai' },
      { fetcher },
    );
    const r = await backend.testConnection();
    expect(r.ok).toBe(false);
    expect(r.error).toContain('ENOTFOUND');
  });
});

describe('CustomApiBackend (anthropic)', () => {
  it('parses content_block_delta events and yields delta.text', async () => {
    const fetcher = vi.fn(
      async () =>
        streamResponse([
          'event: message_start\ndata: {}\n\n',
          'event: content_block_delta\ndata: {"delta":{"text":"Hel"}}\n\n',
          'event: content_block_delta\ndata: {"delta":{"text":"lo"}}\n\n',
          'event: message_stop\ndata: {}\n\n',
        ]),
    );
    const backend = new CustomApiBackend(
      { kind: 'custom-api', baseUrl: 'https://api.anthropic.com', apiKey: 'k', model: 'claude', format: 'anthropic' },
      { fetcher },
    );
    const out: string[] = [];
    for await (const t of backend.streamCompletion([{ role: 'user', content: 'hi' }], { signal: new AbortController().signal })) {
      out.push(t);
    }
    expect(out.join('')).toBe('Hello');
  });

  it('sends anthropic auth headers and not bearer auth', async () => {
    let captured: Record<string, unknown> | undefined;
    const fetcher = vi.fn(async (_url: unknown, init?: { headers?: Record<string, string> }) => {
      captured = init?.headers as Record<string, unknown> | undefined;
      return streamResponse([]);
    });
    const backend = new CustomApiBackend(
      { kind: 'custom-api', baseUrl: 'https://api.anthropic.com', apiKey: 'secret', model: 'claude', format: 'anthropic' },
      { fetcher: fetcher as unknown as typeof fetch },
    );
    for await (const _ of backend.streamCompletion([{ role: 'user', content: 'hi' }], { signal: new AbortController().signal })) {
      /* drain */
    }
    expect(captured?.['x-api-key']).toBe('secret');
    expect(captured?.['anthropic-version']).toBe('2023-06-01');
    expect(captured?.['Authorization']).toBeUndefined();
  });
});
