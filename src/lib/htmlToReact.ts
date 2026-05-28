/**
 * Convert an HTML string into a TypeScript React function-component string.
 * - `class=`   → `className=`
 * - `for=`     → `htmlFor=`
 * - void tags self-close (`<img>` → `<img />`).
 * - Wraps the body in `export default function Generated()` returning a fragment.
 *
 * This is a best-effort, tag-soup tolerant transform that operates on the raw
 * source string (avoiding DOMParser) so it works in both browser and Node tests.
 */

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const ATTR_RENAMES: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  autofocus: 'autoFocus',
  autocomplete: 'autoComplete',
  autocapitalize: 'autoCapitalize',
  contenteditable: 'contentEditable',
  spellcheck: 'spellCheck',
  enterkeyhint: 'enterKeyHint',
};

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g;
const ATTR_RE = /\s+([a-zA-Z_:][-a-zA-Z0-9_:.]*)(\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>=`]+))?/g;
const QUOTED_VALUE_RE = /=\s*(?:"([^"]*)"|'([^']*)')/;

/**
 * Convert an inline CSS string (`"color: red; font-size: 12px"`) into a JSX
 * style-object expression (`{{ color: 'red', fontSize: '12px' }}`). React
 * rejects a raw style string, so this is required for the output to compile.
 */
function cssToReactStyle(css: string): string {
  const entries: string[] = [];
  for (const decl of css.split(';')) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;
    const prop = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (!prop || !value) continue;
    // CSS custom properties (`--foo`) stay verbatim as a quoted key; everything
    // else is camelCased (`font-size` → `fontSize`, `-webkit-x` → `WebkitX`).
    const key = prop.startsWith('--')
      ? `'${prop}'`
      : prop.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
    entries.push(`${key}: '${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`);
  }
  return `{{ ${entries.join(', ')} }}`;
}

function rewriteAttributes(attrSource: string): string {
  return attrSource.replace(ATTR_RE, (_match, name: string, valueExpr?: string) => {
    const lower = name.toLowerCase();
    if (lower === 'style' && valueExpr) {
      const m = QUOTED_VALUE_RE.exec(valueExpr);
      if (m) return ` style=${cssToReactStyle(m[1] ?? m[2] ?? '')}`;
    }
    const newName = ATTR_RENAMES[lower] ?? name;
    return ` ${newName}${valueExpr ?? ''}`;
  });
}

/** Best-effort transform of HTML source to JSX source. */
export function htmlToJsx(html: string): string {
  return html.replace(TAG_RE, (_match, closing: string, tag: string, attrs: string, selfClose: string) => {
    if (closing) return `</${tag}>`;
    const rewritten = rewriteAttributes(attrs);
    if (VOID_TAGS.has(tag.toLowerCase())) {
      // Ensure void tag is self-closed exactly once.
      const cleanedAttrs = rewritten.replace(/\s*\/\s*$/, '');
      return `<${tag}${cleanedAttrs} />`;
    }
    if (selfClose) {
      return `<${tag}${rewritten} />`;
    }
    return `<${tag}${rewritten}>`;
  });
}

export interface HtmlToReactOptions {
  componentName?: string;
}

/** Full wrapper that produces a TS component module string. */
export function htmlToReact(html: string, opts: HtmlToReactOptions = {}): string {
  const componentName = opts.componentName ?? 'Generated';
  const jsx = htmlToJsx(html.trim());
  const indented = jsx
    .split('\n')
    .map((line) => (line.length ? `      ${line}` : line))
    .join('\n');
  return `export default function ${componentName}() {\n  return (\n    <>\n${indented}\n    </>\n  );\n}\n`;
}
