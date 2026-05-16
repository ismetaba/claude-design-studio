import { spawn } from 'node:child_process';

export interface ClaudeCliProbeResult {
  ok: boolean;
  version?: string;
  error?: string;
}

let cached: ClaudeCliProbeResult | undefined;

export function probeClaudeCli(timeoutMs = 1500): Promise<ClaudeCliProbeResult> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: ClaudeCliProbeResult) => {
      if (settled) return;
      settled = true;
      cached = result;
      resolve(result);
    };

    let child;
    try {
      child = spawn('claude', ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      finish({ ok: false, error: (err as Error).message });
      return;
    }

    const timer = setTimeout(() => {
      try {
        child?.kill('SIGKILL');
      } catch {
        /* ignore */
      }
      finish({ ok: false, error: 'probe timeout' });
    }, timeoutMs);
    if (typeof (timer as { unref?: () => void }).unref === 'function') {
      (timer as { unref: () => void }).unref();
    }

    const outChunks: Buffer[] = [];
    child.stdout?.on('data', (c: Buffer) => outChunks.push(c));
    child.on('error', (err) => {
      clearTimeout(timer);
      finish({ ok: false, error: err.message });
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        const version = Buffer.concat(outChunks).toString('utf8').trim();
        finish({ ok: true, version });
      } else {
        finish({ ok: false, error: `exit ${code ?? '?'}` });
      }
    });
  });
}

export function getCachedClaudeProbe(): ClaudeCliProbeResult | undefined {
  return cached;
}
