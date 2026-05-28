export type VirtualFileKind = 'page' | 'component' | 'style' | 'script';

export interface VirtualFile {
  id: string;
  /** Display name, e.g. "index.html" or "Hero.html". */
  name: string;
  kind: VirtualFileKind;
  /** Section bucket used by FilesPanel — 'pages' | 'components' | 'styles' | 'scripts'. */
  section: 'pages' | 'components' | 'styles' | 'scripts';
  language: 'html' | 'css' | 'javascript';
  /** Content shown in the editor. */
  content: string;
  /** Whether the editor should allow edits that flow back to the design's HTML. */
  editable: boolean;
}

const STYLE_RE = /<style[^>]*>([\s\S]*?)<\/style>/gi;
const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const SECTION_RE = /<(section|header|footer|nav|main|aside|article)\b([^>]*)>([\s\S]*?)<\/\1>/gi;

function isExternalScript(attrs: string): boolean {
  return /\bsrc\s*=\s*['"]?https?:/.test(attrs);
}

function isCdnReference(attrs: string): boolean {
  return /\bsrc\s*=\s*['"]?https?:\/\/[^'"\s]*(cdn|jsdelivr|unpkg|fonts\.googleapis)/i.test(attrs);
}

function extractTitle(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!m) return null;
  const t = m[1].trim();
  return t || null;
}

function nameForSection(tag: string, attrs: string, index: number): string {
  const idMatch = /\bid\s*=\s*['"]([^'"]+)['"]/.exec(attrs);
  if (idMatch) return capitalise(idMatch[1]);
  const cls = /\bclass\s*=\s*['"]([^'"]+)['"]/.exec(attrs);
  if (cls) {
    const first = cls[1].split(/\s+/).find((c) => c.length > 2 && !c.startsWith('w-') && !c.startsWith('h-'));
    if (first) return capitalise(first);
  }
  return `${capitalise(tag)}-${index + 1}`;
}

function capitalise(s: string): string {
  const cleaned = s.replace(/[^a-zA-Z0-9-_]/g, '');
  if (!cleaned) return 'Section';
  return cleaned
    .split(/[-_]/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join('');
}

export function parseHtmlFiles(html: string): VirtualFile[] {
  const files: VirtualFile[] = [];
  const trimmed = html.trim();

  // 1) Page itself
  if (trimmed.length > 0) {
    const title = extractTitle(html);
    const name = title ? `${slugify(title)}.html` : 'index.html';
    files.push({
      id: 'pages/index',
      name,
      kind: 'page',
      section: 'pages',
      language: 'html',
      content: html,
      editable: true,
    });
  } else {
    files.push({
      id: 'pages/index',
      name: 'index.html',
      kind: 'page',
      section: 'pages',
      language: 'html',
      content: '',
      editable: true,
    });
  }

  // 2) Styles
  const styles: string[] = [];
  let sMatch: RegExpExecArray | null;
  STYLE_RE.lastIndex = 0;
  while ((sMatch = STYLE_RE.exec(html)) !== null) {
    const body = sMatch[1].trim();
    if (body) styles.push(body);
  }
  if (styles.length > 0) {
    files.push({
      id: 'styles/main',
      name: 'styles.css',
      kind: 'style',
      section: 'styles',
      language: 'css',
      content: styles.join('\n\n'),
      editable: false,
    });
  }

  // 3) Scripts (skip CDN <script src="https://cdn.tailwindcss.com">, etc.)
  const scripts: string[] = [];
  let scriptMatch: RegExpExecArray | null;
  SCRIPT_RE.lastIndex = 0;
  while ((scriptMatch = SCRIPT_RE.exec(html)) !== null) {
    const attrs = scriptMatch[1] ?? '';
    const body = (scriptMatch[2] ?? '').trim();
    if (isExternalScript(attrs)) continue;
    if (isCdnReference(attrs)) continue;
    if (body) scripts.push(body);
  }
  if (scripts.length > 0) {
    files.push({
      id: 'scripts/main',
      name: 'scripts.js',
      kind: 'script',
      section: 'scripts',
      language: 'javascript',
      content: scripts.join('\n\n'),
      editable: false,
    });
  }

  // 4) Components — top-level semantic sections from <body>
  const bodyMatch = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const bodyContent = bodyMatch ? bodyMatch[1] : html;
  const seen = new Set<string>();
  let componentIndex = 0;
  let secMatch: RegExpExecArray | null;
  // Reset state per call
  SECTION_RE.lastIndex = 0;
  while ((secMatch = SECTION_RE.exec(bodyContent)) !== null) {
    const tag = secMatch[1].toLowerCase();
    const attrs = secMatch[2];
    const fullBlock = secMatch[0];
    const baseName = nameForSection(tag, attrs, componentIndex);
    let name = `${baseName}.html`;
    let suffix = 2;
    while (seen.has(name)) {
      name = `${baseName}${suffix}.html`;
      suffix += 1;
    }
    seen.add(name);
    files.push({
      id: `components/${name}`,
      name,
      kind: 'component',
      section: 'components',
      language: 'html',
      content: fullBlock,
      editable: false,
    });
    componentIndex += 1;
  }

  return files;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'index';
}

export function fileById(files: VirtualFile[], id: string): VirtualFile | undefined {
  return files.find((f) => f.id === id);
}

export function defaultFileId(files: VirtualFile[]): string {
  return files[0]?.id ?? 'pages/index';
}
