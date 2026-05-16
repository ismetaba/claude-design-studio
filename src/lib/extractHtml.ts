/**
 * Strip Markdown code fences from streamed model output and return the inner HTML.
 * Tolerant of partial / unterminated fences during streaming.
 */
export function extractHtml(raw: string): string {
  if (!raw) return '';
  let text = raw;

  // 1. Drop any prose before the first fence, if one exists.
  const fenceStart = text.indexOf('```');
  if (fenceStart >= 0) {
    text = text.slice(fenceStart);
  }

  // 2. Remove the opening fence and optional language marker on the first line.
  text = text.replace(/^```[ \t]*([A-Za-z0-9_+\-]+)?[ \t]*\r?\n?/, '');

  // 3. Strip a trailing closing fence if present (tolerate partial fences).
  text = text.replace(/\r?\n?```\s*$/, '');

  // 4. Drop any partial trailing fence chars left over (e.g. "``" while streaming).
  text = text.replace(/\r?\n?`{1,2}\s*$/, '');

  return text.trimStart();
}
