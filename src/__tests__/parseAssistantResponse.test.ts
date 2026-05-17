import { describe, it, expect } from 'vitest';
import { parseAssistantResponse } from '../lib/parseAssistantResponse';

describe('parseAssistantResponse — single', () => {
  it('extracts a normal html fence as kind=single', () => {
    const raw = [
      '## Rationale',
      '',
      'A clean signup.',
      '',
      '```html',
      '<!doctype html><html><body>hi</body></html>',
      '```',
    ].join('\n');
    const out = parseAssistantResponse(raw);
    expect(out.kind).toBe('single');
    if (out.kind === 'single') {
      expect(out.html).toContain('<!doctype html>');
      expect(out.prose).toContain('Rationale');
      expect(out.prose).not.toContain('<!doctype html>');
    }
  });

  it('returns empty single for empty input', () => {
    const out = parseAssistantResponse('');
    expect(out.kind).toBe('single');
    if (out.kind === 'single') {
      expect(out.html).toBe('');
      expect(out.prose).toBe('');
    }
  });

  it('tolerates a streaming html fence that has not closed yet', () => {
    const raw = '## Rationale\n\nBuilding…\n\n```html\n<!doctype html><html><body>partial';
    const out = parseAssistantResponse(raw);
    expect(out.kind).toBe('single');
    if (out.kind === 'single') {
      expect(out.html).toContain('<!doctype html>');
      expect(out.html).toContain('partial');
    }
  });
});

describe('parseAssistantResponse — questions', () => {
  const VALID_QUESTIONS = `Before I sketch, a few quick questions.

\`\`\`questions
{
  "intro": "Before I sketch, a few quick questions to nail the direction.",
  "groups": [
    {
      "id": "purpose",
      "label": "What is this for?",
      "hint": "Who's the primary user?",
      "options": [
        { "value": "institutional", "label": "Institutional clients" },
        { "value": "retail", "label": "Retail users" }
      ],
      "allowFreeText": true
    },
    {
      "id": "vibe",
      "label": "Which vibe?",
      "options": [
        { "value": "trust", "label": "Trust & gravitas" },
        { "value": "speed", "label": "Speed & energy" }
      ]
    }
  ]
}
\`\`\``;

  it('extracts question groups with options', () => {
    const out = parseAssistantResponse(VALID_QUESTIONS);
    expect(out.kind).toBe('questions');
    if (out.kind === 'questions') {
      expect(out.groups).toHaveLength(2);
      expect(out.groups[0].id).toBe('purpose');
      expect(out.groups[0].options).toHaveLength(2);
      expect(out.groups[0].allowFreeText).toBe(true);
      expect(out.groups[1].allowFreeText).toBe(false);
      expect(out.intro).toContain('Before I sketch');
    }
  });

  it('drops groups that are missing required fields', () => {
    const raw = `\`\`\`questions
{
  "groups": [
    { "id": "ok", "label": "Real one", "options": [{ "value": "a", "label": "A" }] },
    { "id": "no-options" },
    { "label": "no-id", "options": [{ "value": "x", "label": "X" }] }
  ]
}
\`\`\``;
    const out = parseAssistantResponse(raw);
    expect(out.kind).toBe('questions');
    if (out.kind === 'questions') {
      expect(out.groups).toHaveLength(1);
      expect(out.groups[0].id).toBe('ok');
    }
  });

  it('falls back to single when the questions JSON is unterminated (still streaming)', () => {
    const raw = `\`\`\`questions
{
  "groups": [
    { "id": "x", "label": "...`;
    const out = parseAssistantResponse(raw);
    // No closing fence + unparseable JSON → not questions.
    expect(out.kind).toBe('single');
  });

  it('falls back to single when the JSON has no groups array', () => {
    const raw = `\`\`\`questions
{ "intro": "hi" }
\`\`\``;
    const out = parseAssistantResponse(raw);
    expect(out.kind).toBe('single');
  });
});

describe('parseAssistantResponse — variations', () => {
  const TWO_VARIATIONS = `I'll explore two directions.

\`\`\`variation { "id": "01-vault", "name": "The Vault", "tagline": "Quiet institutional", "accent": "#c19a6b" }
<!doctype html><html><body>vault</body></html>
\`\`\`

\`\`\`variation { "id": "02-arcade", "name": "Cypherpunk Arcade", "tagline": "Loud and neon", "accent": "#00ffaa" }
<!doctype html><html><body>arcade</body></html>
\`\`\``;

  it('extracts two variation items with their headers', () => {
    const out = parseAssistantResponse(TWO_VARIATIONS);
    expect(out.kind).toBe('variations');
    if (out.kind === 'variations') {
      expect(out.items).toHaveLength(2);
      expect(out.items[0].name).toBe('The Vault');
      expect(out.items[0].accent).toBe('#c19a6b');
      expect(out.items[0].html).toContain('vault');
      expect(out.items[1].name).toBe('Cypherpunk Arcade');
      expect(out.items[1].html).toContain('arcade');
    }
  });

  it('requires at least 2 variations — falls back to single with 1', () => {
    const raw = `\`\`\`variation { "id": "only", "name": "Only one" }
<!doctype html><body>x</body></html>
\`\`\``;
    const out = parseAssistantResponse(raw);
    // 1 variation isn't enough to enter variations mode.
    expect(out.kind).toBe('single');
  });

  it('skips variation blocks with malformed header JSON', () => {
    const raw = `\`\`\`variation { not json
<!doctype html><body>x</body></html>
\`\`\`

\`\`\`variation { "id": "ok", "name": "OK" }
<!doctype html><body>good</body></html>
\`\`\`

\`\`\`variation { "id": "also-ok", "name": "Also" }
<!doctype html><body>good2</body></html>
\`\`\``;
    const out = parseAssistantResponse(raw);
    expect(out.kind).toBe('variations');
    if (out.kind === 'variations') {
      expect(out.items).toHaveLength(2);
      expect(out.items.map((i) => i.id)).toEqual(['ok', 'also-ok']);
    }
  });

  it('preserves the intro prose around the variation blocks', () => {
    const out = parseAssistantResponse(TWO_VARIATIONS);
    if (out.kind === 'variations') {
      expect(out.prose).toContain("I'll explore two directions");
      expect(out.prose).not.toContain('<!doctype');
    }
  });
});
