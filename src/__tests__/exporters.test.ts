import { describe, it, expect, vi } from 'vitest';
import { copyText, downloadFile, toReactComponentString } from '../lib/exporters';

describe('exporters', () => {
  it('copyText writes via the clipboard adapter', async () => {
    const writeText = vi.fn(async () => {});
    await copyText('hello', { clipboard: { writeText } });
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('copyText throws when no clipboard is available', async () => {
    await expect(copyText('x', { clipboard: undefined })).rejects.toThrow(/Clipboard API/);
  });

  it('downloadFile creates a Blob and clicks an anchor', () => {
    const created: string[] = [];
    const revoked: string[] = [];
    const fakeUrl = {
      createObjectURL: vi.fn(() => {
        const url = 'blob://test';
        created.push(url);
        return url;
      }),
      revokeObjectURL: vi.fn((u: string) => {
        revoked.push(u);
      }),
    } as unknown as typeof URL;
    const anchor = {
      href: '',
      download: '',
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;
    const fakeDoc = {
      createElement: vi.fn(() => anchor),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    } as unknown as Document;
    downloadFile('design.html', '<p>hi</p>', 'text/html', { document: fakeDoc, url: fakeUrl });
    expect(anchor.click).toHaveBeenCalled();
    expect(anchor.download).toBe('design.html');
    expect(anchor.href).toBe('blob://test');
    expect(created).toHaveLength(1);
    expect(revoked).toEqual(created);
  });

  it('toReactComponentString returns a JSX component', () => {
    const out = toReactComponentString('<div class="x">y</div>', 'Hero');
    expect(out).toContain('export default function Hero()');
    expect(out).toContain('<div className="x">y</div>');
  });
});
