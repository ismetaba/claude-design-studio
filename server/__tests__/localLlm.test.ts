import { describe, it, expect, vi } from 'vitest';
import { LocalLlmBackend } from '../adapters/localLlm';

describe('LocalLlmBackend.testConnection', () => {
  it('hits /api/tags when URL contains :11434', async () => {
    let calledUrl: string | undefined;
    const fetcher = vi.fn(async (url: unknown) => {
      calledUrl = String(url);
      return new Response('{}', { status: 200 });
    });
    const backend = new LocalLlmBackend(
      { kind: 'local-llm', baseUrl: 'http://localhost:11434', model: 'llama3' },
      { fetcher: fetcher as unknown as typeof fetch },
    );
    const r = await backend.testConnection();
    expect(r.ok).toBe(true);
    expect(calledUrl).toBe('http://localhost:11434/api/tags');
  });

  it('hits /v1/models for non-Ollama URLs', async () => {
    let calledUrl: string | undefined;
    const fetcher = vi.fn(async (url: unknown) => {
      calledUrl = String(url);
      return new Response('{}', { status: 200 });
    });
    const backend = new LocalLlmBackend(
      { kind: 'local-llm', baseUrl: 'http://localhost:8080', model: 'm' },
      { fetcher: fetcher as unknown as typeof fetch },
    );
    await backend.testConnection();
    expect(calledUrl).toBe('http://localhost:8080/v1/models');
  });

  it('returns ok:false on non-2xx', async () => {
    const fetcher = vi.fn(async () => new Response('', { status: 502 }));
    const backend = new LocalLlmBackend(
      { kind: 'local-llm', baseUrl: 'http://localhost:8080', model: 'm' },
      { fetcher },
    );
    const r = await backend.testConnection();
    expect(r.ok).toBe(false);
    expect(r.error).toContain('502');
  });
});
