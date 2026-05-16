import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../index';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  const app = createApp();
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('production server smoke', () => {
  it('POST /api/test-backend returns 200 JSON for claude-agent-sdk', async () => {
    const res = await fetch(`${baseUrl}/api/test-backend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backend: { kind: 'claude-agent-sdk' } }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; latencyMs: number };
    expect(typeof body.ok).toBe('boolean');
    expect(typeof body.latencyMs).toBe('number');
  });

  it('GET /api/status returns 200 JSON with sdk.ok boolean', async () => {
    const res = await fetch(`${baseUrl}/api/status`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { sdk: { ok: boolean } };
    expect(typeof body.sdk?.ok).toBe('boolean');
  }, 10_000);
});
