import { describe, expect, it } from 'vitest';
import { DESIGN_SYSTEM_PROMPT, buildSystemPrompt } from '../lib/systemPrompt';

describe('DESIGN_SYSTEM_PROMPT', () => {
  it('names the studio persona', () => {
    expect(DESIGN_SYSTEM_PROMPT).toContain('Claude Design Studio');
  });

  it('requires Tailwind via the CDN script tag', () => {
    expect(DESIGN_SYSTEM_PROMPT).toMatch(/cdn\.tailwindcss\.com/);
  });

  it('asks for realistic placeholder content and bans Lorem ipsum', () => {
    expect(DESIGN_SYSTEM_PROMPT).toMatch(/Realistic copy/i);
    expect(DESIGN_SYSTEM_PROMPT).toMatch(/Lorem ipsum/);
  });

  it('mandates the ```html code-fence wrapper for the output', () => {
    expect(DESIGN_SYSTEM_PROMPT).toContain('```html');
  });

  it('enforces the brief markdown rationale before the code', () => {
    expect(DESIGN_SYSTEM_PROMPT).toMatch(/markdown rationale/i);
  });

  it('documents refinement rules so the model returns full HTML, not diffs', () => {
    expect(DESIGN_SYSTEM_PROMPT).toMatch(/full updated HTML/i);
    expect(DESIGN_SYSTEM_PROMPT).toMatch(/never a diff/i);
  });
});

describe('buildSystemPrompt', () => {
  it('returns the base prompt unchanged when no project context is given', () => {
    expect(buildSystemPrompt()).toBe(DESIGN_SYSTEM_PROMPT);
  });

  it('appends a Project context block with the title and notes', () => {
    const out = buildSystemPrompt({
      projectTitle: 'Pricing page demo',
      projectNotes: 'Three tiers, monthly/yearly toggle, dark-friendly.',
    });
    expect(out).toContain('# Project context');
    expect(out).toContain('Title: Pricing page demo');
    expect(out).toContain('Brief: Three tiers, monthly/yearly toggle');
  });
});
