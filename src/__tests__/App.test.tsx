import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(document.body.textContent).not.toEqual('');
  });

  it('renders the GalleryPage at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    // Gallery page shows the Claude Design wordmark logo link.
    expect(screen.getByRole('link', { name: /claude design/i })).toBeInTheDocument();
    // And the "Recent" gallery tab is rendered.
    expect(screen.getByRole('button', { name: /^recent$/i })).toBeInTheDocument();
  });

  it('renders the SettingsPage at /settings', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
  });
});
