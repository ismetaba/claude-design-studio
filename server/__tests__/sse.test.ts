import { describe, it, expect } from 'vitest';
import { writeSSEEvent, writeSSEHeaders, endSSE, serializeSSE, type SSEWritable } from '../lib/sse';

function makeRes() {
  const chunks: string[] = [];
  const headers: Record<string, string> = {};
  const res: SSEWritable & { chunks: string[]; status?: number; ended: boolean; headers: Record<string, string> } = {
    chunks,
    headers,
    ended: false,
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    writeHead(status: number, hdrs?: Record<string, string>) {
      (res as { status?: number }).status = status;
      if (hdrs) Object.assign(headers, hdrs);
    },
    write(chunk: string) {
      chunks.push(chunk);
    },
    end() {
      res.ended = true;
    },
  };
  return res;
}

describe('sse helpers', () => {
  it('writeSSEEvent emits event + data + blank line', () => {
    const res = makeRes();
    writeSSEEvent(res, 'delta', { text: 'Hi' });
    const text = res.chunks.join('');
    expect(text).toContain('event: delta\n');
    expect(text).toContain('data: {"text":"Hi"}\n\n');
  });

  it('writeSSEHeaders sets text/event-stream content type', () => {
    const res = makeRes();
    writeSSEHeaders(res);
    expect(res.headers['Content-Type']).toMatch(/text\/event-stream/);
    expect(res.headers['Cache-Control']).toMatch(/no-cache/);
  });

  it('serializeSSE matches the writeSSEEvent format', () => {
    expect(serializeSSE('done', {})).toBe('event: done\ndata: {}\n\n');
  });

  it('endSSE closes the response', () => {
    const res = makeRes();
    endSSE(res);
    expect(res.ended).toBe(true);
  });
});
