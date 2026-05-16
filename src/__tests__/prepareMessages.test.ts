import { describe, it, expect } from 'vitest';
import { prepareMessages } from '../../server/lib/prepareMessages';
import { buildSystemPrompt } from '../../server/lib/systemPrompt';

function turn(role: 'user' | 'assistant', content: string) {
  return { role, content } as const;
}

describe('prepareMessages — sliding window', () => {
  it('passes through short histories untouched', () => {
    const messages = [turn('user', 'a'), turn('assistant', 'b'), turn('user', 'c')];
    const out = prepareMessages({ messages });
    expect(out.messages).toEqual(messages);
    expect(out.injectedCurrentHtml).toBe(false);
  });

  it('keeps the first user turn + last 8 turns once the window is exceeded', () => {
    const messages = [
      turn('user', 'BRIEF'),
      turn('assistant', 'r1'),
      turn('user', 'u2'),
      turn('assistant', 'r2'),
      turn('user', 'u3'),
      turn('assistant', 'r3'),
      turn('user', 'u4'),
      turn('assistant', 'r4'),
      turn('user', 'u5'),
      turn('assistant', 'r5'),
      turn('user', 'u6'),
    ];
    // 11 messages > 8 + 1 → window kicks in
    const out = prepareMessages({ messages });
    expect(out.messages[0].content).toBe('BRIEF');
    expect(out.messages.length).toBe(9);
    expect(out.messages[out.messages.length - 1].content).toBe('u6');
  });

  it('does not duplicate the first user turn if it already falls inside the tail window', () => {
    const messages = [
      turn('user', 'BRIEF'),
      turn('assistant', 'r1'),
      turn('user', 'u2'),
    ];
    const out = prepareMessages({ messages });
    expect(out.messages.length).toBe(3);
    expect(out.messages.filter((m) => m.content === 'BRIEF').length).toBe(1);
  });
});

describe('prepareMessages — current HTML injection', () => {
  it('wraps the last user message with the current HTML in markdown fences', () => {
    const messages = [turn('user', 'make the buttons rounder')];
    const out = prepareMessages({
      messages,
      currentHtml: '<button class="rounded-sm">Hi</button>',
    });
    expect(out.injectedCurrentHtml).toBe(true);
    const last = out.messages[out.messages.length - 1];
    expect(last.role).toBe('user');
    expect(last.content).toContain('```html');
    expect(last.content).toContain('<button class="rounded-sm">Hi</button>');
    expect(last.content).toContain('make the buttons rounder');
  });

  it('does not inject when currentHtml is empty', () => {
    const messages = [turn('user', 'hello')];
    const out = prepareMessages({ messages, currentHtml: '' });
    expect(out.injectedCurrentHtml).toBe(false);
    expect(out.messages[0].content).toBe('hello');
  });

  it('truncates absurdly large HTML before injection', () => {
    const huge = '<div>' + 'x'.repeat(200_000) + '</div>';
    const out = prepareMessages({
      messages: [turn('user', 'tweak')],
      currentHtml: huge,
    });
    const last = out.messages[out.messages.length - 1];
    expect(last.content).toContain('<!-- truncated -->');
    expect(last.content.length).toBeLessThan(huge.length + 1_000);
  });

  it('only rewrites the LAST user message, leaving earlier ones intact', () => {
    const messages = [
      turn('user', 'first'),
      turn('assistant', 'reply'),
      turn('user', 'second'),
    ];
    const out = prepareMessages({
      messages,
      currentHtml: '<p>x</p>',
    });
    expect(out.messages[0].content).toBe('first');
    expect(out.messages[1].content).toBe('reply');
    expect(out.messages[2].content).toContain('second');
    expect(out.messages[2].content).toContain('<p>x</p>');
  });
});

describe('buildSystemPrompt', () => {
  it('returns the base prompt when no project context is given', () => {
    const base = buildSystemPrompt();
    expect(base).toContain('Claude Design Studio');
    expect(base).toContain('Refinement rules');
    expect(base).not.toContain('Project context');
  });

  it('appends a Project context block when title is provided', () => {
    const out = buildSystemPrompt({ projectTitle: 'Pricing page demo' });
    expect(out).toContain('# Project context');
    expect(out).toContain('Title: Pricing page demo');
  });

  it('includes notes when provided', () => {
    const out = buildSystemPrompt({
      projectTitle: 'Nexus Vault',
      projectNotes: 'Institutional crypto custody, dark mode, neon accents.',
    });
    expect(out).toContain('Title: Nexus Vault');
    expect(out).toContain('Brief: Institutional crypto custody');
  });

  it('still produces a Project context block with only notes', () => {
    const out = buildSystemPrompt({ projectNotes: 'just notes, no title' });
    expect(out).toContain('# Project context');
    expect(out).toContain('Brief: just notes');
    expect(out).not.toContain('Title:');
  });
});
