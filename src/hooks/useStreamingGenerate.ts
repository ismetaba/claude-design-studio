import { useCallback, useRef } from 'react';
import { postGenerate, type PostGenerateArgs } from '../lib/api';
import { useDesignStore } from '../store/designStore';
import { useSettingsStore } from '../store/settingsStore';
import { extractHtml } from '../lib/extractHtml';
import type { SSEEvent } from '../types/domain';

export interface UseStreamingGenerateOptions {
  /** Inject postGenerate for tests. */
  poster?: typeof postGenerate;
}

export interface StreamingGenerateApi {
  start: () => Promise<void>;
  cancel: () => void;
}

export function useStreamingGenerate(opts: UseStreamingGenerateOptions = {}): StreamingGenerateApi {
  const poster = opts.poster ?? postGenerate;
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async () => {
    const ds = useDesignStore.getState();
    const settings = useSettingsStore.getState();
    const sessionId = ds.activeSessionId;
    if (!sessionId) return;
    const session = ds.sessions[sessionId];
    if (!session) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    ds.setStreamError(null);
    ds.setStreaming(true);

    // Build messages from prior turns; last turn is the just-appended user turn.
    const messages = session.turns.map((t) => ({ role: t.role, content: t.content }));

    let collected = '';
    let receivedSessionId: string | undefined;

    const onEvent: PostGenerateArgs['onEvent'] = (event: SSEEvent) => {
      const designState = useDesignStore.getState();
      switch (event.type) {
        case 'delta':
          collected += event.text;
          designState.appendAssistantDelta(event.text);
          designState.setCurrentHtml(extractHtml(collected));
          break;
        case 'session':
          receivedSessionId = event.sdkSessionId;
          break;
        case 'done':
          designState.finalizeAssistantTurn({ sdkSessionId: receivedSessionId });
          break;
        case 'error':
          designState.setStreamError(event.message);
          break;
      }
    };

    try {
      await poster({
        backend: settings.backend,
        messages,
        resumeSdkSessionId: session.sdkSessionId,
        projectTitle: session.title,
        projectNotes: session.notes,
        // Send the current HTML so the model can refine without losing state,
        // even if the SDK conversation context has been trimmed or expired.
        currentHtml: session.currentHtml,
        signal: ctrl.signal,
        onEvent,
      });
    } catch (err) {
      if (!ctrl.signal.aborted) {
        const msg = err instanceof Error ? err.message : 'Generation failed';
        useDesignStore.getState().setStreamError(msg);
      }
    } finally {
      useDesignStore.getState().setStreaming(false);
    }
  }, [poster]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { start, cancel };
}
