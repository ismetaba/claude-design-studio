import type { IncomingMessage, ServerResponse } from 'node:http';
import { ClaudeAgentSdkBackend } from '../adapters/claudeAgentSdk';
import { probeClaudeCli, getCachedClaudeProbe } from '../lib/claudeCliProbe';

interface StatusResponse {
  sdk: { ok: boolean; latencyMs: number; error?: string };
  cli: { ok: boolean; version?: string; error?: string };
}

let sdkResult: { ok: boolean; latencyMs: number; error?: string } | undefined;

export function statusHandler() {
  return async function handleStatus(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.end('Method Not Allowed');
      return;
    }
    if (!sdkResult) {
      const backend = new ClaudeAgentSdkBackend();
      sdkResult = await backend.testConnection();
    }
    const cli = getCachedClaudeProbe() ?? (await probeClaudeCli());
    const body: StatusResponse = { sdk: sdkResult, cli };
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify(body));
  };
}

// Kick off the CLI probe once on module load (non-blocking).
void probeClaudeCli().catch(() => {});
