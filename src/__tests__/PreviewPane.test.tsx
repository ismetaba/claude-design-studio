import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreviewPane } from '../components/preview/PreviewPane';
import { useDesignStore } from '../store/designStore';
import { useInteractionStore } from '../store/interactionStore';

function resetStore() {
  useDesignStore.setState({
    sessions: {},
    sessionOrder: [],
    activeSessionId: null,
    openTabIds: [],
    isStreaming: false,
    streamError: null,
  });
  useInteractionStore.setState({ mode: 'normal', activeFileId: 'pages/index' });
}

function withActiveSession(html: string): string {
  const id = useDesignStore.getState().createSession();
  useDesignStore.getState().setCurrentHtml(html);
  return id;
}

describe('PreviewPane', () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the empty state when there is no html', () => {
    render(<PreviewPane />);
    expect(screen.getByText(/describe a ui to begin/i)).toBeInTheDocument();
  });

  it('renders a sandboxed iframe with srcdoc once html is present (after debounce)', () => {
    vi.useFakeTimers();
    render(<PreviewPane debounceMs={150} />);
    expect(screen.getByText(/describe a ui to begin/i)).toBeInTheDocument();

    act(() => {
      withActiveSession('<div>hi</div>');
    });
    act(() => {
      vi.advanceTimersByTime(160);
    });

    const iframe = screen.getByTitle('Live preview') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    expect(iframe.getAttribute('sandbox')).not.toMatch(/allow-same-origin/);
    expect(iframe.getAttribute('srcdoc')).toContain('<div>hi</div>');
  });

  it('DeviceToggle switches the wrapper max-width', async () => {
    const user = userEvent.setup();
    withActiveSession('<p>x</p>');
    const { container } = render(<PreviewPane debounceMs={0} />);
    await new Promise((r) => setTimeout(r, 5));
    await user.click(screen.getByLabelText(/preview at mobile size/i));
    const wrapper = container.querySelector('[style*="max-width"]') as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('style')).toContain('375px');
  });
});
