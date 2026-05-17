import { useMemo } from 'react';
import { DeviceFrame } from './DeviceFrame';
import { PanZoomCanvas } from './PanZoomCanvas';
import { detectDevice } from '../../lib/detectDevice';
import type { DeviceKind, VariationItem } from '../../lib/parseAssistantResponse';

export interface VariationsCanvasProps {
  items: VariationItem[];
}

interface SectionGroup {
  title: string | null;
  items: VariationItem[];
}

function groupBySection(items: VariationItem[]): SectionGroup[] {
  const groups: SectionGroup[] = [];
  let current: SectionGroup | null = null;
  for (const item of items) {
    const title = item.section ?? null;
    if (!current || current.title !== title) {
      current = { title, items: [item] };
      groups.push(current);
    } else {
      current.items.push(item);
    }
  }
  return groups;
}

/**
 * Fixed natural widths for each variation card. The PanZoomCanvas around us
 * scales the whole content area — so a single, predictable size per device
 * makes the layout calm and the zoom math predictable.
 */
const CARD_WIDTH: Record<DeviceKind, number> = {
  mobile: 320,
  landscape: 600,
  tablet: 440,
  desktop: 720,
};

function gridClass(device: DeviceKind): string {
  if (device === 'mobile') return 'flex flex-wrap items-start gap-8';
  if (device === 'landscape') return 'flex flex-wrap items-start gap-8';
  if (device === 'tablet') return 'flex flex-wrap items-start gap-8';
  return 'flex flex-wrap items-start gap-8';
}

export function VariationsCanvas({ items }: VariationsCanvasProps) {
  const groups = useMemo(() => groupBySection(items), [items]);
  // Fit-key changes whenever the variation set changes — triggers re-fit in PanZoomCanvas.
  const fitKey = useMemo(() => items.map((i) => i.id).join('|'), [items]);

  return (
    <PanZoomCanvas fitKey={fitKey} className="h-full w-full">
      <div className="flex w-[min(1400px,calc(100vw-200px))] flex-col gap-12 p-10">
        {groups.map((group, gi) => {
          const sectionDevice: DeviceKind =
            group.items[0]?.device ?? detectDevice(group.items[0]?.html ?? '');
          return (
            <section key={gi} className="flex flex-col gap-6">
              {group.title && (
                <h3 className="px-1 font-serif text-[22px] font-medium tracking-tight text-fg-strong">
                  {group.title}
                </h3>
              )}
              <div className={gridClass(sectionDevice)}>
                {group.items.map((item) => {
                  const device = item.device ?? detectDevice(item.html);
                  return (
                    <div
                      key={item.id}
                      style={{ width: CARD_WIDTH[device] }}
                      className="flex shrink-0 flex-col gap-2"
                    >
                      <div className="flex items-center gap-1.5 px-0.5 text-[11px] text-muted">
                        <DragHandle />
                        <span className="truncate font-medium text-fg/85">{item.name}</span>
                        {item.tagline && (
                          <>
                            <span className="text-muted/60">—</span>
                            <span className="truncate text-muted">{item.tagline}</span>
                          </>
                        )}
                      </div>
                      <DeviceFrame device={device}>
                        <ScaledFrame html={item.html} device={device} />
                      </DeviceFrame>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </PanZoomCanvas>
  );
}

function DragHandle() {
  return (
    <span
      aria-hidden="true"
      className="grid h-3 w-2 shrink-0 grid-cols-2 gap-[2px] text-muted/55"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="h-[2px] w-[2px] rounded-full bg-current" />
      ))}
    </span>
  );
}

/**
 * Renders the variation HTML in an iframe sized to the device viewport, then
 * scales it to fit the DeviceFrame's inner box. Interactive — buttons, links,
 * and inputs inside each variation work; pan/zoom kicks in on empty canvas.
 */
function ScaledFrame({ html, device }: { html: string; device: DeviceKind }) {
  const width = device === 'mobile' ? 375 : device === 'landscape' ? 812 : device === 'tablet' ? 820 : 1280;
  const height = device === 'mobile' ? 812 : device === 'landscape' ? 375 : device === 'tablet' ? 1180 : 800;
  return (
    <div className="relative h-full w-full overflow-hidden">
      <iframe
        title="variation preview"
        sandbox="allow-scripts"
        srcDoc={html}
        className="absolute inset-0 origin-top-left bg-white"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transform: 'scale(var(--device-scale, 1))',
          transformOrigin: 'top left',
        }}
        ref={(el) => {
          if (!el) return;
          const parent = el.parentElement;
          if (!parent) return;
          // offsetWidth/Height = pre-transform layout size. getBoundingClientRect
          // would compose the surrounding PanZoomCanvas scale and double-shrink
          // the iframe.
          const apply = () => {
            const pw = parent.offsetWidth;
            const ph = parent.offsetHeight;
            if (pw === 0 || ph === 0) return;
            const scale = Math.min(pw / width, ph / height);
            el.style.setProperty('--device-scale', String(scale));
          };
          apply();
          const obs = new ResizeObserver(apply);
          obs.observe(parent);
        }}
      />
    </div>
  );
}
