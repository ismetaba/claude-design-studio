import type { AdapterMessage, ConnectionTestResult, LLMBackend, StreamOptions } from './types';
import { buildSystemPrompt } from '../lib/systemPrompt';
import { prepareMessages } from '../lib/prepareMessages';
import { iterateSseRecords } from './sseClient';
import type { LocalLlmConfig } from '../../src/types/domain';

export interface LocalLlmBackendOptions {
  fetcher?: typeof fetch;
}

interface OpenAiChunk {
  choices?: Array<{ delta?: { content?: string } }>;
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export class LocalLlmBackend implements LLMBackend {
  readonly kind = 'local-llm' as const;
  private readonly config: LocalLlmConfig;
  private readonly fetcher: typeof fetch;

  constructor(config: LocalLlmConfig, opts: LocalLlmBackendOptions = {}) {
    this.config = config;
    this.fetcher = opts.fetcher ?? fetch;
  }

  private authHeaders(): Record<string, string> {
    return this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {};
  }

  async *streamCompletion(messages: AdapterMessage[], opts: StreamOptions): AsyncIterable<string> {
    const url = `${trimSlash(this.config.baseUrl)}/v1/chat/completions`;
    const { messages: prepared } = prepareMessages({
      messages,
      currentHtml: opts.currentHtml,
    });
    const system = buildSystemPrompt({
      projectTitle: opts.projectTitle,
      projectNotes: opts.projectNotes,
    });
    const res = await this.fetcher(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(),
      },
      body: JSON.stringify({
        model: this.config.model,
        stream: true,
        messages: [{ role: 'system', content: system }, ...prepared],
      }),
      signal: opts.signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`Local LLM failed: HTTP ${res.status}`);
    }
    for await (const rec of iterateSseRecords(res.body, opts.signal)) {
      if (rec.data === '[DONE]') return;
      if (!rec.data) continue;
      try {
        const chunk = JSON.parse(rec.data) as OpenAiChunk;
        const piece = chunk.choices?.[0]?.delta?.content;
        if (piece) yield piece;
      } catch {
        /* ignore */
      }
    }
  }

  async testConnection(signal?: AbortSignal): Promise<ConnectionTestResult> {
    const start = Date.now();
    try {
      const isOllama = this.config.baseUrl.includes(':11434');
      const url = isOllama
        ? `${trimSlash(this.config.baseUrl)}/api/tags`
        : `${trimSlash(this.config.baseUrl)}/v1/models`;
      const res = await this.fetcher(url, {
        method: 'GET',
        headers: this.authHeaders(),
        signal,
      });
      return res.ok
        ? { ok: true, latencyMs: Date.now() - start }
        : { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
