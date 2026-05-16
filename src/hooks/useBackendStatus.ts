import { useEffect, useState } from 'react';

export interface BackendStatusResult {
  sdk: { ok: boolean; latencyMs: number; error?: string };
  cli: { ok: boolean; version?: string; error?: string };
}

export interface UseBackendStatusOptions {
  fetcher?: typeof fetch;
  endpoint?: string;
}

/**
 * Polls /api/status once on mount; returns `null` until the first result arrives,
 * `false` if the request failed, and the parsed body on success.
 */
export function useBackendStatus(opts: UseBackendStatusOptions = {}): BackendStatusResult | null | false {
  const [state, setState] = useState<BackendStatusResult | null | false>(null);
  useEffect(() => {
    const fetcher = opts.fetcher ?? fetch;
    let cancelled = false;
    fetcher(opts.endpoint ?? '/api/status')
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setState(false);
          return;
        }
        const body = (await res.json()) as BackendStatusResult;
        if (!cancelled) setState(body);
      })
      .catch(() => {
        if (!cancelled) setState(false);
      });
    return () => {
      cancelled = true;
    };
  }, [opts.fetcher, opts.endpoint]);
  return state;
}
