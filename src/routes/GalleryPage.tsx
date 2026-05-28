import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDesignStore } from '../store/designStore';
import { useSettingsStore } from '../store/settingsStore';
import { useThemeEffect } from '../hooks/useThemeEffect';
import { CreateProjectForm } from '../components/gallery/CreateProjectForm';
import { ProjectCard } from '../components/gallery/ProjectCard';
import { Icon } from '../components/ui/Icon';
import { cn } from '../lib/cn';
import type { Session } from '../types/domain';

type Tab = 'recent' | 'yours' | 'examples' | 'systems';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'recent', label: 'Recent' },
  { id: 'yours', label: 'Your designs' },
  { id: 'examples', label: 'Examples' },
  { id: 'systems', label: 'Design systems' },
];

export default function GalleryPage() {
  useThemeEffect();
  const sessions = useDesignStore((s) => s.sessions);
  const sessionOrder = useDesignStore((s) => s.sessionOrder);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const [tab, setTab] = useState<Tab>('recent');
  const [search, setSearch] = useState('');

  const projects = useMemo<Session[]>(
    () =>
      sessionOrder
        .map((id) => sessions[id])
        .filter((s): s is Session => Boolean(s))
        .filter((s) =>
          search.trim().length === 0
            ? true
            : (s.title || '').toLowerCase().includes(search.toLowerCase()),
        ),
    [sessions, sessionOrder, search],
  );

  const visibleProjects =
    tab === 'recent' ? projects.slice(0, 12) : tab === 'yours' ? projects : [];

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="relative flex h-[88px] shrink-0 items-start justify-between px-6 pt-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-accent-soft/60 via-accent-soft/15 to-transparent"
        />
        <Link to="/" className="relative flex items-center gap-2 hover:opacity-90">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-bg-elev shadow-soft">
            <Icon name="palette" size={22} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="flex items-center gap-1.5">
              <span className="font-serif text-[22px] font-medium tracking-tight text-fg-strong">
                Claude Design
              </span>
              <span className="rounded-md bg-border/60 px-1.5 py-0.5 text-[10px] font-medium text-fg/65">
                Research Preview
              </span>
            </span>
            <span className="text-[11px] text-muted">by Anthropic Labs</span>
          </span>
        </Link>
        <div className="relative flex items-center gap-1">
          <button
            type="button"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg"
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
          </button>
          <Link
            to="/settings"
            aria-label="Open settings"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg"
          >
            <Icon name="settings" size={15} />
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[320px] shrink-0 flex-col px-5 pt-2 pb-3">
          <CreateProjectForm />
          <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-hover px-2 py-1 text-[11px] font-medium text-fg/80">
              <Icon name="docs" size={12} />
              <span>Docs</span>
            </span>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 rounded-md bg-hover px-2 py-1 text-[11px] font-medium text-fg/80 transition-colors hover:bg-accent-soft/40"
            >
              <Icon name="settings" size={12} />
              <span>Settings</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-hover px-2 py-1 text-[11px] font-medium text-fg/80">
              <Icon name="user" size={12} />
              <span>You</span>
            </span>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col pr-6 pl-1">
          <div className="flex items-center justify-between gap-4 pb-4">
            <nav className="flex items-center gap-5" aria-label="Gallery tabs">
              {TABS.map((t) => {
                const active = t.id === tab;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      'relative pb-2 text-[13px] font-medium transition-colors',
                      active ? 'text-fg-strong' : 'text-muted hover:text-fg',
                    )}
                  >
                    {t.label}
                    {active && (
                      <span className="absolute inset-x-0 -bottom-px h-[2px] rounded bg-accent" />
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="relative w-[260px]">
              <Icon
                name="search"
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="block w-full rounded-full border border-border bg-panel/70 py-1.5 pl-8 pr-3 text-[12px] text-fg-strong placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pb-8 pr-1">
            {tab === 'examples' || tab === 'systems' ? (
              <EmptyTab label={tab} />
            ) : visibleProjects.length === 0 ? (
              <BlankState />
            ) : (
              <Grid>
                {tab === 'recent' && <TutorialCard />}
                {visibleProjects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </Grid>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
      {children}
    </div>
  );
}

function TutorialCard() {
  return (
    <Link
      to="/"
      onClick={(e) => e.preventDefault()}
      className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-blue-50/70 ring-1 ring-blue-100 transition-colors hover:bg-blue-50"
    >
      <div className="relative flex aspect-[5/4] w-full items-center justify-center overflow-hidden rounded-2xl bg-blue-50">
        <div className="text-blue-300">
          <Icon name="sparkle" size={40} />
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-muted hover:bg-white hover:text-fg"
        >
          <Icon name="close" size={12} />
        </button>
      </div>
      <div className="px-1 pb-2">
        <h3 className="line-clamp-2 text-[14px] font-medium text-fg-strong">
          Learn about Claude Design
        </h3>
        <div className="mt-1 text-[12px] text-accent">Quick tutorial</div>
      </div>
    </Link>
  );
}

function EmptyTab({ label }: { label: Tab }) {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-center">
      <Icon name="folder" size={40} className="text-muted/50" />
      <p className="text-[14px] text-fg/80">No {label === 'examples' ? 'examples' : 'design systems'} yet</p>
      <p className="text-[12px] text-muted">Coming soon.</p>
    </div>
  );
}

function BlankState() {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-center">
      <Icon name="sparkle" size={36} className="text-accent" />
      <p className="text-[14px] text-fg/80">No designs yet</p>
      <p className="text-[12px] text-muted">Use the form on the left to create your first project.</p>
    </div>
  );
}
