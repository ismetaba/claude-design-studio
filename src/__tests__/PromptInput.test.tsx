import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render as _render, screen, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { type ReactElement } from 'react';
import { PromptInput } from '../components/prompt/PromptInput';
import { useDesignStore } from '../store/designStore';

function render(ui: ReactElement): RenderResult {
  return _render(<MemoryRouter>{ui}</MemoryRouter>);
}

function resetStore() {
  useDesignStore.setState({
    sessions: {},
    sessionOrder: [],
    activeSessionId: null,
    openTabIds: [],
    isStreaming: false,
    streamError: null,
  });
}

describe('PromptInput', () => {
  beforeEach(() => {
    resetStore();
  });

  it('submits on Enter, calls onSubmit, dispatches appendUserTurn', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PromptInput onSubmit={onSubmit} />);
    const textarea = screen.getByLabelText(/describe the ui you want/i);
    await user.type(textarea, 'a hero section for a coffee shop');
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('a hero section for a coffee shop');
    const state = useDesignStore.getState();
    const sid = state.activeSessionId!;
    expect(sid).toBeTruthy();
    expect(state.sessions[sid].turns[0].content).toBe('a hero section for a coffee shop');
  });

  it('Shift+Enter inserts a newline and does not submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PromptInput onSubmit={onSubmit} />);
    const textarea = screen.getByLabelText(/describe the ui you want/i) as HTMLTextAreaElement;
    await user.type(textarea, 'line one');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(textarea, 'line two');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea.value).toBe('line one\nline two');
  });

  it('while isStreaming the textarea stays enabled and the Send button is replaced by Stop', async () => {
    useDesignStore.getState().setStreaming(true);
    const onStop = vi.fn();
    const user = userEvent.setup();
    render(<PromptInput onStop={onStop} />);
    const textarea = screen.getByLabelText(/describe the ui you want/i) as HTMLTextAreaElement;
    // Textarea stays enabled so the user can compose the next turn.
    expect(textarea).not.toBeDisabled();
    expect(screen.queryByRole('button', { name: /^send prompt$/i })).toBeNull();
    const stop = screen.getByRole('button', { name: /stop generating/i });
    await user.click(stop);
    expect(onStop).toHaveBeenCalled();
  });

  it('shows an aria-live status hint while streaming', () => {
    useDesignStore.getState().setStreaming(true);
    render(<PromptInput />);
    const status = screen.getByText(/generating/i);
    expect(status).toBeInTheDocument();
    const live = status.closest('[aria-live]');
    expect(live).not.toBeNull();
    expect(live?.getAttribute('aria-live')).toBe('polite');
  });

  it('ignores whitespace-only submissions', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PromptInput onSubmit={onSubmit} />);
    const textarea = screen.getByLabelText(/describe the ui you want/i);
    await user.type(textarea, '   ');
    await user.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clicking the Send button also submits', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PromptInput onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/describe the ui you want/i), 'hello');
    await user.click(screen.getByRole('button', { name: /send prompt/i }));
    expect(onSubmit).toHaveBeenCalledWith('hello');
  });

  it('first submission auto-creates a session and titles it to first 40 chars', async () => {
    const user = userEvent.setup();
    render(<PromptInput />);
    const longText =
      'A landing page for a coffee shop with hero gallery and CTAs to subscribe';
    await user.type(screen.getByLabelText(/describe the ui you want/i), longText);
    await user.keyboard('{Enter}');
    const sid = useDesignStore.getState().activeSessionId!;
    expect(sid).toBeTruthy();
    expect(useDesignStore.getState().sessions[sid].title).toBe(longText.slice(0, 40));
  });
});
