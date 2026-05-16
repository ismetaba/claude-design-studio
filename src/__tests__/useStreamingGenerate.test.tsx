import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStreamingGenerate } from '../hooks/useStreamingGenerate';
import { useDesignStore } from '../store/designStore';
import { useSettingsStore } from '../store/settingsStore';
import type { PostGenerateArgs } from '../lib/api';

function resetStores() {
  useDesignStore.setState({
    sessions: {},
    sessionOrder: [],
    activeSessionId: null,
    isStreaming: false,
    streamError: null,
  });
  useSettingsStore.setState({ theme: 'light', backend: { kind: 'claude-agent-sdk' } });
}

describe('useStreamingGenerate', () => {
  beforeEach(resetStores);

  it('dispatches deltas, session id, and finalizes', async () => {
    useDesignStore.getState().appendUserTurn('build a coffee hero');
    const poster = vi.fn(async (args: PostGenerateArgs) => {
      args.onEvent({ type: 'session', sdkSessionId: 'sdk-1' });
      args.onEvent({ type: 'delta', text: '```html\n<h1>Coffee' });
      args.onEvent({ type: 'delta', text: '</h1>\n```' });
      args.onEvent({ type: 'done' });
    });
    const { result } = renderHook(() => useStreamingGenerate({ poster }));
    await act(async () => {
      await result.current.start();
    });
    const ds = useDesignStore.getState();
    const sid = ds.activeSessionId!;
    expect(ds.sessions[sid].sdkSessionId).toBe('sdk-1');
    expect(ds.sessions[sid].currentHtml).toContain('<h1>Coffee</h1>');
    expect(ds.isStreaming).toBe(false);
  });

  it('passes the existing sdkSessionId on a follow-up turn', async () => {
    useDesignStore.getState().appendUserTurn('first');
    const poster1 = vi.fn(async (args: PostGenerateArgs) => {
      args.onEvent({ type: 'session', sdkSessionId: 'sdk-1' });
      args.onEvent({ type: 'delta', text: '```html\n<p>1</p>\n```' });
      args.onEvent({ type: 'done' });
    });
    let hook = renderHook(({ poster }: { poster: typeof poster1 }) => useStreamingGenerate({ poster }), {
      initialProps: { poster: poster1 },
    });
    await act(async () => {
      await hook.result.current.start();
    });
    // Now follow-up turn.
    useDesignStore.getState().appendUserTurn('refine');
    let received: PostGenerateArgs | undefined;
    const poster2 = vi.fn(async (args: PostGenerateArgs) => {
      received = args;
      args.onEvent({ type: 'delta', text: '```html\n<p>2</p>\n```' });
      args.onEvent({ type: 'done' });
    });
    hook.rerender({ poster: poster2 });
    await act(async () => {
      await hook.result.current.start();
    });
    expect(received?.resumeSdkSessionId).toBe('sdk-1');
  });

  it('records streamError when an error event arrives', async () => {
    useDesignStore.getState().appendUserTurn('x');
    const poster = vi.fn(async (args: PostGenerateArgs) => {
      args.onEvent({ type: 'error', message: 'boom' });
    });
    const { result } = renderHook(() => useStreamingGenerate({ poster }));
    await act(async () => {
      await result.current.start();
    });
    expect(useDesignStore.getState().streamError).toBe('boom');
  });

  it('cancel() aborts the in-flight fetch signal and preserves partial output', async () => {
    useDesignStore.getState().appendUserTurn('stream me');
    let capturedSignal: AbortSignal | undefined;
    let resolvePoster: (() => void) | undefined;
    const poster = vi.fn(async (args: PostGenerateArgs) => {
      capturedSignal = args.signal;
      args.onEvent({ type: 'session', sdkSessionId: 'sdk-z' });
      args.onEvent({ type: 'delta', text: '```html\n<p>partial' });
      await new Promise<void>((resolve) => {
        resolvePoster = resolve;
        args.signal?.addEventListener('abort', () => resolve(), { once: true });
      });
    });
    const { result } = renderHook(() => useStreamingGenerate({ poster }));
    // Start without awaiting completion.
    let startPromise: Promise<void> = Promise.resolve();
    await act(async () => {
      startPromise = result.current.start();
      // Yield once so the poster runs up to the await.
      await Promise.resolve();
    });
    expect(capturedSignal).toBeDefined();
    expect(capturedSignal!.aborted).toBe(false);
    await act(async () => {
      result.current.cancel();
      // Drain the awaited promise.
      resolvePoster?.();
      await startPromise;
    });
    expect(capturedSignal!.aborted).toBe(true);
    const ds = useDesignStore.getState();
    expect(ds.isStreaming).toBe(false);
    const sid = ds.activeSessionId!;
    const lastAssistant = ds.sessions[sid].turns
      .filter((t) => t.role === 'assistant')
      .at(-1);
    expect(lastAssistant?.content).toContain('partial');
  });
});
