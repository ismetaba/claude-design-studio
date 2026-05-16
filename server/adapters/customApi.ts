import type { AdapterMessage, ConnectionTestResult, LLMBackend, StreamOptions } from './types';
import { buildSystemPrompt } from '../lib/systemPrompt';
import { prepareMessages } from '../lib/prepareMessages';
import { iterateSseRecords } from './sseClient';
import type { CustomApiConfig } from '../../src/types/domain';

export interface CustomApiBackendOptions {
  /** Inject for tests. */
  fetcher?: typeof fetch;
}

interface OpenAiChunk {
  choices?: Array<{ delta?: { content?: string } }>;
}

interface AnthropicChunkDelta {
  delta?: { text?: string };
}

interface AnthropicTextBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

interface AnthropicMessageInput {
  role: 'user' | 'assistant';
  content: AnthropicTextBlock[];
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export class CustomApiBackend implements LLMBackend {
  readonly kind = 'custom-api' as const;
  private readonly config: CustomApiConfig;
  private readonly fetcher: typeof fetch;

  constructor(config: CustomApiConfig, opts: CustomApiBackendOptions = {}) {
    this.config = config;
    this.fetcher = opts.fetcher ?? fetch;
  }

  async *streamCompletion(messages: AdapterMessage[], opts: StreamOptions): AsyncIterable<string> {
    const { messages: prepared } = prepareMessages({
      messages,
      currentHtml: opts.currentHtml,
    });
    const system = buildSystemPrompt({
      projectTitle: opts.projectTitle,
      projectNotes: opts.projectNotes,
    });
    if (this.config.format === 'openai') {
      yield* this.streamOpenAi(prepared, system, opts.signal);
    } else {
      yield* this.streamAnthropic(prepared, system, opts.signal);
    }
  }

  private async *streamOpenAi(
    messages: AdapterMessage[],
    system: string,
    signal: AbortSignal,
  ): AsyncGenerator<string> {
    const url = `${trimSlash(this.config.baseUrl)}/chat/completions`;
    const body = {
      model: this.config.model,
      stream: true,
      messages: [{ role: 'system', content: system }, ...messages],
    };
    const res = await this.fetcher(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`Custom API (openai) failed: HTTP ${res.status}`);
    }
    for await (const rec of iterateSseRecords(res.body, signal)) {
      if (rec.data === '[DONE]') return;
      if (!rec.data) continue;
      try {
        const chunk = JSON.parse(rec.data) as OpenAiChunk;
        const piece = chunk.choices?.[0]?.delta?.content;
        if (piece) yield piece;
      } catch {
        // Ignore malformed chunks; some providers emit keep-alives.
      }
    }
  }

  private async *streamAnthropic(
    messages: AdapterMessage[],
    system: string,
    signal: AbortSignal,
  ): AsyncGenerator<string> {
    const url = `${trimSlash(this.config.baseUrl)}/v1/messages`;

    // Prompt caching: mark the system prompt + the last user message as cacheable.
    // First we transform the message array into Anthropic block format so we can
    // attach cache_control to specific blocks (the SDK requires this shape).
    const anthropicMessages: AnthropicMessageInput[] = messages.map((m) => ({
      role: m.role,
      content: [{ type: 'text', text: m.content }],
    }));
    if (anthropicMessages.length > 0) {
      const last = anthropicMessages[anthropicMessages.length - 1];
      const lastBlock = last.content[last.content.length - 1];
      lastBlock.cache_control = { type: 'ephemeral' };
    }
    const body = {
      model: this.config.model,
      stream: true,
      max_tokens: 4096,
      // Anthropic accepts either a string OR an array of blocks for `system`.
      // Use the block form so we can mark it cacheable — system prompts rarely
      // change, so this is the single biggest cost win in multi-turn chats.
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: anthropicMessages,
    };
    const res = await this.fetcher(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`Custom API (anthropic) failed: HTTP ${res.status}`);
    }
    for await (const rec of iterateSseRecords(res.body, signal)) {
      if (rec.event !== 'content_block_delta') continue;
      try {
        const chunk = JSON.parse(rec.data) as AnthropicChunkDelta;
        const piece = chunk.delta?.text;
        if (piece) yield piece;
      } catch {
        /* ignore */
      }
    }
  }

  async testConnection(signal?: AbortSignal): Promise<ConnectionTestResult> {
    const start = Date.now();
    try {
      if (this.config.format === 'openai') {
        const res = await this.fetcher(`${trimSlash(this.config.baseUrl)}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            stream: false,
            max_tokens: 1,
            messages: [{ role: 'user', content: 'ping' }],
          }),
          signal,
        });
        return res.ok
          ? { ok: true, latencyMs: Date.now() - start }
          : { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
      }
      const res = await this.fetcher(`${trimSlash(this.config.baseUrl)}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
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
