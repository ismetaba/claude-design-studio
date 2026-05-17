/**
 * Best-effort extraction of the dominant background colour from a design's
 * HTML, so the surrounding canvas can mirror the artwork rather than sitting
 * on a generic cream.
 *
 * Looks at, in order:
 *   1. `<meta name="cds-bg" content="#hex">` — explicit author override.
 *   2. Inline body style: `<body style="background: #hex">` (also `background-color`).
 *   3. CSS in <style> blocks: `body { background: #hex }` or `body { background-color: ... }`.
 *
 * Returns the first plausible colour found, or `null` if nothing matches.
 * Linear-gradients are accepted as-is so they round-trip cleanly.
 */
export function extractDesignBg(html: string): string | null {
  if (!html) return null;

  const meta = /<meta[^>]+name=['"]cds-bg['"][^>]+content=['"]([^'"]+)['"][^>]*>/i.exec(html);
  if (meta) return meta[1].trim();

  const bodyStyle = /<body\b[^>]*\bstyle\s*=\s*['"]([^'"]*)['"][^>]*>/i.exec(html);
  if (bodyStyle) {
    const inline = extractFromDeclarations(bodyStyle[1]);
    if (inline) return inline;
  }

  for (const styleBlock of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const bodyRule = /(?:^|[}\s])body\b[^{]*\{([^}]*)\}/i.exec(styleBlock[1]);
    if (bodyRule) {
      const css = extractFromDeclarations(bodyRule[1]);
      if (css) return css;
    }
  }

  return null;
}

function extractFromDeclarations(decls: string): string | null {
  // Prefer the `background` shorthand because authors often use it with a
  // gradient. Fall back to `background-color`.
  const bgMatch = /(?:^|[;\s])background\s*:\s*([^;]+?)(?:;|$)/i.exec(decls);
  if (bgMatch) {
    const value = bgMatch[1].trim();
    if (isPlausibleColorValue(value)) return value;
  }
  const colorMatch = /(?:^|[;\s])background-color\s*:\s*([^;]+?)(?:;|$)/i.exec(decls);
  if (colorMatch) {
    const value = colorMatch[1].trim();
    if (isPlausibleColorValue(value)) return value;
  }
  return null;
}

function isPlausibleColorValue(value: string): boolean {
  if (!value || value === 'transparent' || value === 'none' || value === 'inherit') return false;
  return (
    /^#[0-9a-f]{3,8}$/i.test(value) ||
    /^rgb/i.test(value) ||
    /^hsl/i.test(value) ||
    /gradient\(/i.test(value) ||
    /^[a-z]+$/i.test(value) // named colour
  );
}
