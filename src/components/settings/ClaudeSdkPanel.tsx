import { useBackendStatus } from '../../hooks/useBackendStatus';

export function ClaudeSdkPanel() {
  const status = useBackendStatus();
  let label = 'Checking…';
  let dot = 'bg-muted';
  if (status === false) {
    label = 'Status check failed';
    dot = 'bg-red-500';
  } else if (status && typeof status === 'object') {
    if (status.sdk.ok) {
      label = `Reachable (SDK ${status.sdk.latencyMs} ms${status.cli.version ? `, CLI ${status.cli.version}` : ''})`;
      dot = 'bg-emerald-500';
    } else {
      label = `Unavailable: ${status.sdk.error ?? 'unknown'}`;
      dot = 'bg-red-500';
    }
  }
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-panel p-4">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-sm text-muted">
        No configuration required — uses your local Claude Code authentication.
      </p>
    </div>
  );
}
