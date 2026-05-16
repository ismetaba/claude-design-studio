import type { ServerResponse } from 'node:http';

export interface SSEWritable {
  setHeader?(name: string, value: string): void;
  writeHead?(statusCode: number, headers?: Record<string, string>): void;
  write(chunk: string): boolean | void;
  end(): void;
  flushHeaders?(): void;
}

export function writeSSEHeaders(res: SSEWritable): void {
  if (res.writeHead) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
  } else if (res.setHeader) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
  }
  res.flushHeaders?.();
}

export function writeSSEEvent(res: SSEWritable, type: string, data: unknown): void {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  res.write(`event: ${type}\n`);
  res.write(`data: ${payload}\n\n`);
}

export function endSSE(res: SSEWritable): void {
  res.end();
}

/** Convenience: serialize an SSE chunk to a string for tests / inspection. */
export function serializeSSE(type: string, data: unknown): string {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  return `event: ${type}\ndata: ${payload}\n\n`;
}

export type _ServerResponse = ServerResponse;
