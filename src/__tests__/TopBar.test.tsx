import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { useSettingsStore } from '../store/settingsStore';
import { useDesignStore } from '../store/designStore';
import { useInteractionStore } from '../store/interactionStore';

function renderTopBar() {
  return render(
    <MemoryRouter>
      <TopBar />
    </MemoryRouter>,
  );
}

describe('TopBar', () => {
  beforeEach(() => {
    useSettingsStore.setState({ theme: 'light', backend: { kind: 'claude-agent-sdk' } });
    useDesignStore.setState({
      sessions: {},
      sessionOrder: [],
      activeSessionId: null,
      openTabIds: [],
      isStreaming: false,
      streamError: null,
    });
    useInteractionStore.setState({ mode: 'normal' });
  });

  it('exposes theme toggle, Present, Share, and a new-design action', () => {
    renderTopBar();
    expect(screen.getByLabelText(/switch to dark mode/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /present/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new design/i })).toBeInTheDocument();
  });

  it('disables Present/Share when there is no design content', () => {
    renderTopBar();
    expect(screen.getByRole('button', { name: /present/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /share/i })).toBeDisabled();
  });
});
