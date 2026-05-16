import type { Plugin, Connect } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { generateHandler } from './routes/generate';
import { testBackendHandler } from './routes/testBackend';
import { statusHandler } from './routes/status';

export function apiMiddlewarePlugin(): Plugin {
  const generate = generateHandler();
  const testBackend = testBackendHandler();
  const status = statusHandler();
  return {
    name: 'cds-api-middleware',
    configureServer(server) {
      const mw: Connect.NextHandleFunction = (req, res, next) => {
        const url = req.url ?? '';
        if (url.startsWith('/api/generate')) {
          generate(req as IncomingMessage, res as ServerResponse).catch(next);
          return;
        }
        if (url.startsWith('/api/test-backend')) {
          testBackend(req as IncomingMessage, res as ServerResponse).catch(next);
          return;
        }
        if (url.startsWith('/api/status')) {
          status(req as IncomingMessage, res as ServerResponse).catch(next);
          return;
        }
        next();
      };
      server.middlewares.use(mw);
    },
  };
}
