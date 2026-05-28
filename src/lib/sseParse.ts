/**
 * Pure, framework-agnostic Server-Sent Events parsing.
 *
 * Shared by the browser client (`src/lib/api.ts`) and the Node server
 * (`server/adapters/sseClient.ts`) so the wire format is defined in exactly
 * one place. Both sides buffer bytes/strings and need to split on the `\n\n`
 * record delimiter, then map each block to its `event:` / `data:` fields.
 */

export interface SseRecord {
  event: string;
  data: string;
}

/** Parse a single SSE block (the text between two `\n\n` delimiters). */
export function parseSseBlock(block: string): SseRecord {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
  }
  return { event, data: dataLines.join('\n') };
}

/**
 * Split a buffer into all complete SSE records it contains, returning the
 * unterminated remainder so the caller can prepend it to the next chunk.
 */
export function splitSseBuffer(buffer: string): { records: SseRecord[]; rest: string } {
  const records: SseRecord[] = [];
  let rest = buffer;
  while (true) {
    const idx = rest.indexOf('\n\n');
    if (idx < 0) break;
    records.push(parseSseBlock(rest.slice(0, idx)));
    rest = rest.slice(idx + 2);
  }
  return { records, rest };
}
