import type {
  BackendConfig,
  GenerateRequestBody,
  SSEEvent,
  TurnRole,
} from '../types/domain';

export interface PostGenerateArgs {
  backend: BackendConfig;
  messages: Array<{ role: TurnRole; content: string }>;
  resumeSdkSessionId?: string;
  projectTitle?: string;
  projectNotes?: string;
  currentHtml?: string;
  signal?: AbortSignal;
  onEvent: (event: SSEEvent) => void;
  endpoint?: string;
  /** Inject for tests. */
  fetcher?: typeof fetch;
}

interface ParsedSseEvent {
  event: string;
  data: string;
}

function parseSseChunks(text: string): { events: ParsedSseEvent[]; rest: string } {
  const events: ParsedSseEvent[] = [];
  let rest = text;
  while (true) {
    const idx = rest.indexOf('\n\n');
    if (idx < 0) break;
    const block = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
    events.push({ event, data: dataLines.join('\n') });
  }
  return { events, rest };
}

function toTypedEvent(raw: ParsedSseEvent): SSEEvent | null {
  try {
    const data = raw.data ? JSON.parse(raw.data) : {};
    switch (raw.event) {
      case 'delta':
        return { type: 'delta', text: String(data.text ?? '') };
      case 'session':
        return { type: 'session', sdkSessionId: String(data.sdkSessionId ?? '') };
      case 'done':
        return { type: 'done' };
      case 'error':
        return { type: 'error', message: String(data.message ?? 'Unknown error') };
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export async function postGenerate(args: PostGenerateArgs): Promise<void> {
  const fetcher = args.fetcher ?? fetch;
  const body: GenerateRequestBody = {
    backend: args.backend,
    messages: args.messages,
    resumeSdkSessionId: args.resumeSdkSessionId,
    projectTitle: args.projectTitle,
    projectNotes: args.projectNotes,
    currentHtml: args.currentHtml,
  };
  const res = await fetcher(args.endpoint ?? '/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: args.signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`Generate failed (${res.status}): ${text || res.statusText}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseChunks(buffer);
    buffer = rest;
    for (const raw of events) {
      const typed = toTypedEvent(raw);
      if (typed) args.onEvent(typed);
    }
  }
  if (buffer.length > 0) {
    const { events } = parseSseChunks(buffer + '\n\n');
    for (const raw of events) {
      const typed = toTypedEvent(raw);
      if (typed) args.onEvent(typed);
    }
  }
}

export async function postTestBackend(
  backend: BackendConfig,
  init: { signal?: AbortSignal; fetcher?: typeof fetch } = {},
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const fetcher = init.fetcher ?? fetch;
  const res = await fetcher('/api/test-backend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ backend }),
    signal: init.signal,
  });
  if (!res.ok) {
    return { ok: false, latencyMs: 0, error: `HTTP ${res.status}` };
  }
  return (await res.json()) as { ok: boolean; latencyMs: number; error?: string };
}

export const _internals = { parseSseChunks, toTypedEvent };
