/**
 * Returns the prose text of a streamed assistant turn — everything outside ```code fences```.
 * Tolerates partial / unterminated fences during streaming.
 */
export function stripCodeFences(raw: string): string {
  if (!raw) return '';
  const parts: string[] = [];
  let i = 0;
  const len = raw.length;
  while (i < len) {
    const open = raw.indexOf('```', i);
    if (open === -1) {
      parts.push(raw.slice(i));
      break;
    }
    // text before the fence
    parts.push(raw.slice(i, open));
    // skip the opening fence and optional language
    let cursor = open + 3;
    // optional language tag on the same line
    const nl = raw.indexOf('\n', cursor);
    if (nl !== -1 && /^[A-Za-z0-9_+-]*$/.test(raw.slice(cursor, nl).trim())) {
      cursor = nl + 1;
    }
    const close = raw.indexOf('```', cursor);
    if (close === -1) {
      // unterminated fence — drop the rest (likely streaming)
      break;
    }
    i = close + 3;
  }
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim();
}
