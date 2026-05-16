import { useState } from 'react';
import { Button } from '../ui/Button';
import { postTestBackend } from '../../lib/api';
import type { BackendConfig } from '../../types/domain';

export interface ConnectionTestButtonProps {
  config: BackendConfig;
  disabled?: boolean;
  /** Inject for tests. */
  poster?: typeof postTestBackend;
}

type State =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'ok'; latencyMs: number }
  | { status: 'error'; message: string };

export function ConnectionTestButton({ config, disabled, poster }: ConnectionTestButtonProps) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const fn = poster ?? postTestBackend;

  const run = async () => {
    setState({ status: 'pending' });
    try {
      const r = await fn(config);
      if (r.ok) setState({ status: 'ok', latencyMs: r.latencyMs });
      else setState({ status: 'error', message: r.error ?? 'Unknown error' });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        onClick={() => void run()}
        disabled={disabled || state.status === 'pending'}
      >
        Test connection
      </Button>
      <span aria-live="polite" className="text-sm">
        {state.status === 'pending' && <span className="text-muted">Testing…</span>}
        {state.status === 'ok' && (
          <span className="text-emerald-600">✓ Connected — {state.latencyMs} ms</span>
        )}
        {state.status === 'error' && <span className="text-red-500">✗ {state.message}</span>}
      </span>
    </div>
  );
}
