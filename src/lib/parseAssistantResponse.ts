/**
 * Parses one assistant turn into one of three response modes:
 *
 *  - { kind: 'questions', intro, groups, prose }
 *      Triggered by a ```questions``` JSON fence. Renders as a chip-group form
 *      in the sidebar; on submit the answers are sent back as a single user
 *      message.
 *
 *  - { kind: 'variations', intro, items, prose }
 *      Triggered by 2+ ```variation``` fences (each prefixed with a JSON
 *      header). Renders as a grid of mini live-previews in the preview pane.
 *
 *  - { kind: 'single', html, prose }
 *      The default: a single ```html``` document, possibly preceded by
 *      markdown rationale.
 *
 * The parser is intentionally tolerant of partial/streaming input — if the
 * questions JSON or a variation header hasn't finished arriving yet we just
 * fall back to 'single' (the empty / partial HTML), so the UI never crashes
 * mid-stream.
 */

export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionGroup {
  id: string;
  label: string;
  hint?: string;
  options: QuestionOption[];
  allowFreeText?: boolean;
}

export type DeviceKind = 'mobile' | 'landscape' | 'tablet' | 'desktop';

export interface VariationItem {
  id: string;
  name: string;
  tagline?: string;
  accent?: string;
  device?: DeviceKind;
  /** Optional canvas section title — multiple variations with the same section render under one heading. */
  section?: string;
  html: string;
}

export type AssistantResponse =
  | {
      kind: 'questions';
      title: string;
      intro: string;
      prose: string;
      groups: QuestionGroup[];
    }
  | { kind: 'variations'; intro: string; prose: string; items: VariationItem[] }
  | { kind: 'single'; prose: string; html: string };

const QUESTIONS_RE = /```questions\s*\n([\s\S]*?)```/i;
// Match ```variation [json-header]\n[html]\n```.
// The header JSON is constrained to NOT cross a backtick, so a malformed header
// in one block can't slurp the next block's `}` and produce a frankenmatch.
const VARIATION_RE = /```variation\s*(\{[^`]*?\})\s*\n([\s\S]*?)```/gi;
const HTML_RE = /```html\s*\n([\s\S]*?)```/i;

function stripAllFences(raw: string): string {
  // Used to build the markdown "prose" that lives outside any code fence.
  return raw
    .replace(/```questions[\s\S]*?```/gi, '')
    .replace(/```variation[\s\S]*?```/gi, '')
    .replace(/```html[\s\S]*?```/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseAssistantResponse(raw: string): AssistantResponse {
  if (!raw) return { kind: 'single', prose: '', html: '' };

  // ── QUESTIONS ──────────────────────────────────────────────────────────────
  const qMatch = QUESTIONS_RE.exec(raw);
  if (qMatch) {
    try {
      const parsed = JSON.parse(qMatch[1].trim()) as {
        title?: string;
        intro?: string;
        groups?: QuestionGroup[];
      };
      if (Array.isArray(parsed.groups) && parsed.groups.length > 0) {
        return {
          kind: 'questions',
          title: parsed.title?.trim() || 'Quick questions',
          intro: parsed.intro?.trim() ?? '',
          prose: stripAllFences(raw),
          groups: parsed.groups
            .filter((g): g is QuestionGroup =>
              !!g && typeof g.id === 'string' && typeof g.label === 'string' && Array.isArray(g.options),
            )
            .map((g) => ({
              id: g.id,
              label: g.label,
              hint: g.hint,
              options: g.options.filter(
                (o): o is QuestionOption =>
                  !!o && typeof o.value === 'string' && typeof o.label === 'string',
              ),
              allowFreeText: g.allowFreeText === true,
            }))
            .filter((g) => g.options.length > 0),
        };
      }
    } catch {
      // JSON not closed yet (still streaming) — fall through to other modes.
    }
  }

  // ── VARIATIONS ─────────────────────────────────────────────────────────────
  const variations: VariationItem[] = [];
  VARIATION_RE.lastIndex = 0;
  let vMatch: RegExpExecArray | null;
  while ((vMatch = VARIATION_RE.exec(raw)) !== null) {
    try {
      const header = JSON.parse(vMatch[1].trim()) as {
        id?: string;
        name?: string;
        tagline?: string;
        accent?: string;
        device?: string;
        section?: string;
      };
      if (!header.id || !header.name) continue;
      const html = vMatch[2].trim();
      if (!html) continue;
      const device =
        header.device === 'mobile' ||
        header.device === 'landscape' ||
        header.device === 'tablet' ||
        header.device === 'desktop'
          ? header.device
          : undefined;
      variations.push({
        id: header.id,
        name: header.name,
        tagline: header.tagline,
        accent: header.accent,
        device,
        section: header.section?.trim() || undefined,
        html,
      });
    } catch {
      // Malformed header — skip this block (probably still streaming).
    }
  }
  if (variations.length >= 2) {
    return {
      kind: 'variations',
      intro: '',
      prose: stripAllFences(raw),
      items: variations,
    };
  }

  // ── SINGLE ─────────────────────────────────────────────────────────────────
  const hMatch = HTML_RE.exec(raw);
  const html = hMatch ? hMatch[1].trim() : extractHtmlLoose(raw);
  return {
    kind: 'single',
    prose: stripAllFences(raw),
    html,
  };
}

/**
 * Tolerant fallback for streaming: if we have an opening ```html fence but no
 * closer yet, return whatever is after the opener so the iframe can show a
 * progressive preview.
 */
function extractHtmlLoose(raw: string): string {
  const i = raw.indexOf('```html');
  if (i === -1) return '';
  let start = i + '```html'.length;
  // skip optional language line break
  if (raw[start] === '\n') start += 1;
  return raw.slice(start).trim();
}
