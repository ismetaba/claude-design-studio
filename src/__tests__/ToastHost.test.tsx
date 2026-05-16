import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastHost } from '../components/ui/ToastHost';
import { useDesignStore } from '../store/designStore';

describe('ToastHost', () => {
  beforeEach(() => {
    useDesignStore.setState({
      sessions: {},
      sessionOrder: [],
      activeSessionId: null,
      isStreaming: false,
      streamError: null,
    });
  });

  it('renders nothing when there is no streamError', () => {
    const { container } = render(<ToastHost />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the error and dismisses on click', async () => {
    const user = userEvent.setup();
    useDesignStore.getState().setStreamError('Network failure');
    render(<ToastHost />);
    expect(screen.getByText('Network failure')).toBeInTheDocument();
    await user.click(screen.getByLabelText(/dismiss notification/i));
    expect(useDesignStore.getState().streamError).toBeNull();
  });
});
