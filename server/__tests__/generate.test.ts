import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import { generateHandler } from '../routes/generate';
import { StubBackend } from '../adapters/stub';
import type { AdapterMessage, LLMBackend, StreamOptions } from '../adapters/types';

interface MockRes extends EventEmitter {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  ended: boolean;
  setHeader(name: string, value: string): void;
  writeHead(status: number, hdrs?: Record<string, string>): void;
  write(chunk: string): void;
  end(s?: string): void;
  flushHeaders(): void;
}

class MockResImpl extends EventEmitter implements MockRes {
  statusCode = 200;
  headers: Record<string, string> = {};
  body = '';
  ended = false;
  setHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  writeHead(status: number, hdrs?: Record<string, string>) {
    this.statusCode = status;
    if (hdrs) Object.assign(this.headers, hdrs);
  }
  write(chunk: string) {
    this.body += chunk;
  }
  end(s?: string) {
    if (s) this.body += s;
    this.ended = true;
  }
  flushHeaders() {}
}

function makeRes(): MockRes {
  return new MockResImpl();
}

function makeReq(payload: unknown, method = 'POST') {
  const emitter = new EventEmitter() as EventEmitter & {
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  emitter.method = method;
  emitter.url = '/api/generate';
  emitter.headers = {};
  // Emit data asynchronously so handler has time to attach listeners.
  queueMicrotask(() => {
    emitter.emit('data', Buffer.from(JSON.stringify(payload)));
    emitter.emit('end');
  });
  return emitter as unknown as import('node:http').IncomingMessage;
}

describe('generate route', () => {
  it('rejects non-POST methods', async () => {
    const handler = generateHandler();
    const req = makeReq({}, 'GET');
    const res = makeRes();
    await handler(req, res as unknown as import('node:http').ServerResponse);
    expect(res.statusCode).toBe(405);
  });

  it('returns 400 when backend is missing', async () => {
    const handler = generateHandler();
    const req = makeReq({ messages: [] });
    const res = makeRes();
    await handler(req, res as unknown as import('node:http').ServerResponse);
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('Invalid backend');
  });

  it('streams SSE delta + done events', async () => {
    const handler = generateHandler({ resolve: () => new StubBackend() });
    const req = makeReq({
      backend: { kind: 'claude-agent-sdk' },
      messages: [{ role: 'user', content: 'hi' }],
    });
    const res = makeRes();
    await handler(req, res as unknown as import('node:http').ServerResponse);
    expect(res.headers['Content-Type']).toMatch(/text\/event-stream/);
    expect(res.body).toContain('event: delta');
    expect(res.body).toContain('event: done');
    expect(res.body).toContain('event: session');
    expect(res.ended).toBe(true);
  });

  it("aborts the adapter when the request emits 'close' mid-stream", async () => {
    let yielded = 0;
    let abortedAfter = -1;
    const adapter: LLMBackend = {
      kind: 'claude-agent-sdk',
      async *streamCompletion(_messages: AdapterMessage[], opts: StreamOptions): AsyncIterable<string> {
        opts.onSessionId?.('sdk-abort');
        for (let i = 0; i < 100; i++) {
          if (opts.signal.aborted) {
            abortedAfter = yielded;
            return;
          }
          yielded += 1;
          yield `chunk-${i}\n`;
          // Yield to the event loop so external aborts can land between iterations.
          await new Promise<void>((r) => setTimeout(r, 0));
        }
      },
      async testConnection() {
        return { ok: true, latencyMs: 0 };
      },
    };
    const handler = generateHandler({ resolve: () => adapter });
    const req = makeReq({
      backend: { kind: 'claude-agent-sdk' },
      messages: [{ role: 'user', content: 'go' }],
    });
    const res = makeRes();
    const handlerPromise = handler(req, res as unknown as import('node:http').ServerResponse);
    // After a couple of ticks emit 'close' to simulate the client cancelling.
    setTimeout(() => (req as unknown as EventEmitter).emit('close'), 10);
    await handlerPromise;
    expect(abortedAfter).toBeGreaterThanOrEqual(0);
    expect(yielded).toBeLessThan(100);
    expect(res.ended).toBe(true);
  });
});
