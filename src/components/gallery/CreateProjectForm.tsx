import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesignStore } from '../../store/designStore';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/cn';

type ProjectType = 'prototype' | 'slide-deck' | 'from-template' | 'other';
type Fidelity = 'wireframe' | 'high-fidelity';

const TYPE_TABS: Array<{ id: ProjectType; label: string }> = [
  { id: 'prototype', label: 'Prototype' },
  { id: 'slide-deck', label: 'Slide deck' },
  { id: 'from-template', label: 'From template' },
  { id: 'other', label: 'Other' },
];

export function CreateProjectForm() {
  const navigate = useNavigate();
  const createSession = useDesignStore((s) => s.createSession);
  const renameSession = useDesignStore((s) => s.renameSession);

  const [tab, setTab] = useState<ProjectType>('prototype');
  const [name, setName] = useState('');
  const [fidelity, setFidelity] = useState<Fidelity>('high-fidelity');

  const onCreate = () => {
    const id = createSession();
    const title = name.trim() || 'Untitled design';
    if (title !== 'Untitled design') renameSession(id, title);
    // Persist the fidelity choice on the URL so the studio prompt input can pre-fill a hint.
    const params = new URLSearchParams();
    if (fidelity === 'wireframe') params.set('fidelity', 'wireframe');
    const qs = params.toString();
    navigate(`/p/${id}${qs ? `?${qs}` : ''}`);
  };

  const tabsActive = tab === 'prototype';

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 whitespace-nowrap border-b border-border">
        {TYPE_TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'relative pb-2 text-[12px] font-medium transition-colors',
                active ? 'text-fg-strong' : 'text-muted hover:text-fg',
              )}
            >
              {t.label}
              {active && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded bg-accent" />}
            </button>
          );
        })}
      </div>

      {!tabsActive ? (
        <div className="px-1 py-6 text-[12px] text-muted">
          {tab === 'slide-deck' && 'Slide deck mode coming soon.'}
          {tab === 'from-template' && 'Template gallery coming soon.'}
          {tab === 'other' && 'Other formats coming soon.'}
        </div>
      ) : (
        <>
          <div className="mt-4 px-1 text-[14px] font-semibold text-fg-strong">New prototype</div>

          <div className="mt-3 px-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="block w-full rounded-md border border-border bg-panel px-3 py-2 text-[13px] text-fg-strong placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div className="mt-4 px-1">
            <div className="text-[11px] font-medium text-fg/70">Design system</div>
            <button
              type="button"
              className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-md border border-border bg-panel px-2.5 py-2 text-left text-[12px] text-fg-strong transition-colors hover:border-accent/40"
            >
              <span className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-accent-soft text-accent">
                  <Icon name="palette" size={12} />
                </span>
                <span className="flex flex-col leading-tight">
                  <span>Tailwind defaults</span>
                  <span className="text-[10px] text-muted">Default</span>
                </span>
              </span>
              <Icon name="chevron-right" size={12} className="text-muted" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 px-1">
            <FidelityCard
              active={fidelity === 'wireframe'}
              onClick={() => setFidelity('wireframe')}
              label="Wireframe"
            >
              <WireframePreview />
            </FidelityCard>
            <FidelityCard
              active={fidelity === 'high-fidelity'}
              onClick={() => setFidelity('high-fidelity')}
              label="High fidelity"
            >
              <HighFidelityPreview />
            </FidelityCard>
          </div>

          <button
            type="button"
            onClick={onCreate}
            className="mx-1 mt-5 inline-flex items-center justify-center gap-1.5 rounded-md bg-accent-soft py-2 text-[13px] font-medium text-fg-strong transition-colors hover:bg-accent-soft-hover active:scale-[0.99]"
          >
            <Icon name="plus" size={13} className="text-accent" />
            Create
          </button>

          <p className="mt-4 text-center text-[11px] text-muted">
            Only you can see your project by default.
          </p>
        </>
      )}
    </div>
  );
}

function FidelityCard({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex flex-col gap-1.5 rounded-lg border bg-panel p-2 transition-colors',
        active ? 'border-accent ring-2 ring-accent/20' : 'border-border hover:border-accent/40',
      )}
    >
      <div className="flex h-16 w-full items-center justify-center overflow-hidden rounded bg-bg-elev p-2">
        {children}
      </div>
      <span className="text-[11px] font-medium text-fg-strong">{label}</span>
    </button>
  );
}

function WireframePreview() {
  return (
    <svg viewBox="0 0 80 50" className="h-full w-full text-muted/70">
      <rect x="4" y="4" width="20" height="3" rx="1" fill="currentColor" />
      <rect x="28" y="4" width="20" height="3" rx="1" fill="currentColor" />
      <rect x="52" y="4" width="20" height="3" rx="1" fill="currentColor" />
      <rect x="4" y="12" width="32" height="22" rx="2" stroke="currentColor" strokeWidth="0.6" fill="none" />
      <circle cx="10" cy="20" r="2.5" fill="currentColor" />
      <rect x="4" y="40" width="68" height="2" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="4" y="44" width="46" height="2" rx="1" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

function HighFidelityPreview() {
  return (
    <svg viewBox="0 0 80 50" className="h-full w-full">
      <rect x="4" y="4" width="18" height="3" rx="1" fill="#d97757" />
      <rect x="26" y="4" width="14" height="3" rx="1" fill="#c19a6b" />
      <rect x="4" y="12" width="32" height="22" rx="3" fill="#fce8db" />
      <rect x="40" y="12" width="32" height="22" rx="3" fill="#e8d4c8" />
      <rect x="4" y="40" width="50" height="3" rx="1.5" fill="#d97757" />
    </svg>
  );
}
