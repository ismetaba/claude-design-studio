import { describe, it, expect } from 'vitest';
import { extractHtml } from '../lib/extractHtml';

describe('extractHtml', () => {
  it('returns empty string for empty input', () => {
    expect(extractHtml('')).toBe('');
  });

  it('strips ```html fenced blocks', () => {
    const raw = '```html\n<div>Hi</div>\n```';
    expect(extractHtml(raw)).toBe('<div>Hi</div>');
  });

  it('strips bare ``` fenced blocks', () => {
    const raw = '```\n<p>x</p>\n```';
    expect(extractHtml(raw)).toBe('<p>x</p>');
  });

  it('tolerates partial / unterminated fences during streaming', () => {
    const raw = '```html\n<div>partial';
    expect(extractHtml(raw)).toBe('<div>partial');
  });

  it('drops leading prose before fence', () => {
    const raw = 'Here you go!\n```html\n<h1>Hi</h1>\n```';
    expect(extractHtml(raw)).toBe('<h1>Hi</h1>');
  });

  it('returns bare HTML unchanged when no fence is present', () => {
    expect(extractHtml('<section>OK</section>')).toBe('<section>OK</section>');
  });

  it('removes a partial trailing backtick during streaming', () => {
    const raw = '```html\n<div>x</div>\n``';
    expect(extractHtml(raw)).toBe('<div>x</div>');
  });
});
