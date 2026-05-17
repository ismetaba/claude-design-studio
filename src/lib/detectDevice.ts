import type { DeviceKind } from './parseAssistantResponse';

/**
 * Best-effort device detection for an HTML snippet:
 *
 *  1. If the model added <meta name="cds-device" content="…"> we trust it.
 *  2. Otherwise look at Tailwind container hints (max-w-sm, w-[375px], etc.)
 *     and the presence of mobile chrome (status bar shapes, "iPhone"…) to
 *     guess mobile/landscape/tablet/desktop.
 *
 * Returns 'desktop' when we have no signal — the safe default that keeps the
 * preview full-width.
 */
export function detectDevice(html: string): DeviceKind {
  if (!html) return 'desktop';

  // 1. Explicit hint from the system prompt.
  const meta = /<meta\s+name=["']cds-device["']\s+content=["']([^"']+)["']/i.exec(html);
  if (meta) {
    const v = meta[1].toLowerCase().trim();
    if (v === 'mobile' || v === 'landscape' || v === 'tablet' || v === 'desktop') return v;
  }

  // 2. Tailwind container heuristics.
  if (/\bmax-w-sm\b/.test(html) && !/max-w-(md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|full|screen)/i.test(html)) {
    return 'mobile';
  }
  if (/\bw-\[3[57]5px\]/.test(html) || /\bw-\[390px\]/.test(html)) return 'mobile';
  if (/\bw-\[(7[5-9]\d|8\d{2})px\]/.test(html)) return 'tablet';

  // 3. Mobile-app cues: status bar text "9:41", iOS notch shapes, mobile nav.
  if (/9:41/.test(html) && /(min-h-screen|h-screen)/.test(html) && /bottom-nav|tab-bar/i.test(html)) {
    return 'mobile';
  }

  return 'desktop';
}
