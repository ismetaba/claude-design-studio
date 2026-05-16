import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionList } from '../components/sidebar/SessionList';
import { useDesignStore } from '../store/designStore';

function reset() {
  useDesignStore.setState({
    sessions: {},
    sessionOrder: [],
    activeSessionId: null,
    openTabIds: [],
    isStreaming: false,
    streamError: null,
  });
}

describe('SessionList', () => {
  beforeEach(reset);

  it('shows empty state when no sessions', () => {
    render(<SessionList />);
    expect(screen.getByText(/no designs yet/i)).toBeInTheDocument();
  });

  it('renders one row per session and marks active row with aria-current', () => {
    const a = useDesignStore.getState().createSession();
    const b = useDesignStore.getState().createSession();
    useDesignStore.getState().selectSession(a);
    render(<SessionList />);
    const list = screen.getByRole('list', { name: /sessions/i });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    const activeItem = items.find((el) => el.getAttribute('aria-current') === 'true');
    expect(activeItem).toBeDefined();
    expect(b).toBeDefined();
  });

  it('clicking a row selects that session', async () => {
    const user = userEvent.setup();
    const a = useDesignStore.getState().createSession();
    const b = useDesignStore.getState().createSession();
    useDesignStore.getState().selectSession(b);
    render(<SessionList />);
    // First row in render order is the most recent (b); second is a.
    const list = screen.getByRole('list', { name: /sessions/i });
    const rows = within(list).getAllByRole('listitem');
    const selectButton = within(rows[1]).getAllByRole('button')[0];
    await user.click(selectButton);
    expect(useDesignStore.getState().activeSessionId).toBe(a);
  });

  it('clicking delete on the active session selects the next one', async () => {
    const user = userEvent.setup();
    const a = useDesignStore.getState().createSession(); // sessionOrder: [a]
    const b = useDesignStore.getState().createSession(); // sessionOrder: [b, a], active=b
    expect(useDesignStore.getState().activeSessionId).toBe(b);
    render(<SessionList confirmDelete={() => true} />);
    const list = screen.getByRole('list', { name: /sessions/i });
    const firstRow = within(list).getAllByRole('listitem')[0];
    const deleteBtn = within(firstRow).getByRole('button', { name: /delete/i });
    await user.click(deleteBtn);
    expect(useDesignStore.getState().activeSessionId).toBe(a);
    expect(useDesignStore.getState().sessions[b]).toBeUndefined();
  });
});
