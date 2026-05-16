import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { useDesignStore } from '../store/designStore';
import { useSettingsStore } from '../store/settingsStore';
import type { PostGenerateArgs } from '../lib/api';

// Replace postGenerate so the integration test never touches the network.
vi.mock('../lib/api', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    postGenerate: async (args: PostGenerateArgs) => {
      args.onEvent({ type: 'session', sdkSessionId: 'sdk-int' });
      args.onEvent({ type: 'delta', text: '```html\n<h1>Hi</h1>\n```' });
      args.onEvent({ type: 'done' });
    },
    postTestBackend: async () => ({ ok: true, latencyMs: 1 }),
  };
});

// Import StudioPage after the mock is registered.
const { default: StudioPage } = await import('../routes/StudioPage');

function resetStores() {
  useDesignStore.setState({
    sessions: {},
    sessionOrder: [],
    activeSessionId: null,
    isStreaming: false,
    streamError: null,
  });
  useSettingsStore.setState({ theme: 'light', backend: { kind: 'claude-agent-sdk' } });
}

beforeEach(() => {
  resetStores();
  // Neutralise the /api/status fetch so useBackendStatus doesn't error in jsdom.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ sdk: { ok: false, latencyMs: 0 }, cli: { ok: false } }), {
        status: 200,
      }),
    ),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('StudioPage integration', () => {
  it('prompts → SSE deltas → store → debounced iframe preview', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });

    render(
      <MemoryRouter>
        <StudioPage />
      </MemoryRouter>,
    );

    const textarea = screen.getByLabelText('Describe the UI you want');
    await user.type(textarea, 'a hero with the word Hi');
    await user.keyboard('{Enter}');

    // Let the mocked postGenerate's synchronous events flush through React.
    await act(async () => {
      await Promise.resolve();
    });
    // Advance past the 150 ms preview debounce.
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    const iframe = screen.getByTitle('Live preview') as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).toContain('<h1>Hi</h1>');

    const ds = useDesignStore.getState();
    const sessionIds = Object.keys(ds.sessions);
    expect(sessionIds).toHaveLength(1);
    const session = ds.sessions[sessionIds[0]];
    expect(session.currentHtml).toContain('<h1>Hi</h1>');
    expect(ds.isStreaming).toBe(false);
    expect(session.sdkSessionId).toBe('sdk-int');

    expect(screen.queryByText(/describe a ui to begin/i)).toBeNull();
  });
});
