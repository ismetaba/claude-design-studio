import { iterateSseRecords } from './sseClient';

interface OpenAiChunk {
  choices?: Array<{ delta?: { content?: string } }>;
}

/**
 * Consume an OpenAI-compatible chat-completions SSE stream and yield the text
 * deltas. Shared by every backend that speaks the OpenAI wire format (the
 * custom-api "openai" mode and the local-LLM backend), so the parsing rules —
 * `[DONE]` sentinel, keep-alive tolerance, malformed-chunk skipping — live in
 * one place.
 */
export async function* streamOpenAiDeltas(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<string> {
  for await (const rec of iterateSseRecords(body, signal)) {
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
