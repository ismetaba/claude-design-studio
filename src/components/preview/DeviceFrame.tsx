import { type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import type { DeviceKind } from '../../lib/parseAssistantResponse';

export interface DeviceFrameProps {
  device?: DeviceKind;
  children: ReactNode;
  /** Caption shown below the frame (e.g. variation name). */
  caption?: ReactNode;
  /** Tints the frame chrome and the caption pill. */
  accent?: string;
  className?: string;
}

interface FrameSpec {
  /** Aspect ratio for the *screen* (inner) — Tailwind utility string. */
  innerAspect: string;
  /** Reference viewport width in CSS pixels (drives the iframe scaling). */
  innerWidth: number;
  /** Reference viewport height in CSS pixels. */
  innerHeight: number;
  /** Tailwind class for the outer container width. */
  outerWidth: string;
  bezel: number;
  borderRadius: number;
  showStatusBar: boolean;
}

const SPECS: Record<DeviceKind, FrameSpec> = {
  mobile: {
    innerAspect: 'aspect-[375/812]',
    innerWidth: 375,
    innerHeight: 812,
    outerWidth: 'w-full max-w-[300px]',
    bezel: 8,
    borderRadius: 40,
    showStatusBar: true,
  },
  landscape: {
    innerAspect: 'aspect-[812/375]',
    innerWidth: 812,
    innerHeight: 375,
    outerWidth: 'w-full max-w-[640px]',
    bezel: 8,
    borderRadius: 30,
    showStatusBar: true,
  },
  tablet: {
    innerAspect: 'aspect-[820/1180]',
    innerWidth: 820,
    innerHeight: 1180,
    outerWidth: 'w-full max-w-[560px]',
    bezel: 10,
    borderRadius: 24,
    showStatusBar: false,
  },
  desktop: {
    innerAspect: 'aspect-[16/10]',
    innerWidth: 1280,
    innerHeight: 800,
    outerWidth: 'w-full',
    bezel: 0,
    borderRadius: 14,
    showStatusBar: false,
  },
};

export function DeviceFrame({
  device = 'desktop',
  children,
  caption,
  accent,
  className,
}: DeviceFrameProps) {
  const spec = SPECS[device];

  if (device === 'desktop') {
    return (
      <div className={cn('flex w-full flex-col gap-2', className)}>
        <div
          className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-white shadow-soft"
          style={{ borderRadius: spec.borderRadius }}
        >
          {children}
        </div>
        {caption && (
          <div className="text-center text-[11px] text-muted">{caption}</div>
        )}
      </div>
    );
  }

  // Phone / landscape / tablet:
  //   Outer  = dark bezel (just background + padding, no enforced aspect)
  //   Inner  = the actual screen, locked to the device aspect ratio so the
  //            iframe inside fills it perfectly without empty bottom space.
  return (
    <div className={cn('flex flex-col items-center gap-2', spec.outerWidth, className)}>
      <div
        className="relative w-full bg-fg-strong shadow-lift"
        style={{
          padding: spec.bezel,
          borderRadius: spec.borderRadius,
        }}
      >
        <div
          className={cn('relative w-full overflow-hidden bg-bg-elev', spec.innerAspect)}
          style={{ borderRadius: spec.borderRadius - spec.bezel + 2 }}
        >
          {spec.showStatusBar && device === 'mobile' && (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-7 items-end justify-between px-6 pb-1 text-[10px] font-semibold text-white/95"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)' }}
            >
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <span aria-hidden="true">●●●</span>
                <span aria-hidden="true">●</span>
                <span aria-hidden="true">▮▮</span>
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
      {caption && (
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-soft"
            style={{ backgroundColor: accent ?? 'rgba(31,26,20,0.72)' }}
          >
            {caption}
          </span>
        </div>
      )}
    </div>
  );
}

export const DEVICE_INNER_DIMENSIONS = Object.fromEntries(
  Object.entries(SPECS).map(([k, v]) => [k, { width: v.innerWidth, height: v.innerHeight }]),
) as Record<DeviceKind, { width: number; height: number }>;
