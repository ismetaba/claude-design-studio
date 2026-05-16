import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectionTestButton } from '../components/settings/ConnectionTestButton';

describe('ConnectionTestButton', () => {
  it('renders ✓ Connected with latency on success', async () => {
    const user = userEvent.setup();
    const poster = vi.fn(async () => ({ ok: true, latencyMs: 42 }));
    render(
      <ConnectionTestButton
        config={{ kind: 'custom-api', baseUrl: 'https://x', apiKey: 'k', model: 'm', format: 'openai' }}
        poster={poster}
      />,
    );
    await user.click(screen.getByRole('button', { name: /test connection/i }));
    expect(await screen.findByText(/✓ Connected/i)).toBeInTheDocument();
    expect(screen.getByText(/42 ms/i)).toBeInTheDocument();
  });

  it('renders ✗ <error> on failure', async () => {
    const user = userEvent.setup();
    const poster = vi.fn(async () => ({ ok: false, latencyMs: 0, error: 'HTTP 401' }));
    render(
      <ConnectionTestButton
        config={{ kind: 'custom-api', baseUrl: 'https://x', apiKey: 'k', model: 'm', format: 'openai' }}
        poster={poster}
      />,
    );
    await user.click(screen.getByRole('button', { name: /test connection/i }));
    expect(await screen.findByText(/HTTP 401/i)).toBeInTheDocument();
  });
});
