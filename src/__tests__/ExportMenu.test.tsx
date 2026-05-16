import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportMenu } from '../components/export/ExportMenu';
import { useDesignStore } from '../store/designStore';

function seedSession(html = '<h1>Hi</h1>') {
  useDesignStore.setState({
    sessions: {},
    sessionOrder: [],
    activeSessionId: null,
    isStreaming: false,
    streamError: null,
  });
  const id = useDesignStore.getState().createSession();
  useDesignStore.getState().setCurrentHtml(html);
  return id;
}

describe('ExportMenu', () => {
  beforeEach(() => {
    seedSession();
  });

  it('is disabled when there is no html', async () => {
    useDesignStore.getState().setCurrentHtml('');
    render(<ExportMenu />);
    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();
  });

  it('Copy HTML invokes copyText with the current html', async () => {
    const user = userEvent.setup();
    const copyText = vi.fn(async () => {});
    const downloadFile = vi.fn();
    render(<ExportMenu exporters={{ copyText, downloadFile }} />);
    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByRole('menuitem', { name: /copy html/i }));
    expect(copyText).toHaveBeenCalledWith('<h1>Hi</h1>');
  });

  it('Download .html triggers downloadFile with .html filename', async () => {
    const user = userEvent.setup();
    const copyText = vi.fn(async () => {});
    const downloadFile = vi.fn();
    render(<ExportMenu exporters={{ copyText, downloadFile }} />);
    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByRole('menuitem', { name: /download \.html/i }));
    expect(downloadFile).toHaveBeenCalledWith('design.html', '<h1>Hi</h1>', 'text/html;charset=utf-8');
  });

  it('Copy as React component invokes copyText with JSX', async () => {
    const user = userEvent.setup();
    const copyText = vi.fn<(text: string) => Promise<void>>(async () => {});
    const downloadFile = vi.fn();
    render(<ExportMenu exporters={{ copyText, downloadFile }} />);
    await user.click(screen.getByRole('button', { name: /export/i }));
    await user.click(screen.getByRole('menuitem', { name: /copy as react component/i }));
    const arg = copyText.mock.calls[0]?.[0] ?? '';
    expect(arg).toContain('export default function Generated()');
  });
});
