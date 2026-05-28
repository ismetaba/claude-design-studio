/**
 * Parse SSE byte stream from a fetch Response into a typed event stream.
 * Handles partial events across packet boundaries.
 *
 * The block/record parsing itself lives in the shared `sseParse` module so the
 * client and server agree on the wire format.
 */

import { parseSseBlock, splitSseBuffer, type SseRecord } from '../../src/lib/sseParse';

export type { SseRecord };

export async function* iterateSseRecords(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<SseRecord> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      if (signal.aborted) return;
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { records, rest } = splitSseBuffer(buffer);
      buffer = rest;
      for (const record of records) yield record;
    }
    // Flush any trailing record that wasn't terminated by a blank line.
    if (buffer.trim().length > 0) yield parseSseBlock(buffer);
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
}
