import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import { TabBar } from '../components/layout/TabBar';
import { ToastHost } from '../components/ui/ToastHost';
import { useThemeEffect } from '../hooks/useThemeEffect';
import { PreviewPane } from '../components/preview/PreviewPane';
import { PromptDock } from '../components/prompt/PromptDock';
import { useDesignStore } from '../store/designStore';
import { useStreamingGenerate } from '../hooks/useStreamingGenerate';
import { useBackendStatus } from '../hooks/useBackendStatus';
import { useBeforeUnloadWhileStreaming } from '../hooks/useBeforeUnloadWhileStreaming';
import { useSettingsStore } from '../store/settingsStore';

export default function StudioPage() {
  useThemeEffect();
  useBeforeUnloadWhileStreaming();
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const openTab = useDesignStore((s) => s.openTab);
  const sessions = useDesignStore((s) => s.sessions);
  const activeSessionId = useDesignStore((s) => s.activeSessionId);
  const setStreaming = useDesignStore((s) => s.setStreaming);
  const finalizeAssistantTurn = useDesignStore((s) => s.finalizeAssistantTurn);
  const backend = useSettingsStore((s) => s.backend);
  const { start, cancel } = useStreamingGenerate();
  const statusResult = useBackendStatus();

  // Sync the URL ↔ active session. If the URL has a valid id, activate that tab.
  // If invalid, redirect to gallery.
  useEffect(() => {
    if (!routeId) return;
    if (sessions[routeId]) {
      if (routeId !== activeSessionId) openTab(routeId);
    } else {
      navigate('/', { replace: true });
    }
  }, [routeId, sessions, activeSessionId, openTab, navigate]);

  // When the user switches tabs in the TabBar, reflect it in the URL.
  useEffect(() => {
    if (activeSessionId && activeSessionId !== routeId) {
      navigate(`/p/${activeSessionId}`, { replace: true });
    }
  }, [activeSessionId, routeId, navigate]);

  const onStop = () => {
    cancel();
    finalizeAssistantTurn();
    setStreaming(false);
  };

  const sdkStatus =
    backend.kind === 'claude-agent-sdk'
      ? statusResult === null
        ? { ok: null }
        : statusResult === false
          ? { ok: false }
          : { ok: statusResult.sdk.ok }
      : { ok: null };

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          status={sdkStatus}
          promptDock={<PromptDock onSubmit={() => void start()} onStop={onStop} />}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <TabBar />
          <div className="min-w-0 flex-1">
            <PreviewPane />
          </div>
        </div>
      </div>
      <ToastHost />
    </div>
  );
}
