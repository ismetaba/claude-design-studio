import { cn } from '../../lib/cn';
import { Icon, type IconName } from '../ui/Icon';

export type Device = 'mobile' | 'tablet' | 'desktop';

export interface DeviceToggleProps {
  device: Device;
  onChange: (d: Device) => void;
}

const DEVICES: Array<{ id: Device; label: string; icon: IconName }> = [
  { id: 'mobile', label: 'Mobile', icon: 'mobile' },
  { id: 'tablet', label: 'Tablet', icon: 'tablet' },
  { id: 'desktop', label: 'Desktop', icon: 'desktop' },
];

export const DEVICE_WIDTH_PX: Record<Device, number | null> = {
  mobile: 375,
  tablet: 768,
  desktop: null,
};

export function DeviceToggle({ device, onChange }: DeviceToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Preview device size"
      className="inline-flex items-center gap-0.5 rounded-md bg-bg p-0.5"
    >
      {DEVICES.map((d) => {
        const selected = d.id === device;
        return (
          <button
            key={d.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Preview at ${d.label} size`}
            onClick={() => onChange(d.id)}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-[5px] transition-colors',
              selected
                ? 'bg-panel text-fg-strong shadow-soft'
                : 'text-muted hover:text-fg',
            )}
          >
            <Icon name={d.icon} size={14} />
          </button>
        );
      })}
    </div>
  );
}
