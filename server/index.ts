import express, { type Express } from 'express';
import path from 'node:path';
import { generateHandler } from './routes/generate';
import { testBackendHandler } from './routes/testBackend';
import { statusHandler } from './routes/status';

export interface CreateAppOptions {
  /** When set, serve static files from this directory and fall back to its index.html. */
  staticDir?: string;
}

/**
 * Build an Express app with the API routes mounted.
 * Exported so tests can drive the app without binding a port.
 */
export function createApp(opts: CreateAppOptions = {}): Express {
  const app = express();
  const generate = generateHandler();
  const testBackend = testBackendHandler();
  const status = statusHandler();

  app.post('/api/generate', (req, res) => {
    void generate(req, res);
  });
  app.post('/api/test-backend', (req, res) => {
    void testBackend(req, res);
  });
  app.get('/api/status', (req, res) => {
    void status(req, res);
  });

  if (opts.staticDir) {
    app.use(express.static(opts.staticDir));
    app.get('*', (_req, res) => res.sendFile(path.join(opts.staticDir!, 'index.html')));
  }
  return app;
}

const isMain = (() => {
  try {
    const entry = process.argv[1];
    if (!entry) return false;
    return entry.endsWith('server/index.ts') || entry.endsWith('server/index.js');
  } catch {
    return false;
  }
})();

if (isMain) {
  const dist = path.resolve(process.cwd(), 'dist');
  const app = createApp({ staticDir: dist });
  const port = Number(process.env.PORT ?? 5173);
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[cds] listening on http://localhost:${port}`);
  });
}
