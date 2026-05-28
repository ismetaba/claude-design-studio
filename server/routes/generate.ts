import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolveBackend } from '../adapters/factory';
import { writeSSEHeaders, writeSSEEvent, endSSE } from '../lib/sse';
import { readJsonBody } from '../lib/readJsonBody';
import { validateBackendConfig } from '../../src/lib/validate';
import type { GenerateRequestBody, BackendConfig } from '../../src/types/domain';

const VALID_KINDS: Array<BackendConfig['kind']> = ['claude-agent-sdk', 'custom-api', 'local-llm'];

function badRequest(res: ServerResponse, error: string): void {
  res.statusCode = 400;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error }));
}

export interface GenerateHandlerOptions {
  /** Inject a backend resolver for testing. */
  resolve?: typeof resolveBackend;
}

export function generateHandler(opts: GenerateHandlerOptions = {}) {
  const resolve = opts.resolve ?? resolveBackend;
  return async function handleGenerate(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end('Method Not Allowed');
      return;
    }
    let body: GenerateRequestBody;
    try {
      const parsed = (await readJsonBody(req)) as Partial<GenerateRequestBody>;
      if (!parsed?.backend || !VALID_KINDS.includes(parsed.backend.kind)) {
        badRequest(res, 'Invalid backend config');
        return;
      }
      if (!Array.isArray(parsed.messages)) {
        badRequest(res, 'messages must be an array');
        return;
      }
      // Re-validate the backend fields on the server: the client validates too,
      // but a direct caller can bypass that, and we are about to issue an
      // outbound fetch to a caller-supplied URL. Rejecting malformed configs
      // here keeps non-http(s) targets and empty endpoints out of the adapters.
      const validation = validateBackendConfig(parsed.backend);
      if (!validation.ok) {
        const detail = Object.values(validation.errors).filter(Boolean).join(' ');
        badRequest(res, `Invalid backend config${detail ? `: ${detail}` : ''}`);
        return;
      }
      body = parsed as GenerateRequestBody;
    } catch (err) {
      badRequest(res, `Bad JSON: ${(err as Error).message}`);
      return;
    }

    writeSSEHeaders(res);

    const controller = new AbortController();
    req.on('close', () => controller.abort());

    try {
      const backend = resolve(body.backend);
      const stream = backend.streamCompletion(body.messages, {
        signal: controller.signal,
        onSessionId: (id: string) => writeSSEEvent(res, 'session', { sdkSessionId: id }),
        resumeSdkSessionId: body.resumeSdkSessionId,
        projectTitle: body.projectTitle,
        projectNotes: body.projectNotes,
        currentHtml: body.currentHtml,
      });
      for await (const chunk of stream) {
        if (controller.signal.aborted) break;
        writeSSEEvent(res, 'delta', { text: chunk });
      }
      writeSSEEvent(res, 'done', {});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      writeSSEEvent(res, 'error', { message });
    } finally {
      endSSE(res);
    }
  };
}
