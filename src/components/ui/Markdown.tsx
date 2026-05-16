import { type ReactNode } from 'react';

interface MarkdownProps {
  source: string;
  className?: string;
}

interface Block {
  kind: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'hr';
  content?: string;
  items?: string[];
}

function parse(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push({ kind: 'hr' });
      i += 1;
      continue;
    }

    if (/^###\s+/.test(trimmed)) {
      blocks.push({ kind: 'h3', content: trimmed.replace(/^###\s+/, '') });
      i += 1;
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      blocks.push({ kind: 'h2', content: trimmed.replace(/^##\s+/, '') });
      i += 1;
      continue;
    }
    if (/^#\s+/.test(trimmed)) {
      blocks.push({ kind: 'h1', content: trimmed.replace(/^#\s+/, '') });
      i += 1;
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ''));
        i += 1;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }

    // Paragraph (one or more consecutive non-empty lines)
    const para: string[] = [trimmed];
    i += 1;
    while (i < lines.length && lines[i].trim() && !/^([-*]|\d+[.)]|#{1,3})\s+/.test(lines[i].trim())) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ kind: 'p', content: para.join(' ') });
  }
  return blocks;
}

const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

function renderInline(text: string): ReactNode[] {
  if (!text) return [];
  const out: ReactNode[] = [];
  let idx = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    const start = m.index;
    if (start > idx) out.push(text.slice(idx, start));
    const token = m[0];
    if (token.startsWith('**')) {
      out.push(
        <strong key={`b-${start}`} className="font-semibold text-fg-strong">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('*')) {
      out.push(
        <em key={`i-${start}`} className="font-serif italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith('`')) {
      out.push(
        <code key={`c-${start}`} className="rounded bg-hover px-1 py-0.5 font-mono text-[11px] text-fg-strong">
          {token.slice(1, -1)}
        </code>,
      );
    }
    idx = start + token.length;
  }
  if (idx < text.length) out.push(text.slice(idx));
  return out;
}

export function Markdown({ source, className }: MarkdownProps) {
  const blocks = parse(source);
  if (blocks.length === 0) return null;
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        const key = `b-${i}`;
        switch (block.kind) {
          case 'h1':
            return (
              <h1 key={key} className="mt-4 font-serif text-[18px] font-medium leading-snug text-fg-strong first:mt-0">
                {renderInline(block.content!)}
              </h1>
            );
          case 'h2':
            return (
              <h2 key={key} className="mt-4 text-[14px] font-semibold leading-snug text-fg-strong first:mt-0">
                {renderInline(block.content!)}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={key} className="mt-3 text-[13px] font-semibold leading-snug text-fg-strong first:mt-0">
                {renderInline(block.content!)}
              </h3>
            );
          case 'p':
            return (
              <p key={key} className="mt-2 text-[12px] leading-[1.65] text-fg/85 first:mt-0">
                {renderInline(block.content!)}
              </p>
            );
          case 'ul':
            return (
              <ul key={key} className="mt-2 space-y-1 pl-4 text-[12px] leading-[1.6] text-fg/85 first:mt-0">
                {block.items!.map((it, j) => (
                  <li key={j} className="list-disc">
                    {renderInline(it)}
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={key} className="mt-2 space-y-1 pl-4 text-[12px] leading-[1.6] text-fg/85 first:mt-0">
                {block.items!.map((it, j) => (
                  <li key={j} className="list-decimal">
                    {renderInline(it)}
                  </li>
                ))}
              </ol>
            );
          case 'hr':
            return <hr key={key} className="my-3 border-border" />;
        }
      })}
    </div>
  );
}
