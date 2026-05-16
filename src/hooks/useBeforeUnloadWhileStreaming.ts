import { useEffect } from 'react';
import { useDesignStore } from '../store/designStore';

/**
 * Show the browser's native "leave page?" prompt while a generation is in flight,
 * so an accidental Cmd+R doesn't silently kill the stream.
 */
export function useBeforeUnloadWhileStreaming(): void {
  const isStreaming = useDesignStore((s) => s.isStreaming);
  useEffect(() => {
    if (!isStreaming) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Most browsers ignore the message string in modern versions, but setting
      // returnValue keeps the confirmation dialog from being suppressed.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isStreaming]);
}
