import { describe, it, expect } from 'vitest';
import { htmlToJsx, htmlToReact } from '../lib/htmlToReact';

describe('htmlToJsx', () => {
  it('renames class to className', () => {
    expect(htmlToJsx('<div class="card">x</div>')).toBe('<div className="card">x</div>');
  });

  it('renames for to htmlFor', () => {
    expect(htmlToJsx('<label for="email">Email</label>')).toBe(
      '<label htmlFor="email">Email</label>',
    );
  });

  it('self-closes void tags', () => {
    expect(htmlToJsx('<img src="x.png">')).toBe('<img src="x.png" />');
    expect(htmlToJsx('<br>')).toBe('<br />');
    expect(htmlToJsx('<input type="text">')).toBe('<input type="text" />');
  });

  it('preserves attributes that need no rename', () => {
    expect(htmlToJsx('<a href="/x" target="_blank">go</a>')).toBe(
      '<a href="/x" target="_blank">go</a>',
    );
  });

  it('renames camelCase attributes like tabindex and readonly', () => {
    expect(htmlToJsx('<input tabindex="0" readonly>')).toBe(
      '<input tabIndex="0" readOnly />',
    );
  });

  it('handles nested elements and text', () => {
    const src = '<section class="hero"><h1>Hello</h1><p class="lead">world</p></section>';
    expect(htmlToJsx(src)).toBe(
      '<section className="hero"><h1>Hello</h1><p className="lead">world</p></section>',
    );
  });
});

describe('htmlToReact', () => {
  it('wraps output in an exported function component', () => {
    const out = htmlToReact('<div class="c">x</div>');
    expect(out).toContain('export default function Generated()');
    expect(out).toContain('<div className="c">x</div>');
    expect(out).toContain('<>');
    expect(out).toContain('</>');
  });

  it('produces JSX free of class=" attribute', () => {
    const out = htmlToReact('<div class="a"><span class="b">y</span></div>');
    expect(out).not.toMatch(/\bclass=/);
  });

  it('supports a custom component name', () => {
    const out = htmlToReact('<p>hi</p>', { componentName: 'Hero' });
    expect(out).toContain('export default function Hero()');
  });
});
