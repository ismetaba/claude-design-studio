import { describe, it, expect } from 'vitest';
import { resolveBackend } from '../adapters/factory';

describe('resolveBackend factory', () => {
  it('returns ClaudeAgentSdkBackend for claude-agent-sdk', () => {
    const b = resolveBackend({ kind: 'claude-agent-sdk' });
    expect(b.kind).toBe('claude-agent-sdk');
  });

  it('returns CustomApiBackend for custom-api', () => {
    const b = resolveBackend({
      kind: 'custom-api',
      baseUrl: 'https://x',
      apiKey: 'k',
      model: 'm',
      format: 'openai',
    });
    expect(b.kind).toBe('custom-api');
  });

  it('returns LocalLlmBackend for local-llm', () => {
    const b = resolveBackend({ kind: 'local-llm', baseUrl: 'http://localhost:11434', model: 'm' });
    expect(b.kind).toBe('local-llm');
  });
});
