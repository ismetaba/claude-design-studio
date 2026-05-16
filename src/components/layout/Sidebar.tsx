import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSettingsStore } from '../../store/settingsStore';
import { ConversationView } from '../sidebar/ConversationView';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/cn';
import type { BackendKind } from '../../types/domain';

const SIDEBAR_KEY = 'cds:sidebar';

const BACKEND_LABEL: Record<BackendKind, string> = {
  'claude-agent-sdk': 'Claude Agent SDK',
  'custom-api': 'Custom API',
  'local-llm': 'Local LLM',
};

export interface BackendStatus {
  ok: boolean | null;
}

export interface SidebarProps {
  promptDock?: ReactNode;
  status?: BackendStatus;
}

export function Sidebar({ promptDock, status }: SidebarProps) {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>(SIDEBAR_KEY, false);
  const backend = useSettingsStore((s) => s.backend);

  const statusDot =
    status?.ok === true ? 'bg-emerald-500' : status?.ok === false ? 'bg-red-500' : 'bg-muted/60';

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col bg-bg transition-[width] duration-180',
        collapsed ? 'w-14' : 'w-[320px]',
      )}
      aria-label="Project sidebar"
    >
      <div className="flex items-center justify-between px-3 pt-3">
        <Link
          to="/"
          aria-label="All designs"
          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-hover hover:text-fg"
        >
          <Icon name="chevron-left" size={12} />
          {!collapsed && <span>All designs</span>}
        </Link>
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={collapsed}
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg"
        >
          <Icon name="sidebar" size={15} />
        </button>
      </div>

      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ConversationView />
        </div>
      )}
      {collapsed && <div className="min-h-0 flex-1" />}

      {!collapsed && promptDock && (
        <div className="border-t border-border/70 bg-bg px-3 pt-3 pb-2">{promptDock}</div>
      )}

      <div className={cn('flex flex-wrap gap-1.5 px-3 py-3', collapsed && 'flex-col items-center')}>
        <Link
          to="/settings"
          aria-label={`Backend: ${BACKEND_LABEL[backend.kind]}. Open settings.`}
          title={`Backend: ${BACKEND_LABEL[backend.kind]}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-hover px-2 py-1 text-[11px] font-medium text-fg/80 transition-colors hover:bg-accent-soft/40"
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', statusDot)} aria-hidden="true" />
          {!collapsed && <span className="truncate max-w-[120px]">{BACKEND_LABEL[backend.kind]}</span>}
        </Link>
        <Link
          to="/settings"
          aria-label="Settings"
          className="inline-flex items-center gap-1.5 rounded-md bg-hover px-2 py-1 text-[11px] font-medium text-fg/80 transition-colors hover:bg-accent-soft/40"
        >
          <Icon name="settings" size={12} />
          {!collapsed && <span>Settings</span>}
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-hover px-2 py-1 text-[11px] font-medium text-fg/80">
          <Icon name="docs" size={12} />
          {!collapsed && <span>Docs</span>}
        </span>
      </div>
    </aside>
  );
}
