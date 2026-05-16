import { htmlToReact } from './htmlToReact';

export interface ClipboardLike {
  writeText(text: string): Promise<void>;
}

export interface ExportEnv {
  clipboard?: ClipboardLike;
  document?: Document;
  url?: typeof URL;
}

function resolveClipboard(env: ExportEnv): ClipboardLike {
  if (env.clipboard) return env.clipboard;
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { clipboard?: ClipboardLike }) : undefined;
  if (nav?.clipboard?.writeText) return nav.clipboard;
  throw new Error('Clipboard API not available');
}

export async function copyText(text: string, env: ExportEnv = {}): Promise<void> {
  const clipboard = resolveClipboard(env);
  await clipboard.writeText(text);
}

export function downloadFile(
  filename: string,
  content: string,
  mime = 'text/plain;charset=utf-8',
  env: ExportEnv = {},
): void {
  const doc = env.document ?? (typeof document !== 'undefined' ? document : undefined);
  const url = env.url ?? (typeof URL !== 'undefined' ? URL : undefined);
  if (!doc || !url) throw new Error('Document or URL not available');
  const blob = new Blob([content], { type: mime });
  const href = url.createObjectURL(blob);
  const anchor = doc.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  doc.body.appendChild(anchor);
  anchor.click();
  doc.body.removeChild(anchor);
  url.revokeObjectURL(href);
}

export function toReactComponentString(html: string, componentName = 'Generated'): string {
  return htmlToReact(html, { componentName });
}
