import type { AdapterMessage, ConnectionTestResult, LLMBackend, StreamOptions } from './types';
import { BackendUnavailableError } from './types';
import { buildSystemPrompt } from '../lib/systemPrompt';
import { prepareMessages } from '../lib/prepareMessages';

interface SdkAssistantContentBlock {
  type: string;
  text?: string;
}

interface SdkAssistantMessage {
  type: 'assistant';
  message: { content?: SdkAssistantContentBlock[] };
  session_id?: string;
}

interface SdkSystemMessage {
  type: 'system';
  subtype: 'init';
  session_id: string;
}

interface SdkResultMessage {
  type: 'result';
  is_error?: boolean;
  errors?: string[];
}

type SdkMessage = SdkAssistantMessage | SdkSystemMessage | SdkResultMessage | { type: string };

export interface QueryOptions {
  systemPrompt?: string;
  permissionMode?: string;
  resume?: string;
}

export interface QueryFn {
  (params: { prompt: string; options?: QueryOptions }): AsyncIterable<SdkMessage>;
}

export interface ClaudeAgentSdkBackendOptions {
  query?: QueryFn;
}

function extractAssistantText(msg: SdkAssistantMessage): string {
  const blocks = msg.message?.content ?? [];
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === 'text' && typeof b.text === 'string') parts.push(b.text);
  }
  return parts.join('');
}

async function loadDefaultQuery(): Promise<QueryFn> {
  try {
    const mod = (await import('@anthropic-ai/claude-agent-sdk')) as { query?: QueryFn };
    if (!mod.query) throw new Error('SDK did not export query()');
    return mod.query;
  } catch (err) {
    throw new BackendUnavailableError(
      `Failed to load @anthropic-ai/claude-agent-sdk: ${(err as Error).message}`,
    );
  }
}

export class ClaudeAgentSdkBackend implements LLMBackend {
  readonly kind = 'claude-agent-sdk' as const;
  private readonly queryFn?: QueryFn;

  constructor(opts: ClaudeAgentSdkBackendOptions = {}) {
    this.queryFn = opts.query;
  }

  private async resolveQuery(): Promise<QueryFn> {
    return this.queryFn ?? (await loadDefaultQuery());
  }

  async *streamCompletion(messages: AdapterMessage[], opts: StreamOptions): AsyncIterable<string> {
    // The SDK keeps multi-turn state itself when `resume` is set, so we hand it
    // only the last user message — but we still inject the canonical current HTML
    // so refinements never lose their anchor, and we always pass an up-to-date
    // system prompt with the project brief.
    const { messages: prepared } = prepareMessages({
      messages,
      currentHtml: opts.currentHtml,
    });
    const last = [...prepared].reverse().find((m) => m.role === 'user');
    if (!last) return;
    const query = await this.resolveQuery();
    const stream = query({
      prompt: last.content,
      options: {
        systemPrompt: buildSystemPrompt({
          projectTitle: opts.projectTitle,
          projectNotes: opts.projectNotes,
        }),
        permissionMode: 'bypassPermissions',
        ...(opts.resumeSdkSessionId ? { resume: opts.resumeSdkSessionId } : {}),
      },
    });
    for await (const msg of stream) {
      if (opts.signal.aborted) return;
      if (msg.type === 'system' && (msg as SdkSystemMessage).subtype === 'init') {
        const sid = (msg as SdkSystemMessage).session_id;
        if (sid) opts.onSessionId?.(sid);
        continue;
      }
      if (msg.type === 'assistant') {
        const text = extractAssistantText(msg as SdkAssistantMessage);
        if (text) yield text;
      }
      if (msg.type === 'result') {
        const r = msg as SdkResultMessage;
        if (r.is_error) {
          throw new Error(r.errors?.join('; ') ?? 'Claude Agent SDK returned an error result.');
        }
        return;
      }
    }
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();
    try {
      await this.resolveQuery();
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
