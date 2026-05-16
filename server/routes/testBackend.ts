import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolveBackend } from '../adapters/factory';
import { readJsonBody } from '../lib/readJsonBody';
import type { BackendConfig } from '../../src/types/domain';
import { BackendUnavailableError } from '../adapters/types';

export interface TestBackendHandlerOptions {
  resolve?: typeof resolveBackend;
}

export function testBackendHandler(opts: TestBackendHandlerOptions = {}) {
  const resolve = opts.resolve ?? resolveBackend;
  return async function handleTestBackend(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end('Method Not Allowed');
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    try {
      const parsed = (await readJsonBody(req)) as { backend?: BackendConfig };
      if (!parsed?.backend) {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: 'Missing backend config' }));
        return;
      }
      const backend = resolve(parsed.backend);
      const result = await backend.testConnection();
      res.statusCode = 200;
      res.end(JSON.stringify(result));
    } catch (err) {
      const status = err instanceof BackendUnavailableError ? 200 : 500;
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.statusCode = status;
      res.end(JSON.stringify({ ok: false, latencyMs: 0, error: message }));
    }
  };
}
