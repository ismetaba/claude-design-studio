import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Called when the user clicks Reload; defaults to `window.location.reload()`. */
  onReload?: () => void;
  /** Custom logger for tests; defaults to `console.error`. */
  logError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

const defaultLogger = (error: Error, info: ErrorInfo) => {
  // eslint-disable-next-line no-console
  console.error('[ErrorBoundary] caught render error', error, info.componentStack);
};

const defaultReload = () => {
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const log = this.props.logError ?? defaultLogger;
    log(error, info);
  }

  private handleReload = () => {
    const fn = this.props.onReload ?? defaultReload;
    fn();
  };

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="flex h-full flex-col items-center justify-center gap-4 bg-bg p-8 text-fg"
        >
          <h1 className="font-serif text-2xl">Something broke.</h1>
          <p className="max-w-md text-center text-sm text-muted">
            The studio hit an unexpected error. Your work is saved — reload to start fresh.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-coral px-4 text-sm font-medium text-white hover:bg-coral-light"
          >
            Reload
          </button>
          {process.env.NODE_ENV !== 'production' ? (
            <pre className="max-w-2xl overflow-auto rounded-md border border-border bg-panel p-3 text-xs text-red-500">
              {this.state.error.message}
            </pre>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}
