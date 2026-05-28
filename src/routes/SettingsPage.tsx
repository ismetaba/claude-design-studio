import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';
import { useDesignStore } from '../store/designStore';
import { useThemeEffect } from '../hooks/useThemeEffect';
import { Button } from '../components/ui/Button';
import { BackendPicker } from '../components/settings/BackendPicker';
import { ClaudeSdkPanel } from '../components/settings/ClaudeSdkPanel';
import { CustomApiPanel } from '../components/settings/CustomApiPanel';
import { LocalLlmPanel } from '../components/settings/LocalLlmPanel';
import { ConnectionTestButton } from '../components/settings/ConnectionTestButton';
import { validateBackendConfig } from '../lib/validate';
import { ToastHost } from '../components/ui/ToastHost';
import { Icon } from '../components/ui/Icon';
import type { BackendConfig, BackendKind, CustomApiConfig, LocalLlmConfig } from '../types/domain';

const DEFAULTS: Record<BackendKind, BackendConfig> = {
  'claude-agent-sdk': { kind: 'claude-agent-sdk' },
  'custom-api': { kind: 'custom-api', baseUrl: '', apiKey: '', model: '', format: 'openai' },
  'local-llm': { kind: 'local-llm', baseUrl: 'http://localhost:11434', model: '' },
};

function isCustomApi(c: BackendConfig): c is CustomApiConfig {
  return c.kind === 'custom-api';
}
function isLocalLlm(c: BackendConfig): c is LocalLlmConfig {
  return c.kind === 'local-llm';
}

export default function SettingsPage() {
  useThemeEffect();
  const saved = useSettingsStore((s) => s.backend);
  const setBackend = useSettingsStore((s) => s.setBackend);
  const setStreamError = useDesignStore((s) => s.setStreamError);

  const [draft, setDraft] = useState<BackendConfig>(saved);
  const validation = useMemo(() => validateBackendConfig(draft), [draft]);

  const onChangeKind = (kind: BackendKind) => {
    if (kind === draft.kind) return;
    // If switching to the same kind as previously saved, restore saved config; else use default.
    if (kind === saved.kind) setDraft(saved);
    else setDraft(DEFAULTS[kind]);
  };

  const onSave = () => {
    if (!validation.ok) return;
    setBackend(draft);
    setStreamError('Settings saved.');
  };

  return (
    <div className="relative flex h-full flex-col bg-bg">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-accent-soft/60 via-accent-soft/15 to-transparent"
      />
      <header className="relative flex h-[88px] shrink-0 items-start justify-between px-6 pt-5">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-bg-elev shadow-soft">
            <Icon name="palette" size={22} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="flex items-center gap-1.5">
              <span className="font-serif text-[22px] font-medium tracking-tight text-fg-strong">
                Claude Design
              </span>
              <span className="rounded-md bg-border/60 px-1.5 py-0.5 text-[10px] font-medium text-fg/65">
                Research Preview
              </span>
            </span>
            <span className="text-[11px] text-muted">by Anthropic Labs</span>
          </span>
        </Link>
        <Link
          to="/"
          aria-label="Back to designs"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-hover hover:text-fg"
        >
          <Icon name="chevron-left" size={12} />
          <span>All designs</span>
        </Link>
      </header>

      <main className="relative mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 pb-10">
        <h1 className="font-serif text-[28px] font-medium tracking-tight text-fg-strong">
          Settings
        </h1>

        <section className="grid gap-3 rounded-2xl bg-panel/60 p-5 shadow-soft">
          <h2 className="text-[14px] font-semibold text-fg-strong">Backend</h2>
          <p className="text-[12px] text-muted">
            Where Claude Design Studio sends your prompts. The default uses your local Claude Max
            plan via the Claude Code CLI — no API key needed.
          </p>
          <BackendPicker value={draft.kind} onChange={onChangeKind} />
        </section>

        <section className="grid gap-3 rounded-2xl bg-panel/60 p-5 shadow-soft">
          {draft.kind === 'claude-agent-sdk' && <ClaudeSdkPanel />}
          {isCustomApi(draft) && (
            <CustomApiPanel value={draft} onChange={(next) => setDraft(next)} />
          )}
          {isLocalLlm(draft) && (
            <LocalLlmPanel value={draft} onChange={(next) => setDraft(next)} />
          )}
        </section>

        <section className="flex items-center justify-between gap-3">
          <ConnectionTestButton config={draft} disabled={!validation.ok} />
          <Button
            variant="primary"
            onClick={onSave}
            disabled={!validation.ok}
            aria-label="Save settings"
          >
            Save settings
          </Button>
        </section>
      </main>
      <ToastHost />
    </div>
  );
}
