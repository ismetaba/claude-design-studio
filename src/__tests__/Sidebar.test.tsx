import { describe, it, expect, beforeEach } from 'vitest';
import { render as _render, screen, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { type ReactElement } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { storage } from '../store/persist';

function render(ui: ReactElement): RenderResult {
  return _render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Sidebar', () => {
  beforeEach(() => {
    storage.removeItem('cds:sidebar');
  });

  it('starts expanded and exposes "All designs" navigation back to the gallery', () => {
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /all designs/i })).toBeInTheDocument();
  });

  it('shows the conversation empty-state when no design is selected', () => {
    render(<Sidebar />);
    expect(screen.getByText(/pick a design or start a new one/i)).toBeInTheDocument();
  });

  it('toggles collapsed state and persists it', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Sidebar />);
    const toggle = screen.getByRole('button', { name: /collapse sidebar/i });
    await user.click(toggle);
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
    unmount();
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
  });
});
