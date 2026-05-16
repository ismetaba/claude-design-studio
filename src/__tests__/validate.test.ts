import { describe, it, expect } from 'vitest';
import { isAbsoluteHttpUrl, validateBackendConfig } from '../lib/validate';

describe('isAbsoluteHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isAbsoluteHttpUrl('http://x.test')).toBe(true);
    expect(isAbsoluteHttpUrl('https://x.test/v1')).toBe(true);
  });
  it('rejects empty / relative / other schemes', () => {
    expect(isAbsoluteHttpUrl('')).toBe(false);
    expect(isAbsoluteHttpUrl('x.test')).toBe(false);
    expect(isAbsoluteHttpUrl('ftp://x.test')).toBe(false);
  });
});

describe('validateBackendConfig', () => {
  it('claude-agent-sdk is always valid', () => {
    expect(validateBackendConfig({ kind: 'claude-agent-sdk' }).ok).toBe(true);
  });

  it('custom-api flags every missing field', () => {
    const v = validateBackendConfig({
      kind: 'custom-api',
      baseUrl: '',
      apiKey: '',
      model: '',
      format: 'openai',
    });
    expect(v.ok).toBe(false);
    expect(v.errors.baseUrl).toBeTruthy();
    expect(v.errors.apiKey).toBeTruthy();
    expect(v.errors.model).toBeTruthy();
  });

  it('local-llm only requires baseUrl + model', () => {
    expect(
      validateBackendConfig({ kind: 'local-llm', baseUrl: 'http://localhost:11434', model: 'llama3' })
        .ok,
    ).toBe(true);
    expect(
      validateBackendConfig({ kind: 'local-llm', baseUrl: 'localhost:11434', model: 'llama3' }).ok,
    ).toBe(false);
  });
});
