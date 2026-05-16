import { useDesignStore } from '../../store/designStore';
import { Toast } from './Toast';

export function ToastHost() {
  const error = useDesignStore((s) => s.streamError);
  const clear = useDesignStore((s) => s.setStreamError);
  if (!error) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <Toast message={error} tone="error" onDismiss={() => clear(null)} />
    </div>
  );
}
