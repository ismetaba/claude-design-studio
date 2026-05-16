import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from '../routes/SettingsPage';
import { useSettingsStore } from '../store/settingsStore';

beforeEach(() => {
  useSettingsStore.setState({ theme: 'light', backend: { kind: 'claude-agent-sdk' } });
  // Stub /api/status fetch.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ sdk: { ok: true, latencyMs: 1 }, cli: { ok: true } }), {
        status: 200,
      }),
    ),
  );
});

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  it('switches to Custom API panel and saves a valid config', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByLabelText(/custom api/i));
    await user.type(screen.getByPlaceholderText(/https:\/\/api\.openai\.com/i), 'https://api.example.com');
    await user.type(screen.getByLabelText(/api key/i), 'sk-xxx');
    await user.type(screen.getByPlaceholderText('gpt-4o-mini'), 'gpt-4o-mini');
    const save = screen.getByRole('button', { name: /save settings/i });
    expect(save).not.toBeDisabled();
    await user.click(save);
    const backend = useSettingsStore.getState().backend;
    expect(backend.kind).toBe('custom-api');
    if (backend.kind === 'custom-api') {
      expect(backend.baseUrl).toBe('https://api.example.com');
      expect(backend.model).toBe('gpt-4o-mini');
    }
  });

  it('disables Save when Custom API URL is missing', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByLabelText(/custom api/i));
    expect(screen.getByRole('button', { name: /save settings/i })).toBeDisabled();
  });

  it('shows Local LLM defaults when selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByLabelText(/local llm/i));
    const url = screen.getByPlaceholderText(/http:\/\/localhost:11434/) as HTMLInputElement;
    expect(url.value).toBe('http://localhost:11434');
  });
});
