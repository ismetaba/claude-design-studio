import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../store/settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      theme: 'light',
      backend: { kind: 'claude-agent-sdk' },
    });
  });

  it('defaults to claude-agent-sdk backend and light theme', () => {
    const s = useSettingsStore.getState();
    expect(s.theme).toBe('light');
    expect(s.backend.kind).toBe('claude-agent-sdk');
  });

  it('setBackend swaps to custom-api', () => {
    useSettingsStore.getState().setBackend({
      kind: 'custom-api',
      baseUrl: 'https://api.example.com',
      apiKey: 'k',
      model: 'gpt-test',
      format: 'openai',
    });
    expect(useSettingsStore.getState().backend.kind).toBe('custom-api');
  });

  it('setTheme toggles dark mode', () => {
    useSettingsStore.getState().setTheme('dark');
    expect(useSettingsStore.getState().theme).toBe('dark');
  });
});
